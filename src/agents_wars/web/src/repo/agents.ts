import { prisma } from "@/lib/prisma";

export async function getActiveAgents() {
  if (process.env.E2E_MODE === "1") {
    return [
      { id: "agent-1", name: "Agent One" },
      { id: "agent-2", name: "Agent Two" },
    ];
  }
  return prisma.agent.findMany({ where: { isActive: true } });
}
