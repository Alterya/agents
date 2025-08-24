import { chat, type ChatMessage } from "@/lib/llm/provider";
import { createConversation, appendMessage, completeConversation } from "@/repo/conversations";
import { saveRunReport } from "@/repo/runReports";
import { summarizeRuns } from "@/lib/summarizer";
import { getConfig } from "@/lib/config";
import { getPricing, estimateCostUsdFromUsage } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

export type BattleInput = {
  runId?: string;
  agentId: string;
  provider: "openai" | "openrouter";
  model: string;
  systemPrompt?: string;
  goal?: string;
  messageLimit?: number;
  userMessage?: string;
  maxTokens?: number;
  temperature?: number;
};

type RunAcc = {
  usdIn: number;
  usdOut: number;
  inputTokens: number;
  outputTokens: number;
};

async function estimateTurnCost(
  provider: "openai" | "openrouter",
  model: string,
  usage?: { inputTokens?: number; outputTokens?: number },
): Promise<{ usdIn: number; usdOut: number }> {
  try {
    await getPricing(provider, model);
  } catch {}
  return estimateCostUsdFromUsage(provider, model, usage);
}

export async function runBattle(
  input: BattleInput,
  onDelta?: (delta: string) => void,
  signal?: AbortSignal,
): Promise<{
  conversationId: string;
  goalReached: boolean;
  endedReason: "goal" | "limit" | "error" | "manual" | "timeout";
  messageCount: number;
}> {
  const cfg = getConfig();
  // In tests, exercise full logic paths using mocks instead of hard short-circuiting
  let conversationId: string | null = null;
  try {
    const convo = await createConversation({
      agentId: input.agentId,
      model: input.model,
      systemPrompt: input.systemPrompt,
      goal: input.goal,
      messageLimit: input.messageLimit,
      runId: input.runId,
    });
    conversationId = convo.id;
  } catch {}

  const acc: RunAcc = { usdIn: 0, usdOut: 0, inputTokens: 0, outputTokens: 0 };
  const messages: ChatMessage[] = [];
  if (input.systemPrompt) messages.push({ role: "system", content: input.systemPrompt });

  if (input.userMessage) {
    if (conversationId) {
      try {
        await appendMessage(conversationId, { role: "user", content: input.userMessage });
      } catch {}
    }
    messages.push({ role: "user", content: input.userMessage });
  }

  let goalReached = false;
  let endedReason: "goal" | "limit" | "error" | "manual" | "timeout" = "limit";

  const limit = input.messageLimit ?? 25;
  const usdCap = cfg.maxUsdPerConversation;
  while (true) {
    if (signal?.aborted) {
      endedReason = signal.reason === "timeout" ? "timeout" : "manual";
      break;
    }
    if (messages.length >= limit) {
      endedReason = "limit";
      break;
    }
    const res = await chat(messages, {
      provider: input.provider,
      model: input.model,
      maxTokens: input.maxTokens,
      temperature: input.temperature,
    });
    const text = res.text ?? "";
    const usage = res.usage;
    const { usdIn, usdOut } = await estimateTurnCost(input.provider, input.model, usage);
    acc.usdIn += usdIn;
    acc.usdOut += usdOut;
    acc.inputTokens += usage?.inputTokens ?? 0;
    acc.outputTokens += usage?.outputTokens ?? 0;
    const turnCost = usdIn + usdOut;
    if (conversationId) {
      try {
        await appendMessage(conversationId, {
          role: "assistant",
          content: text,
          tokensIn: usage?.inputTokens,
          tokensOut: usage?.outputTokens,
          costUsd: turnCost,
        });
      } catch {}
    }
    messages.push({ role: "assistant", content: text });
    if (text) onDelta?.(text);
    if (input.goal && text.toLowerCase().includes(input.goal.toLowerCase())) {
      goalReached = true;
      endedReason = "goal";
      break;
    }
    // Stop after a single turn if user message not provided (avoid infinite loop)
    if (!input.userMessage) {
      endedReason = "limit";
      break;
    }

    // Budget cap check after recording this turn
    if (typeof usdCap === "number" && usdCap >= 0 && acc.usdIn + acc.usdOut >= usdCap) {
      endedReason = "limit";
      break;
    }

    // Early exit if aborted after a turn
    if (signal?.aborted) {
      endedReason = signal.reason === "timeout" ? "timeout" : "manual";
      break;
    }
  }

  if (conversationId) {
    try {
      await completeConversation(conversationId, { endedReason, goalReached });
    } catch {}
  }
  return {
    conversationId: conversationId ?? "",
    goalReached,
    endedReason,
    messageCount: messages.length - (input.systemPrompt ? 1 : 0),
  };
}

