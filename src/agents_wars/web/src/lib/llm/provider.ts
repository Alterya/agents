import OpenAI from "openai";
import { enforceCaps, rateLimit, computeBackoffDelayMs, sleep } from "@/lib/llm/guards";
import { getConfig } from "@/lib/config";

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

export type ChatOptions = {
  provider: "openai" | "openrouter";
  model: string;
  maxTokens?: number;
  temperature?: number;
  stop?: string[];
  stream?: boolean;
};

export type ChatUsage = { inputTokens: number; outputTokens: number };

export async function chat(
  messages: ChatMessage[],
  opts: ChatOptions,
): Promise<{ text: string; usage?: ChatUsage; raw: unknown }> {
  if (process.env.E2E_MODE === "1") {
    // Deterministic stub for E2E: echo the last user content
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const text = lastUser?.content ? `E2E: ${lastUser.content}` : "E2E: ok";
    return { text, usage: { inputTokens: 10, outputTokens: 20 }, raw: {} };
  }
  // Guardrails
  enforceCaps({
    requestedMaxTokens: opts.maxTokens,
    messageCount: messages.length,
    model: opts.model,
  });
  rateLimit(`${opts.provider}:${opts.model}`);
  const cfg = getConfig();
  const isOpenRouter = opts.provider === "openrouter";

  const client = new OpenAI({
    apiKey: isOpenRouter ? cfg.openrouterApiKey : cfg.openaiApiKey,
    baseURL: isOpenRouter ? "https://openrouter.ai/api/v1" : undefined,
  });

  const headers = isOpenRouter
    ? {
        "HTTP-Referer": cfg.openrouterSite || "",
        "X-Title": "Agent Wars",
      }
    : undefined;

  if (opts.stream) {
    // Minimal streaming assembly (iterator mode)
    const stream = await client.chat.completions.create({
      model: opts.model,
      messages,
      max_tokens: opts.maxTokens ?? 512,
      temperature: opts.temperature ?? 0.2,
      stop: opts.stop,
      stream: true,
      extra_headers: headers as any,
    } as any);

    let text = "";
    // openai v4 streams expose an async iterator via .[Symbol.asyncIterator]
    // Cast to any to iterate chunks
    for await (const chunk of stream as any) {
      const delta = chunk?.choices?.[0]?.delta?.content;
      if (delta) text += delta;
    }
    return { text, raw: stream };
  }

  let lastErr: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await client.chat.completions.create({
        model: opts.model,
        messages,
        max_tokens: opts.maxTokens ?? 512,
        temperature: opts.temperature ?? 0.2,
        stop: opts.stop,
        extra_headers: headers as any,
      } as any);

      const text = resp.choices?.[0]?.message?.content ?? "";
      const usage: ChatUsage | undefined = resp.usage
        ? {
            inputTokens: (resp.usage as any).prompt_tokens ?? 0,
            outputTokens: (resp.usage as any).completion_tokens ?? 0,
          }
        : undefined;

      return { text, usage, raw: resp };
    } catch (err: any) {
      lastErr = err;
      const status = err?.status ?? err?.response?.status;
      if (attempt < 2 && (status === 429 || (status >= 500 && status <= 599))) {
        await sleep(computeBackoffDelayMs(attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}
