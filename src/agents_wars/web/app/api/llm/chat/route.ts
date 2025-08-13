import { NextRequest } from 'next/server';
import { z } from 'zod';
import { chat, type ChatMessage } from '@/lib/llm/provider';

const bodySchema = z.object({
  provider: z.enum(['openai', 'openrouter']),
  model: z.string().min(1),
  messages: z.array(z.object({ role: z.enum(['system', 'user', 'assistant', 'tool']), content: z.string() })),
  maxTokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  stream: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'invalid_body', details: parsed.error.flatten() }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }
    const { provider, model, messages, maxTokens, temperature, stream } = parsed.data;

    if (stream) {
      const encoder = new TextEncoder();
      const rs = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            const res = await chat(messages as ChatMessage[], { provider, model, maxTokens, temperature, stream: true });
            const raw: any = res.raw;
            if (raw && Symbol.asyncIterator in raw) {
              for await (const chunk of raw as AsyncIterable<any>) {
                const delta = chunk?.choices?.[0]?.delta?.content;
                if (delta) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
              }
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            } else {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: res.text })}\n\n`));
            }
            controller.close();
          } catch (err: unknown) {
            controller.enqueue(encoder.encode(`event: error\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'stream_failed' })}\n\n`));
            controller.close();
          }
        },
      });
      return new Response(rs, {
        status: 200,
        headers: {
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-cache, no-transform',
          connection: 'keep-alive',
        },
      });
    }

    const res = await chat(messages as ChatMessage[], { provider, model, maxTokens, temperature });
    return new Response(JSON.stringify({ text: res.text, usage: res.usage }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}


