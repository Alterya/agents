import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "../../../../../../app/api/llm/models/route";
import { __clearModelCatalogCache } from "@/lib/llm/models";

describe("GET /api/llm/models", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.OPENROUTER_API_KEY = "key";
    process.env.OPENROUTER_SITE = "http://localhost:3000";
    __clearModelCatalogCache();
  });

  it("returns models from OpenRouter and caches them", async () => {
    const sample = {
      data: [
        { id: "openrouter/gpt-4o", context_length: 128000, pricing: { prompt: 5, completion: 15 } },
      ],
    };
    const spy = vi
      .spyOn(global, "fetch" as any)
      .mockResolvedValue({ ok: true, json: async () => sample } as any);
    const req = new Request("http://localhost/api/llm/models");
    const res1 = await GET(req as any);
    expect(res1.status).toBe(200);
    const body1 = await res1.json();
    expect(body1.models[0].id).toBe("openrouter/gpt-4o");

    // second call should use cache (no additional fetch)
    const res2 = await GET(req as any);
    expect(res2.status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("returns 503 on fetch failure", async () => {
    vi.spyOn(global, "fetch" as any).mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as any);
    const req = new Request("http://localhost/api/llm/models");
    const res = await GET(req as any);
    expect(res.status).toBe(503);
  });
});
