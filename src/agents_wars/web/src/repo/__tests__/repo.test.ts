import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { getActiveAgents } from "@/repo/agents";
import { createConversation, appendMessage, completeConversation } from "@/repo/conversations";
import { upsertPromptTemplate } from "@/repo/promptTemplates";
import { saveRunReport } from "@/repo/runReports";

describe("repository helpers", () => {
  beforeAll(async () => {
    // Clean minimal tables that we touch
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("getActiveAgents returns seeded agents", async () => {
    const agents = await getActiveAgents();
    expect(agents.length).toBeGreaterThanOrEqual(1);
  });

  it("create/append/complete conversation works", async () => {
    const agents = await getActiveAgents();
    const agentId = agents[0].id;
    const convo = await createConversation({ agentId, model: "gpt-4o", systemPrompt: "hi" });
    expect(convo.id).toBeTruthy();
    const m1 = await appendMessage(convo.id, { role: "user", content: "Hello" });
    expect(m1.conversationId).toBe(convo.id);
    const end = await completeConversation(convo.id, { endedReason: "manual", goalReached: false });
    expect(end.endedReason).toBe("manual");
  });

  it("appendMessage increments messageCount atomically under concurrent appends", async () => {
    const agents = await getActiveAgents();
    const agentId = agents[0].id;
    const convo = await createConversation({ agentId, model: "gpt-4o", systemPrompt: "sys" });

    await Promise.all([
      appendMessage(convo.id, { role: "user", content: "m1" }),
      appendMessage(convo.id, { role: "assistant", content: "m2" }),
      appendMessage(convo.id, { role: "user", content: "m3" }),
    ]);

    const refreshed = await prisma.conversation.findUnique({ where: { id: convo.id } });
    expect(refreshed?.messageCount).toBe(3);
  });

  it("Agent delete is restricted when Conversations exist", async () => {
    const agents = await getActiveAgents();
    const agentId = agents[0].id;
    const convo = await createConversation({ agentId, model: "gpt-4o" });
    expect(convo.id).toBeTruthy();
    await expect(prisma.agent.delete({ where: { id: agentId } })).rejects.toBeTruthy();
  });

  it("upsertPromptTemplate is idempotent on name", async () => {
    const first = await upsertPromptTemplate({ name: "T2", template: "X {{y}}", variables: ["y"] });
    const again = await upsertPromptTemplate({
      name: "T2",
      template: "X {{y}}!",
      variables: ["y"],
    });
    expect(again.id).toBe(first.id);
    expect(again.template).toBe("X {{y}}!");
  });
  it("upsertPromptTemplate and saveRunReport work", async () => {
    const pt = await upsertPromptTemplate({ name: "T1", template: "Say {{x}}", variables: ["x"] });
    expect(pt.name).toBe("T1");
    const rr = await saveRunReport({
      runId: "run-1",
      agentId: (await getActiveAgents())[0].id,
      model: "gpt-4o",
      runCount: 1,
    });
    expect(rr.runId).toBe("run-1");
  });
});
