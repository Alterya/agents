import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type CreateConversationInput = {
  agentId: string;
  model: string;
  systemPrompt?: string;
  goal?: string;
  messageLimit?: number;
  runId?: string;
};

export async function createConversation(input: CreateConversationInput) {
  return prisma.conversation.create({
    data: {
      agentId: input.agentId,
      model: input.model,
      systemPrompt: input.systemPrompt,
      goal: input.goal,
      messageLimit: input.messageLimit ?? 25,
      runId: input.runId,
    },
  });
}

export async function appendMessage(
  conversationId: string,
  data: {
    role: "system" | "user" | "assistant" | "tool";
    content: string;
    tokensIn?: number;
    tokensOut?: number;
    costUsd?: number;
  },
) {
  return prisma.$transaction(async (tx) => {
    const msg = await tx.message.create({
      data: {
        conversationId,
        role: data.role,
        content: data.content,
        tokensIn: data.tokensIn,
        tokensOut: data.tokensOut,
        costUsd: data.costUsd,
      },
    });
    await tx.conversation.update({
      where: { id: conversationId },
      data: {
        messageCount: { increment: 1 },
        totalTokensIn: data.tokensIn ? { increment: data.tokensIn } : undefined,
        totalTokensOut: data.tokensOut ? { increment: data.tokensOut } : undefined,
        totalCostUsd:
          data.costUsd != null ? { increment: new Prisma.Decimal(data.costUsd) } : undefined,
      },
    });
    return msg;
  });
}

export async function completeConversation(
  conversationId: string,
  data: {
    endedReason?: "goal" | "limit" | "error" | "manual" | "timeout";
    goalReached?: boolean;
    endedAt?: Date;
  },
) {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: {
      endedReason: data.endedReason,
      goalReached: data.goalReached ?? false,
      endedAt: data.endedAt ?? new Date(),
    },
  });
}
