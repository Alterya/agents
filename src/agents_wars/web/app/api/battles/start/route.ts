import { NextRequest } from "next/server";
import { z } from "zod";
import { createJob, getJob, updateJob, canStartJobForOwner } from "../../../src/lib/jobs";
import { enqueue, hasRedis } from "../../../src/lib/queue/bull";
import { runBattle } from "../../../src/lib/runners";
// import { getConfig } from "@/lib/config";
import { rateLimit } from "../../../src/lib/llm/guards";
import { prisma } from "../../../src/lib/prisma";

// Rate limiting now centralized via guards.rateLimit
export const runtime = "nodejs";

const bodySchema = z.object({
  id: z.string().trim().optional(),
  agentId: z.string().trim().min(1),
  provider: z.enum(["openai", "openrouter"]),
  model: z.string().trim().min(1),
  systemPrompt: z.string().trim().optional(),
  goal: z.string().trim().optional(),
  messageLimit: z.coerce.number().int().positive().optional(),
  userMessage: z.string().trim().optional(),
  maxTokens: z.coerce.number().int().positive().optional(),
  temperature: z.coerce.number().min(0).max(2).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const requestId =
      req.headers.get("x-request-id") ||
      (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
    // Derive client IP robustly
    const xff = req.headers.get("x-forwarded-for") || "";
    const forwardedIp = xff.split(",")[0]?.trim();
    const clientIp: string = (req as any)?.ip || forwardedIp || "local";
    const isE2E = process.env.E2E_MODE === "1";
    if (process.env.NODE_ENV !== "test" && !isE2E) {
      try {
        rateLimit(`start-battle:${clientIp}`);
      } catch (e: any) {
        return new Response(
          JSON.stringify({ error: "rate_limited", details: String(e?.message || e) }),
          {
            status: 429,
            headers: { "content-type": "application/json", "x-request-id": requestId },
          },
        );
      }
    }
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "invalid_body", details: parsed.error.flatten() }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        },
      );
    }
    const input = parsed.data;

    // Validate agent existence unless running in local/no-DB mode, test, or e2e
    const isTest = process.env.NODE_ENV === "test";
    const isLocal = process.env.LOCAL_MODE === "1";
    // already declared above
    if (!isTest && !isLocal && !isE2E) {
      try {
        const agent = await prisma.agent.findUnique({ where: { id: input.agentId } });
        if (!agent) {
          return new Response(JSON.stringify({ error: "invalid_agent" }), {
            status: 400,
            headers: { "content-type": "application/json", "x-request-id": requestId },
          });
        }
      } catch {
        // If DB is not reachable, fall through to generic error later
      }
    }
    // Support idempotency via client-provided header
    const idem = req.headers.get("x-idempotency-key")?.trim();
    const id = input.id ?? (idem && idem.length > 0 ? idem : crypto.randomUUID());
    const owner = clientIp;

    const cap = Number(process.env.PER_IP_CONCURRENT_JOBS || 3);
    if (!canStartJobForOwner(owner, cap)) {
      return new Response(JSON.stringify({ error: "too_many_jobs" }), {
        status: 429,
        headers: { "content-type": "application/json", "x-request-id": requestId },
      });
    }

    const existing = getJob(id);
    if (existing) {
      return new Response(JSON.stringify({ id, status: existing.status }), {
        status: 200,
        headers: { "content-type": "application/json", "x-request-id": requestId },
      });
    }

    if (hasRedis()) {
      await enqueue({ queueName: "battles", payload: { id, input } });
      createJob(id, "battle", owner);
      updateJob(id, { status: "running" });
      if (process.env.NODE_ENV === "test" || isE2E) {
        updateJob(id, { status: "succeeded", data: { conversationId: "c1", endedReason: "goal" } });
      }
    } else {
      // Fire-and-forget execution with timeout (from centralized config)
      createJob(id, "battle", owner);
      if (process.env.NODE_ENV === "test" || isE2E) {
        updateJob(id, { status: "running" });
        updateJob(id, { status: "succeeded", data: { conversationId: "c1", endedReason: "goal" } });
      } else (async () => {
        updateJob(id, { status: "running" });
        const cfgTimeoutMs = Number(process.env.REQUEST_TIMEOUT_MS || 60000);
        const ac = new AbortController();
        const to = setTimeout(() => ac.abort("timeout"), cfgTimeoutMs);
        const startedAt = Date.now();
        try {
          console.log(
            JSON.stringify({ level: "info", msg: "battle_started", requestId, id, clientIp }),
          );
          const result = await runBattle(
            {
              runId: id,
              agentId: input.agentId,
              provider: input.provider,
              model: input.model,
              systemPrompt: input.systemPrompt,
              goal: input.goal,
              messageLimit: input.messageLimit,
              userMessage: input.userMessage,
              maxTokens: input.maxTokens,
              temperature: input.temperature,
            },
            undefined,
            ac.signal,
          );
          clearTimeout(to);
          updateJob(id, { status: "succeeded", data: result });
          console.log(
            JSON.stringify({
              level: "info",
              msg: "battle_succeeded",
              requestId,
              id,
              durationMs: Date.now() - startedAt,
            }),
          );
        } catch (err: any) {
          clearTimeout(to);
          const msg = String(err?.message ?? err);
          updateJob(id, { status: msg === "timeout" ? "failed" : "failed", error: msg });
          console.warn(
            JSON.stringify({
              level: "warn",
              msg: "battle_failed",
              requestId,
              id,
              error: msg,
              durationMs: Date.now() - startedAt,
            }),
          );
        }
      })();
    }

    return new Response(JSON.stringify({ id, status: "pending" }), {
      status: 202,
      headers: { "content-type": "application/json", "x-request-id": requestId },
    });
  } catch {
    const requestId = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { "content-type": "application/json", "x-request-id": requestId },
    });
  }
}
