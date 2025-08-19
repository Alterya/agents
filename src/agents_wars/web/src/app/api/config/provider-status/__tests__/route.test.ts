import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "../../../../../../app/api/config/provider-status/route";

describe("GET /api/config/provider-status", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "";
    process.env.OPENROUTER_API_KEY = "";
    process.env.ALLOWED_MODELS = "gpt-4o";
  });

  it("returns non-sensitive provider configuration and allowed models", async () => {
    const req = new Request("http://localhost/api/config/provider-status");
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const json = await res.json();
    expect(json.providers.openaiConfigured).toBe(false);
    expect(json.providers.openrouterConfigured).toBe(false);
    expect(Array.isArray(json.allowedModels)).toBe(true);
  });
});
