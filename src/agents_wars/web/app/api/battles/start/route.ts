import { NextRequest } from "next/server";
import { z } from "zod";
import { createJob, getJob, updateJob, canStartJobForOwner } from "@/lib/jobs";
import { runBattle } from "@/lib/runners";

// Simple in-memory RPM limiter for start endpoint
const limitWindowMs = 60_000;
let windowStart = Date.now();
let count = 0;
function checkRateLimit(maxPerMinute: number): boolean {
  const now = Date.now();
  if (now - windowStart >= limitWindowMs) {
    windowStart = now;
    count = 0;
  }
  if (count >= maxPerMinute) return false;
  count += 1;
  return true;
}

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
    const maxRpm = Number(process.env.RATE_LIMIT_RPM || 60);
    if (!checkRateLimit(maxRpm)) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: { "content-type": "application/json" },
      });
    }
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "invalid_body", details: parsed.error.flatten() }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    const input = parsed.data;
    // Support idempotency via client-provided header
    const idem = req.headers.get("x-idempotency-key")?.trim();
    const id = input.id ?? (idem && idem.length > 0 ? idem : crypto.randomUUID());
    const owner = req.headers.get("x-forwarded-for") || "local";

    const cap = Number(process.env.PER_IP_CONCURRENT_JOBS || 3);
    if (!canStartJobForOwner(owner, cap)) {
      return new Response(JSON.stringify({ error: "too_many_jobs" }), {
        status: 429,
        headers: { "content-type": "application/json" },
      });
    }

    const existing = getJob(id);
    if (existing) {
      return new Response(JSON.stringify({ id, status: existing.status }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    createJob(id, "battle", owner);
    // Fire-and-forget execution
    (async () => {
      updateJob(id, { status: "running" });
      try {
        const result = await runBattle({
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
        });
        updateJob(id, { status: "succeeded", data: result });
      } catch (err: any) {
        updateJob(id, { status: "failed", error: String(err?.message ?? err) });
      }
    })();

    return new Response(JSON.stringify({ id, status: "pending" }), {
      status: 202,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}


