import { NextRequest } from "next/server";
import { z } from "zod";
import { createJob, getJob, updateJob } from "@/lib/jobs";
import { runScaleTest } from "@/lib/runners";

const bodySchema = z.object({
  runId: z.string().trim().optional(),
  agentId: z.string().trim().min(1),
  provider: z.enum(["openai", "openrouter"]),
  model: z.string().trim().min(1),
  systemPrompt: z.string().trim().optional(),
  userMessage: z.string().trim().optional(),
  runs: z.coerce.number().int().positive().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "invalid_body", details: parsed.error.flatten() }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    const input = parsed.data;
    const id = input.runId ?? crypto.randomUUID();
    const existing = getJob(id);
    if (existing) {
      return new Response(JSON.stringify({ id, status: existing.status }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    createJob(id, "scale");
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


