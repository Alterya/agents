import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runBattle, runScaleTest } from "@/lib/runners";

vi.mock("@/lib/llm/provider", () => ({
  chat: vi.fn(),
}));

vi.mock("@/repo/conversations", () => ({
  createConversation: vi.fn(async (input: any) => ({ id: "convo-1", ...input })),
  appendMessage: vi.fn(async () => ({ id: "msg-1" })),
  completeConversation: vi.fn(async (_id: string, _data: any) => ({ id: _id, ..._data })),
}));

import * as provider from "@/lib/llm/provider";
import * as repos from "@/repo/conversations";
import { prisma } from "@/lib/prisma";
import * as summarizer from "@/lib/summarizer";

describe("runBattle caps and timeouts", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-key";
    process.env.ALLOWED_MODELS = "gpt-4o";
  });

  afterEach(() => {
    delete process.env.MAX_USD_PER_CONVO;
  });

  it("stops due to MAX_USD_PER_CONVO budget cap and marks endedReason=limit", async () => {
    // Arrange: cap so that one turn exceeds it
    process.env.MAX_USD_PER_CONVO = "0.0005"; // lower than the computed cost below (0.002)
    (provider.chat as any).mockResolvedValueOnce({
      text: "hello",
      usage: { inputTokens: 1000, outputTokens: 0 },
    });

    // Act
    const res = await runBattle({
      agentId: "agent-1",
      provider: "openai",
      model: "gpt-4o",
    });

    // Assert
    expect(res.endedReason).toBe("limit");
    expect(repos.appendMessage).toHaveBeenCalledTimes(1);
    expect(repos.completeConversation).toHaveBeenCalledWith(
      "convo-1",
      expect.objectContaining({ endedReason: "limit" }),
    );
  });

  it("aborts early when signal is already aborted (timeout)", async () => {
    // Arrange: signal aborted
    const ac = new AbortController();
    ac.abort("timeout");

    // Even if provider would resolve, it should not be called when we exit early
    (provider.chat as any).mockResolvedValueOnce({
      text: "should-not-call",
      usage: { inputTokens: 1, outputTokens: 1 },
    });

    // Act
    const res = await runBattle(
      {
        agentId: "agent-1",
        provider: "openai",
        model: "gpt-4o",
      },
      undefined,
      ac.signal,
    );

    // Assert
    expect(res.endedReason).toBe("timeout");
    expect(provider.chat).not.toHaveBeenCalled();
    expect(repos.completeConversation).toHaveBeenCalledWith(
      "convo-1",
      expect.objectContaining({ endedReason: "timeout" }),
    );
  });
});

describe("runScaleTest", () => {
  it("is defined (integration tested via API routes)", () => {
    expect(typeof runScaleTest).toBe("function");
  });

  it("builds runsLite with goal flags and sampled transcript (first N system/user + last M assistant)", async () => {
    // Arrange: stub prisma reads used by runScaleTest post-processing
    const convSpy = vi
      .spyOn(prisma.conversation, "findUnique")
      .mockResolvedValue({ goal: "done", goalReached: true, endedReason: "goal" } as any);
    const msgs = [
      { role: "system", content: "sys" },
      { role: "user", content: "u1" },
      { role: "assistant", content: "a1" },
      { role: "assistant", content: "a2" },
      { role: "assistant", content: "a3" },
    ];
    const msgSpy = vi.spyOn(prisma.message, "findMany").mockResolvedValue(msgs as any);
    // Summarizer returns fixed output
    const sumSpy = vi
      .spyOn(summarizer, "summarizeRuns")
      .mockResolvedValue({ summary: "S", revisedPrompt: "RP", rationale: "R" } as any);
    // Avoid real DB upsert and verify payload contains revisedPrompt and rationale
    const upsertSpy = vi
      .spyOn(prisma.runReport, "upsert")
      .mockResolvedValue({ runId: "run-1" } as any);

    // Act
    const res = await runScaleTest({
      runId: "run-1",
      agentId: "agent-1",
      provider: "openai",
      model: "gpt-4o",
      runs: 1,
    });

    // Assert report persisted fields via prisma.runReport.upsert tolerant of FK errors
    expect(res.runId).toBe("run-1");
    expect(convSpy).toHaveBeenCalled();
    expect(msgSpy).toHaveBeenCalled();
    // Validate sampling shape: first system+user (2) + last 2 assistants
    const calledWith = sumSpy.mock.calls[0][0];
    const sample = calledWith.conversations[0].messages;
    expect(sample.map((m: any) => m.role)).toEqual(["system", "user", "assistant", "assistant"]);
    expect(calledWith.conversations[0]).toEqual(
      expect.objectContaining({ goal: "done", goalReached: true, endedReason: "goal" }),
    );

    // Ensure persistence invoked with revisedPrompt and rationale in stats
    expect(upsertSpy).toHaveBeenCalled();
    const upsertArgs = upsertSpy.mock.calls[0][0];
    expect(upsertArgs.update.revisedPrompt).toBe("RP");
    expect((upsertArgs.update.stats as any).rationale).toBe("R");

    // Cleanup
    convSpy.mockRestore();
    msgSpy.mockRestore();
    sumSpy.mockRestore();
    upsertSpy.mockRestore();
  });
});
