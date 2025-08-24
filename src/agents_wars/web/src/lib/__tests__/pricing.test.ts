import { describe, it, expect } from "vitest";
import { getPricing, estimateCostUsdFromUsage } from "@/lib/pricing";

describe("pricing", () => {
  it("returns defaults and family-adjusted prices", async () => {
    const base = await getPricing("openai", "gpt-3.5-turbo");
    expect(base.inputPer1k).toBeGreaterThan(0);
    const gpt4 = await getPricing("openai", "gpt-4o");
    expect(gpt4.inputPer1k).toBeGreaterThan(base.inputPer1k);
    const mini = await getPricing("openrouter", "some-mini-model");
    const def = await getPricing("openrouter", "");
    expect(mini.inputPer1k).toBeLessThan(def.inputPer1k);
  });

  it("estimates cost from usage tokens", async () => {
    // Ensure cache is warmed with deterministic defaults for openai
    await getPricing("openai", "gpt-4o");
    const { usdIn, usdOut } = estimateCostUsdFromUsage("openai", "gpt-4o", {
      inputTokens: 1000,
      outputTokens: 2000,
    });
    expect(usdIn).toBeGreaterThan(0);
    expect(usdOut).toBeGreaterThan(0);
    // Basic proportionality check
    const { usdIn: in2 } = estimateCostUsdFromUsage("openai", "gpt-4o", {
      inputTokens: 2000,
      outputTokens: 0,
    });
    expect(in2).toBeCloseTo(usdIn * 2, 5);
  });
});
