import { NextRequest } from "next/server";
import { z } from "zod";
import { createJob, getJob, updateJob, canStartJobForOwner } from "@/lib/jobs";
import { enqueue, hasRedis } from "@/lib/queue/bull";
import { runScaleTest } from "@/lib/runners";
import { prisma } from "@/lib/prisma";
import { estimateCostUsdFromUsage, getPricing } from "@/lib/pricing";

const bodySchema = z.object({
  runId: z.string().trim().optional(),
  agentId: z.string().trim().min(1),
  provider: z.enum(["openai", "openrouter"]),
  model: z.string().trim().min(1),
  systemPrompt: z.string().trim().optional(),
  userMessage: z.string().trim().optional(),
  runs: z.coerce.number().int().positive().min(1).max(10),
  // Optional preflight budget cap for the entire scale run
  maxBudgetUsd: z.coerce.number().min(0).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Derive client IP for per-owner concurrency caps
    const xff = req.headers.get("x-forwarded-for") || "";
    const forwardedIp = xff.split(",")[0]?.trim();
    const clientIp: string = (req as any)?.ip || forwardedIp || "local";
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
    // Preflight: optional maxBudgetUsd check using pricing.ts estimate
    let estimatedUsd: number | undefined;
    if (typeof input.maxBudgetUsd === "number") {
      try {
        await getPricing(input.provider, input.model);
      } catch {}
      // naive per-run tokens assumption, consistent with ScaleRunner estimate
      const perRunIn = 150;
      const perRunOut = 300;
      const { usdIn, usdOut } = estimateCostUsdFromUsage(input.provider, input.model, {
        inputTokens: perRunIn * input.runs,
        outputTokens: perRunOut * input.runs,
      });
      estimatedUsd = parseFloat((usdIn + usdOut).toFixed(4));
      if (estimatedUsd > input.maxBudgetUsd) {
        return new Response(JSON.stringify({ error: "budget_exceeded", estimatedUsd }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }
    }
    // Validate agent existence unless running locally without DB
    if (process.env.NODE_ENV !== "test" && process.env.LOCAL_MODE !== "1") {
      try {
        const agent = await prisma.agent.findUnique({ where: { id: input.agentId } });
        if (!agent) {
          return new Response(JSON.stringify({ error: "invalid_agent" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }
      } catch {
        // ignore connectivity issues; generic handler will catch failures later
      }
    }
    // Support idempotency via client-provided header
    const idem = req.headers.get("x-idempotency-key")?.trim();
    const id = input.runId ?? (idem && idem.length > 0 ? idem : crypto.randomUUID());
    const cap = Number(process.env.PER_IP_CONCURRENT_JOBS || 3);
    if (!canStartJobForOwner(clientIp, cap)) {
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
    if (hasRedis()) {
      await enqueue({ queueName: "scale-tests", payload: { id, input } });
      createJob(id, "scale", clientIp);
      updateJob(id, { status: "running" });
    } else {
      createJob(id, "scale", clientIp);
      (async () => {
        updateJob(id, { status: "running" });
        try {
          const result = await runScaleTest({
            runId: id,
            agentId: input.agentId,
            provider: input.provider,
            model: input.model,
            systemPrompt: input.systemPrompt,
            userMessage: input.userMessage,
            runs: input.runs,
          });
          updateJob(id, { status: "succeeded", data: result });
        } catch (err: any) {
          updateJob(id, { status: "failed", error: String(err?.message ?? err) });
        }
      })();
    }
    return new Response(JSON.stringify({ id, status: "pending", estimatedUsd }), {
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
