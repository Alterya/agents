import { describe, it, expect, vi } from "vitest";
import { extractVariables, buildPrompt, exportTemplateJson, analyzeDraft } from "@/lib/prompt";
import { summarizeRuns, type RunsLite } from "@/lib/summarizer";
import { __clearConfigCache } from "@/lib/config";

describe("prompt utils", () => {
  it("extracts unique variables", () => {
    const tpl = "Hello {{ name }} and {{name}}. {{_id}} {{bad-Var}} {{ missing }";
    const vars = extractVariables(tpl);
    expect(vars.sort()).toEqual(["_id", "bad-Var", "name"].sort());
  });

  it("builds prompt with provided values and leaves unmatched intact", () => {
    const tpl = "User: {{name}} wants {{goal}} by {{date}}";
    const out = buildPrompt(tpl, { name: "Ada", goal: "results" });
    expect(out).toBe("User: Ada wants results by {{date}}");
  });

  it("exports minimal json", () => {
    const json = exportTemplateJson({ name: "n", template: "t", variables: ["a", "b"] });
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe("n");
    expect(parsed.template).toBe("t");
    expect(parsed.variables).toEqual(["a", "b"]);
    expect(typeof parsed.exportedAt).toBe("string");
  });

  it("analyzes draft and returns issues/score", () => {
    const tpl = "Make a thing";
    const res = analyzeDraft(tpl);
    expect(Array.isArray(res.issues)).toBe(true);
    expect(typeof res.score).toBe("number");
    expect(res.score).toBeGreaterThanOrEqual(0);
    expect(res.score).toBeLessThanOrEqual(100);
  });

  it("summarizeRuns uses summarizer config defaults when not provided", async () => {
    __clearConfigCache();
    process.env.SUMMARIZER_PROVIDER = "openai";
    process.env.SUMMARIZER_MODEL = "gpt-4o-mini";
    const provider = await import("@/lib/llm/provider");
    const spy = vi
      .spyOn(provider, "chat")
      .mockResolvedValue({
        text: JSON.stringify({ summary: "ok", revisedPrompt: "rp", rationale: "rr" }),
      } as any);
    const runs: RunsLite = { conversations: [], stats: { succeeded: 1, failed: 0 } };
    const res = await summarizeRuns(runs);
    expect(res.summary).toBe("ok");
    expect(spy).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ provider: "openai", model: "gpt-4o-mini" }),
    );
    spy.mockRestore();
  });

  it("uses built-in default model when SUMMARIZER_MODEL is unset", async () => {
    __clearConfigCache();
    delete (process.env as any).SUMMARIZER_MODEL;
    const provider = await import("@/lib/llm/provider");
    const spy = vi
      .spyOn(provider, "chat")
      .mockResolvedValue({
        text: JSON.stringify({ summary: "s", revisedPrompt: "p", rationale: "r" }),
      } as any);
    const runs: RunsLite = { conversations: [], stats: { succeeded: 0, failed: 0 } };
    await summarizeRuns(runs, { provider: "openai" });
    // falls back to summarizer.ts default "gpt-4o-mini"
    expect(spy).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ model: "gpt-4o-mini" }),
    );
    spy.mockRestore();
  });

  it("enforces rationale <= 100 words and fallback 'information unavailable' on missing fields", async () => {
    const provider = await import("@/lib/llm/provider");
    const longWords = Array.from({ length: 150 })
      .map((_, i) => `w${i + 1}`)
      .join(" ");
    const text = JSON.stringify({
      summary: "",
      revisedPrompt: " ",
      rationale: longWords + " tail",
    });
    const spy = vi.spyOn(provider, "chat").mockResolvedValue({ text } as any);
    const runs: RunsLite = {
      conversations: [{ id: "c1", model: "m", goalReached: false, messages: [] }],
      stats: { succeeded: 0, failed: 1 },
    } as any;
    const res = await summarizeRuns(runs, { provider: "openai", model: "gpt-4o-mini" });
    expect(res.summary).toBe("information unavailable");
    expect(res.revisedPrompt).toBe("information unavailable");
    // 100 words plus ellipsis marker
    expect(res.rationale.split(/\s+/).length).toBeLessThanOrEqual(101);
    spy.mockRestore();
  });

  it("gracefully handles invalid summarizer model (chat failure)", async () => {
    __clearConfigCache();
    (process.env as any).SUMMARIZER_MODEL = "no-such-model";
    const provider = await import("@/lib/llm/provider");
    const spy = vi.spyOn(provider, "chat").mockRejectedValue(new Error("model not available"));
    // Call summarizeRuns indirectly through runScaleTest ensures caller tolerates failure
    const { runScaleTest } = await import("@/lib/runners");
    const prisma = await import("@/lib/prisma");
    vi.spyOn(prisma.prisma.conversation, "findUnique").mockResolvedValue({} as any);
    vi.spyOn(prisma.prisma.message, "findMany").mockResolvedValue([] as any);
    vi.spyOn(prisma.prisma.runReport, "upsert").mockResolvedValue({ runId: "r" } as any);
    const res = await runScaleTest({
      runId: "r",
      agentId: "a",
      provider: "openai",
      model: "gpt-4o-mini",
      runs: 1,
    });
    expect(res.runId).toBe("r");
    spy.mockRestore();
  });
});
