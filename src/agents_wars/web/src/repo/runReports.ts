import { prisma } from "@/lib/prisma";

export async function saveRunReport(input: {
  runId: string;
  agentId: string;
  model: string;
  systemPrompt?: string;
  runCount: number;
  failures?: unknown;
  summary?: string;
  revisedPrompt?: string;
  stats?: unknown;
}) {
  try {
    return await prisma.runReport.upsert({
      where: { runId: input.runId },
      update: {
        agentId: input.agentId,
        model: input.model,
        systemPrompt: input.systemPrompt,
        runCount: input.runCount,
        failures: input.failures as any,
        summary: input.summary,
        revisedPrompt: input.revisedPrompt,
        stats: input.stats as any,
      },
      create: {
        runId: input.runId,
        agentId: input.agentId,
        model: input.model,
        systemPrompt: input.systemPrompt,
        runCount: input.runCount,
        failures: input.failures as any,
        summary: input.summary,
        revisedPrompt: input.revisedPrompt,
        stats: input.stats as any,
      },
    });
  } catch (e: unknown) {
    // Tolerate FK constraints in test or non-seeded environments; no-op persistence
    const code = (e as any)?.code as string | undefined;
    if (code === "P2003") {
      return null as any;
    }
    throw e;
  }
}
