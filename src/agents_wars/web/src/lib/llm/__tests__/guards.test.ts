import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getAllowedModels,
  getMaxTokensPerCall,
  getMaxMessagesPerConversation,
  enforceCaps,
  rateLimit,
  computeBackoffDelayMs,
} from "@/lib/llm/guards";

vi.mock("@/lib/config", () => {
  return {
    getConfig: vi.fn(() => ({
      allowedModels: ["gpt-4o"],
      maxTokensPerCall: 512,
      maxMessagesPerConversation: 2,
      rateLimitEnabled: true,
      rateLimitRpm: 3,
    })),
  };
});

describe("llm guards", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("exposes config getters", () => {
    expect(getAllowedModels().has("gpt-4o")).toBe(true);
    expect(getMaxTokensPerCall()).toBe(512);
    expect(getMaxMessagesPerConversation()).toBe(2);
  });

  it("enforceCaps allows valid inputs", () => {
    expect(() =>
      enforceCaps({ requestedMaxTokens: 256, messageCount: 2, model: "gpt-4o" }),
    ).not.toThrow();
  });

  it("enforceCaps rejects when max tokens exceeded", () => {
    expect(() =>
      enforceCaps({ requestedMaxTokens: 1024, messageCount: 2, model: "gpt-4o" }),
    ).toThrow(/maxTokens exceeds cap/);
  });

  it("enforceCaps rejects when message count exceeded", () => {
    expect(() =>
      enforceCaps({ requestedMaxTokens: undefined, messageCount: 3, model: "gpt-4o" }),
    ).toThrow(/message count exceeds cap/);
  });

  it("enforceCaps rejects when model not allowed", () => {
    expect(() =>
      enforceCaps({ requestedMaxTokens: 128, messageCount: 1, model: "gpt-3.5-turbo" }),
    ).toThrow(/model not allowed/);
  });

  it("rateLimit permits up to N requests per minute and then blocks", () => {
    // 3 allowed per minute
    rateLimit("k");
    rateLimit("k");
    rateLimit("k");
    expect(() => rateLimit("k")).toThrow(/rate limit exceeded/);

    // advance to next window -> should reset
    vi.advanceTimersByTime(60_000);
    expect(() => rateLimit("k")).not.toThrow();
  });

  it("computeBackoffDelayMs uses base + jitter", () => {
    // Math.random mocked to 0.5 => jitter ≈ 50ms
    expect(computeBackoffDelayMs(0)).toBe(250 + 50);
    expect(computeBackoffDelayMs(1)).toBe(750 + 50);
    expect(computeBackoffDelayMs(2)).toBe(1250 + 50);
  });
});