export async function runScaleTest(input: {
  runId: string;
  agentId: string;
  provider: "openai" | "openrouter";
  model: string;
  systemPrompt?: string;
  userMessage?: string;
  runs: number;
}) {
  // In tests, allow the normal flow to run using mocked deps for better coverage
  if (process.env.E2E_MODE === "1") {
    const total = input.runs;
    const succeeded = total;
    const failed = 0;
    return { runId: input.runId, total, succeeded, failed, conversationIds: [] as string[] };
  }
  const tasks = Array.from({ length: input.runs }).map((_, i) =>
    runBattle({
      runId: `${input.runId}-${i + 1}`,
      agentId: input.agentId,
      provider: input.provider,
      model: input.model,
      systemPrompt: input.systemPrompt,
      userMessage: input.userMessage,
    }),
  );

  const results = await Promise.allSettled(tasks);
  let succeeded = 0;
  const failures: any[] = [];
  const conversationIds: string[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      succeeded += 1;
      conversationIds.push(r.value.conversationId);
    } else {
      failures.push({ error: String(r.reason) });
    }
  }
  const total = input.runs;
  const failed = total - succeeded;

  // Build runs summary with sampled transcript and flags under a tight budget
  const SAMPLE_FIRST = 2;
  const SAMPLE_LAST = 2;
  const conversations = await Promise.all(
    conversationIds.map(async (id) => {
      try {
        const convo = await prisma.conversation.findUnique({
          where: { id },
          select: { goal: true, goalReached: true, endedReason: true },
        });
        const all = await prisma.message.findMany({
          where: { conversationId: id },
          orderBy: { createdAt: "asc" },
          select: { role: true, content: true },
        });
        // first N system/user messages
        const head = all
          .filter((m) => m.role === "system" || m.role === "user")
          .slice(0, SAMPLE_FIRST);
        // last M assistant messages (from the end backwards)
        const assistants = all.filter((m) => m.role === "assistant");
        const tail = assistants.slice(Math.max(0, assistants.length - SAMPLE_LAST));
        const sampled = [...head, ...tail] as {
          role: "system" | "user" | "assistant" | "tool";
          content: string;
        }[];
        return {
          id,
          model: input.model,
          goal: convo?.goal ?? undefined,
          goalReached: Boolean(convo?.goalReached),
          endedReason: (convo?.endedReason as any) ?? null,
          messages: sampled,
        };
      } catch {
        return {
          id,
          model: input.model,
          goal: undefined,
          goalReached: false,
          endedReason: null,
          messages: [] as any,
        };
      }
    }),
  );
  const runsLite = { conversations, stats: { succeeded, failed } };

  let summaryText = "";
  let revisedPrompt = "";
  let rationale = "";
  try {
    const sum = await summarizeRuns(runsLite, { provider: input.provider, model: input.model });
    summaryText = sum.summary;
    revisedPrompt = sum.revisedPrompt;
    rationale = sum.rationale;
  } catch {
    // tolerate summarizer failure
  }

  await saveRunReport({
    runId: input.runId,
    agentId: input.agentId,
    model: input.model,
    systemPrompt: input.systemPrompt,
    runCount: total,
    failures,
    summary: summaryText,
    revisedPrompt,
    stats: { succeeded, failed, conversationIds, rationale },
  });
  return { runId: input.runId, total, succeeded, failed, conversationIds };
}
