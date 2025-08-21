import { NextRequest } from "next/server";
import { z } from "zod";
import { chat, type ChatMessage } from "../../../../src/lib/llm/provider";
import { GuardrailsError, rateLimit } from "../../../../src/lib/llm/guards";

const bodySchema = z.object({
  provider: z.enum(["openai", "openrouter"]),
  model: z.string().min(1),
  messages: z.array(
    z.object({ role: z.enum(["system", "user", "assistant", "tool"]), content: z.string() }),
  ),
  maxTokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  stream: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
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
    const { provider, model, messages, maxTokens, temperature, stream } = parsed.data;
    // Simple per-IP rate key to complement provider+model limiter
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

    // Basic per-IP limiter (e.g., 10-60 rpm via config)
    try {
      rateLimit(`ip:${ip}`);
    } catch (e) {
      if (e instanceof GuardrailsError) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429,
          headers: { "content-type": "application/json" },
        });
      }
      throw e;
    }

    // Optional daily cap for PromptBro assist calls, enforced when header is present
    const isPromptBroAssist = req.headers.get("x-assist") === "promptbro";
    if (isPromptBroAssist) {
      const capRaw = process.env.PROMPTBRO_ASSIST_DAILY_CAP;
      const cap = Math.max(1, Number(capRaw ?? 50));
      const dayKey = new Date().toISOString().slice(0, 10);
      // in-memory counter
      (globalThis as any).__pb_daily = (globalThis as any).__pb_daily || new Map<string, number>();
      const key = `${ip}:${dayKey}`;
      const count = ((globalThis as any).__pb_daily.get(key) as number | undefined) ?? 0;
      if (count >= cap) {
        return new Response(JSON.stringify({ error: "daily_cap_reached" }), {
          status: 429,
          headers: { "content-type": "application/json" },
        });
      }
      (globalThis as any).__pb_daily.set(key, count + 1);
    }

    if (stream) {
      // Preflight the chat call so we can return proper HTTP status on errors before starting SSE
      try {
        const res = await chat(messages as ChatMessage[], {
          provider,
          model,
          maxTokens: Math.min(typeof maxTokens === "number" ? maxTokens : 128, 128),
          temperature,
          stream: true,
        });
        const encoder = new TextEncoder();
        const raw: any = res.raw;
        const rs = new ReadableStream<Uint8Array>({
          async start(controller) {
            try {
              if (raw && Symbol.asyncIterator in raw) {
                for await (const chunk of raw as AsyncIterable<any>) {
                  const delta = chunk?.choices?.[0]?.delta?.content;
                  if (delta)
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
                }
                controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              } else {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text: res.text })}\n\n`),
                );
                controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              }
              controller.close();
            } catch {
              controller.enqueue(encoder.encode(`event: error\n`));
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ error: "stream_failed" })}\n\n`),
              );
              controller.close();
            }
          },
        });
        return new Response(rs, {
          status: 200,
          headers: {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-cache, no-transform",
            connection: "keep-alive",
          },
        });
      } catch (err: any) {
        const status = mapErrorToStatus(err);
        return new Response(JSON.stringify({ error: "chat_failed" }), {
          status,
          headers: { "content-type": "application/json" },
        });
      }
    }

    const res = await chat(messages as ChatMessage[], {
      provider,
      model,
      maxTokens: Math.min(typeof maxTokens === "number" ? maxTokens : 128, 128),
      temperature,
    });
    return new Response(JSON.stringify({ text: res.text, usage: res.usage }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    const status = mapErrorToStatus(err);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status,
      headers: { "content-type": "application/json" },
    });
  }
}

function mapErrorToStatus(err: any): number {
  if (err instanceof GuardrailsError) {
    if (String(err.message).toLowerCase().includes("rate limit")) return 429;
    return 400;
  }
  const status = err?.status ?? err?.response?.status;
  if (status === 429) return 429;
  if (typeof status === "number" && status >= 500 && status <= 599) return 502;
  return 500;
}
