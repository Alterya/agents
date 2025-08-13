import { prisma } from '@/lib/prisma';

export async function getActiveAgents() {
  return prisma.agent.findMany({ where: { isActive: true } });
}


