import { describe, it, expect, vi, beforeEach } from "vitest";
import * as provider from "@/lib/llm/provider";
import * as guards from "@/lib/llm/guards";
import { __clearConfigCache } from "@/lib/config";

vi.mock("openai", () => {
  const defaultImpl = async (opts: any) => {
    if (opts.stream) {
      const gen = async function* () {
        yield { choices: [{ delta: { content: "Hello" } }] } as any;
        yield { choices: [{ delta: { content: "!" } }] } as any;
      };
      return gen();
    }
    return {
      choices: [{ message: { content: "Hello!" } }],
      usage: { prompt_tokens: 3, completion_tokens: 2 },
    } as any;
  };
  const createSpy = vi.fn(defaultImpl);
  return {
    default: class MockOpenAI {
      chat = { completions: { create: createSpy } };
      constructor(_: any) {}
    },
    createSpy,
  };
});

describe("llm provider", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test";
    process.env.OPENROUTER_API_KEY = "";
    process.env.ALLOWED_MODELS = "gpt-4o";
    vi.restoreAllMocks();
    __clearConfigCache();
  });

  it("returns non-streaming content and usage", async () => {
    const res = await provider.chat(
      [
        { role: "system", content: "s" },
        { role: "user", content: "u" },
      ],
      { provider: "openai", model: "gpt-4o" },
    );
    expect(res.text).toBe("Hello!");
    expect(res.usage?.inputTokens).toBe(3);
    expect(res.usage?.outputTokens).toBe(2);
  });

  it("assembles streaming content", async () => {
    const res = await provider.chat(
      [
        { role: "system", content: "s" },
        { role: "user", content: "u" },
      ],
      { provider: "openai", model: "gpt-4o", stream: true },
    );
    expect(res.text).toBe("Hello!");
  });

  it("retries on 429 then succeeds (non-stream)", async () => {
    const { createSpy }: any = await import("openai");
    createSpy.mockReset();
    // First call: rate limited; Second call: success
    createSpy.mockRejectedValueOnce(Object.assign(new Error("rate"), { status: 429 }));
    createSpy.mockResolvedValueOnce({
      choices: [{ message: { content: "OK" } }],
      usage: { prompt_tokens: 1, completion_tokens: 2 },
    });
    // First call: rate limited; Second call: success
    createSpy.mockRejectedValueOnce(Object.assign(new Error("rate"), { status: 429 }));
    createSpy.mockResolvedValueOnce({
      choices: [{ message: { content: "OK" } }],
      usage: { prompt_tokens: 1, completion_tokens: 2 },
    });
    vi.spyOn(guards, "sleep").mockResolvedValue();

    const res = await provider.chat(
      [
        { role: "system", content: "s" },
        { role: "user", content: "u" },
      ],
      { provider: "openai", model: "gpt-4o" },
    );
    expect(res.text).toBe("OK");
    expect(res.usage).toEqual({ inputTokens: 1, outputTokens: 2 });
    expect(createSpy).toHaveBeenCalledTimes(2);
  });

  it("does not retry on 400 and throws", async () => {
    const { createSpy }: any = await import("openai");
    createSpy.mockReset();
    createSpy.mockRejectedValueOnce(Object.assign(new Error("bad"), { status: 400 }));
    await expect(
      provider.chat(
        [
          { role: "system", content: "s" },
          { role: "user", content: "u" },
        ],
        { provider: "openai", model: "gpt-4o" },
      ),
    ).rejects.toBeTruthy();
    expect(createSpy).toHaveBeenCalledTimes(1);
  });

  it("passes OpenRouter required headers", async () => {
    process.env.OPENAI_API_KEY = "";
    process.env.OPENROUTER_API_KEY = "key";
    process.env.OPENROUTER_SITE = "http://localhost";
    __clearConfigCache();
    const { createSpy }: any = await import("openai");
    createSpy.mockReset();
    createSpy.mockImplementationOnce(async (opts: any) => {
      expect(opts.extra_headers["HTTP-Referer"]).toBe("http://localhost");
      expect(opts.extra_headers["X-Title"]).toBe("Agent Wars");
      return { choices: [{ message: { content: "OR" } }] } as any;
    });

    const res = await provider.chat(
      [
        { role: "system", content: "s" },
        { role: "user", content: "u" },
      ],
      { provider: "openrouter", model: "gpt-4o" },
    );
    expect(res.text).toBe("OR");
  });

  it("throws when rateLimit guard blocks", async () => {
    vi.spyOn(guards, "rateLimit").mockImplementation(() => {
      throw new (guards as any).GuardrailsError("rate limit exceeded");
    });
    await expect(
      provider.chat(
        [
          { role: "system", content: "s" },
          { role: "user", content: "u" },
        ],
        { provider: "openai", model: "gpt-4o" },
      ),
    ).rejects.toBeTruthy();
  });
});
