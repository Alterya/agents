import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../../../../../../app/api/llm/chat/route';
import { chat } from '@/lib/llm/provider';

vi.mock('@/lib/llm/provider', () => {
  return {
    chat: vi.fn(),
  };
});

async function readStreamToString(stream: ReadableStream<Uint8Array> | null): Promise<string> {
  if (!stream) return '';
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) out += decoder.decode(value, { stream: true });
  }
  out += new TextDecoder().decode();
  return out;
}

describe('API /api/llm/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 200 with JSON payload for non-streaming requests', async () => {
    chat.mockResolvedValue({ text: 'ok', usage: { inputTokens: 1, outputTokens: 2 }, raw: { mocked: true } });

    const req = new Request('http://localhost/api/llm/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        provider: 'openai',
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 's' },
          { role: 'user', content: 'u' },
        ],
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = await res.json();
    expect(body).toEqual({ text: 'ok', usage: { inputTokens: 1, outputTokens: 2 } });
    expect(chat).toHaveBeenCalledTimes(1);
  });

  it('streams SSE deltas and emits done event when stream=true', async () => {
    async function* gen() {
      yield { choices: [{ delta: { content: 'Hel' } }] } as any;
      yield { choices: [{ delta: { content: 'lo' } }] } as any;
    }
    chat.mockResolvedValue({ text: 'Hello', raw: gen() });

    const req = new Request('http://localhost/api/llm/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        provider: 'openai',
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 's' },
          { role: 'user', content: 'u' },
        ],
        stream: true,
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');

    const text = await readStreamToString(res.body);
    // Expect at least two delta events and a done event
    expect(text).toContain('data: {"delta":"Hel"}');
    expect(text).toContain('data: {"delta":"lo"}');
    expect(text).toContain('event: done');
  });

  it('returns 400 with zod error details for invalid body', async () => {
    const req = new Request('http://localhost/api/llm/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'openai' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = await res.json();
    expect(body.error).toBe('invalid_body');
    expect(body.details).toBeTruthy();
  });
});


