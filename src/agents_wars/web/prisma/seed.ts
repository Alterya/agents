/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const agents = [
    { name: 'Generalist', description: 'Versatile helper', systemPrompt: 'You are a helpful generalist agent.' },
    { name: 'Prompt Tuner', description: 'Improves prompts', systemPrompt: 'You refine prompts for clarity and effectiveness.' },
    { name: 'Evaluator', description: 'Evaluates outputs', systemPrompt: 'You evaluate outputs for correctness and quality.' },
  ];

  for (const a of agents) {
    await prisma.agent.upsert({
      where: { name: a.name },
      update: { description: a.description, systemPrompt: a.systemPrompt },
      create: { name: a.name, description: a.description, systemPrompt: a.systemPrompt },
    });
  }

  console.log('Seed complete: agents upserted:', agents.map(a => a.name));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


