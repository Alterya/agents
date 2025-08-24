import { chat } from "@/lib/llm/provider";
import { getConfig } from "@/lib/config";

export type RunsLite = {
  conversations: Array<{
    id: string;
    model: string;
    goal?: string | null;
    goalReached: boolean;
    endedReason?: "goal" | "limit" | "error" | "manual" | "timeout" | null;
    messages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }>;
  }>;
  stats: { succeeded: number; failed: number };
};

export type SummaryResult = {
  summary: string;
  revisedPrompt: string;
  rationale: string;
};

const SYSTEM = `You are PromptBro Analyst. Given multiple conversations with outcomes and failure cases, produce STRICT JSON with keys: summary (string), revisedPrompt (string), rationale (string).

Hard constraints:
- rationale must be concise (<=100 words)
- no hidden reasoning or chain-of-thought; only the three fields above
- if any required fact is missing, set the field value to "information unavailable"`;

export async function summarizeRuns(
  input: RunsLite,
  opts?: { provider?: "openai" | "openrouter"; model?: string },
) {
  if (process.env.E2E_MODE === "1") {
    return {
      summary: `E2E summary: ${input.stats.succeeded} ok / ${input.stats.failed} failed`,
      revisedPrompt: "E2E revised prompt",
      rationale: "E2E rationale",
    } as SummaryResult;
  }
  const user = JSON.stringify(input);
  const cfg = getConfig();
  const provider = opts?.provider ?? "openai";
  const model = cfg.summarizerModel ?? opts?.model ?? "gpt-4o-mini";
  const res = await chat(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
    {
      provider,
      model,
      maxTokens: 512,
      temperature: 0.2,
    },
  );

  const text = res.text || "";
  let parsed: Partial<SummaryResult>;
  try {
    parsed = JSON.parse(text) as Partial<SummaryResult>;
  } catch {
    parsed = {};
  }

  // Normalize fields and enforce policy
  let summary =
    typeof parsed.summary === "string" && parsed.summary.trim().length > 0
      ? parsed.summary
      : "information unavailable";
  let revisedPrompt =
    typeof parsed.revisedPrompt === "string" && parsed.revisedPrompt.trim().length > 0
      ? parsed.revisedPrompt
      : "information unavailable";
  let rationale =
    typeof parsed.rationale === "string" && parsed.rationale.trim().length > 0
      ? parsed.rationale
      : "information unavailable";

  // Enforce <= 100 words for rationale
  if (rationale !== "information unavailable") {
    const words = rationale.trim().split(/\s+/);
    if (words.length > 100) {
      rationale = words.slice(0, 100).join(" ") + " …";
    }
  }

  // Very light guard against chain-of-thought style disclosures
  const cotMarkers = [
    "chain-of-thought",
    "reasoning steps:",
    "step-by-step",
    "let's think",
    "therefore",
    "because",
  ];
  if (rationale !== "information unavailable") {
    const lower = rationale.toLowerCase();
    if (cotMarkers.some((m) => lower.includes(m))) {
      rationale = "information unavailable";
    }
  }

  return { summary, revisedPrompt, rationale } as SummaryResult;
}
