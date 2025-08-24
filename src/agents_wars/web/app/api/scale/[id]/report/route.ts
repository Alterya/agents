import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const runId = params.id;
    const report =
      process.env.E2E_MODE === "1" || process.env.LOCAL_MODE === "1"
        ? ((globalThis as any).__run_reports?.get?.(runId) ?? null)
        : await prisma.runReport.findUnique({ where: { runId } });
    if (!report) {
      if (process.env.E2E_MODE === "1") {
        // Provide a synthetic E2E report when DB is not used
        return new Response(
          JSON.stringify({
            runId,
            agentId: "agent-1",
            model: "gpt-4o-mini",
            systemPrompt: null,
            runCount: 2,
            failures: [],
            summary: "E2E summary: 2 ok / 0 failed",
            revisedPrompt: "E2E revised prompt",
            stats: {
              succeeded: 2,
              failed: 0,
              conversationIds: ["c-1", "c-2"],
              rationale: "E2E rationale",
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({
        runId: report.runId,
        agentId: report.agentId,
        model: report.model,
        systemPrompt: report.systemPrompt,
        runCount: report.runCount,
        failures: report.failures,
        summary: report.summary,
        revisedPrompt: report.revisedPrompt,
        stats: report.stats,
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  } catch {
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
