import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../../../../../../app/api/llm/chat/route";
import { chat } from "@/lib/llm/provider";
import { GuardrailsError } from "@/lib/llm/guards";

vi.mock("@/lib/llm/provider", () => {
  return {
    chat: vi.fn(),
  };
});

async function readStreamToString(stream: ReadableStream<Uint8Array> | null): Promise<string> {
  if (!stream) return "";
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) out += decoder.decode(value, { stream: true });
  }
  out += new TextDecoder().decode();
  return out;
}

describe("API /api/llm/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 200 with JSON payload for non-streaming requests", async () => {
    vi.mocked(chat).mockResolvedValue({
      text: "ok",
      usage: { inputTokens: 1, outputTokens: 2 },
      raw: { mocked: true },
    } as any);

    const req = new Request("http://localhost/api/llm/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: "openai",
        model: "gpt-4o",
        messages: [
          { role: "system", content: "s" },
          { role: "user", content: "u" },
        ],
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await res.json();
    expect(body).toEqual({ text: "ok", usage: { inputTokens: 1, outputTokens: 2 } });
    expect(chat).toHaveBeenCalledTimes(1);
  });

  it("streams SSE deltas and emits done event when stream=true", async () => {
    async function* gen() {
      yield { choices: [{ delta: { content: "Hel" } }] } as any;
      yield { choices: [{ delta: { content: "lo" } }] } as any;
    }
    vi.mocked(chat).mockResolvedValue({ text: "Hello", raw: gen() } as any);

    const req = new Request("http://localhost/api/llm/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: "openai",
        model: "gpt-4o",
        messages: [
          { role: "system", content: "s" },
          { role: "user", content: "u" },
        ],
        stream: true,
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const text = await readStreamToString(res.body);
    // Expect at least two delta events and a [DONE] marker
    expect(text).toContain('data: {"delta":"Hel"}');
    expect(text).toContain('data: {"delta":"lo"}');
    expect(text).toContain("data: [DONE]");
  });

  it("streams single text payload followed by [DONE] when provider raw is not iterable", async () => {
    vi.mocked(chat).mockResolvedValue({ text: "Hello", raw: { not: "iterable" } } as any);

    const req = new Request("http://localhost/api/llm/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: "openai",
        model: "gpt-4o",
        messages: [
          { role: "system", content: "s" },
          { role: "user", content: "u" },
        ],
        stream: true,
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const text = await readStreamToString(res.body);
    expect(text).toContain('data: {"text":"Hello"}');
    expect(text).toContain("data: [DONE]");
  });

  it("returns 400 with zod error details for invalid body", async () => {
    const req = new Request("http://localhost/api/llm/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: "openai" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await res.json();
    expect(body.error).toBe("invalid_body");
    expect(body.details).toBeTruthy();
  });

  it("maps GuardrailsError to 400 (non-rate limit)", async () => {
    (chat as any).mockRejectedValue(new GuardrailsError("model not allowed"));
    const req = new Request("http://localhost/api/llm/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: "openai",
        model: "bad-model",
        messages: [{ role: "user", content: "hi" }],
      }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("maps GuardrailsError rate limit to 429", async () => {
    (chat as any).mockRejectedValue(new GuardrailsError("rate limit exceeded"));
    const req = new Request("http://localhost/api/llm/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: "openai",
        model: "gpt-4o",
        messages: [{ role: "user", content: "hi" }],
      }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(429);
  });

  it("maps upstream 5xx to 502 and 429 to 429 (non-streaming)", async () => {
    (chat as any).mockRejectedValueOnce({ status: 500 });
    let req = new Request("http://localhost/api/llm/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: "openai",
        model: "gpt-4o",
        messages: [{ role: "user", content: "hi" }],
      }),
    });
    let res = await POST(req as any);
    expect(res.status).toBe(502);

    (chat as any).mockRejectedValueOnce({ status: 429 });
    req = new Request("http://localhost/api/llm/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: "openai",
        model: "gpt-4o",
        messages: [{ role: "user", content: "hi" }],
      }),
    });
    res = await POST(req as any);
    expect(res.status).toBe(429);
  });

  it("stream preflight errors yield HTTP status (400/429/502)", async () => {
    (chat as any).mockRejectedValueOnce(new GuardrailsError("model not allowed"));
    const req = new Request("http://localhost/api/llm/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: "openai",
        model: "bad",
        messages: [{ role: "user", content: "x" }],
        stream: true,
      }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("returns 500 internal_error when provider.chat throws (non-stream)", async () => {
    (chat as any).mockRejectedValueOnce(new Error("boom"));

    const req = new Request("http://localhost/api/llm/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: "openai",
        model: "gpt-4o",
        messages: [
          { role: "system", content: "s" },
          { role: "user", content: "u" },
        ],
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(500);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await res.json();
    expect(body).toEqual({ error: "internal_error" });
  });

  it("preflight returns HTTP status when streaming cannot start", async () => {
    (chat as any).mockImplementationOnce(async () => {
      throw new Error("stream-fail");
    });

    const req = new Request("http://localhost/api/llm/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: "openai",
        model: "gpt-4o",
        messages: [
          { role: "system", content: "s" },
          { role: "user", content: "u" },
        ],
        stream: true,
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(500);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await res.json();
    expect(body).toEqual({ error: "chat_failed" });
  });
});
