import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { getActiveAgents } from "@/repo/agents";
import { createConversation, appendMessage } from "@/repo/conversations";

describe("cascade delete: Conversation -> Messages", () => {
  beforeAll(async () => {
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("deleting a Conversation removes related Messages (onDelete: Cascade)", async () => {
    const agents = await getActiveAgents();
    expect(agents.length).toBeGreaterThan(0);
    const agentId = agents[0].id;

    const convo = await createConversation({ agentId, model: "gpt-4o", systemPrompt: "sys" });
    await appendMessage(convo.id, { role: "user", content: "Hello" });
    await appendMessage(convo.id, { role: "assistant", content: "Hi!" });

    const before = await prisma.message.count({ where: { conversationId: convo.id } });
    expect(before).toBe(2);

    await prisma.conversation.delete({ where: { id: convo.id } });

    const after = await prisma.message.count({ where: { conversationId: convo.id } });
    expect(after).toBe(0);
  });
});
