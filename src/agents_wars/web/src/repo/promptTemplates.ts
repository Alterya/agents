import { prisma } from "@/lib/prisma";

export async function upsertPromptTemplate(input: {
  name: string;
  description?: string;
  template: string;
  variables: string[];
}) {
  return prisma.promptTemplate.upsert({
    where: { name: input.name },
    update: {
      description: input.description,
      template: input.template,
      variables: input.variables,
    },
    create: {
      name: input.name,
      description: input.description,
      template: input.template,
      variables: input.variables,
    },
  });
}

export async function listPromptTemplates() {
  return prisma.promptTemplate.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getPromptTemplateByName(name: string) {
  return prisma.promptTemplate.findUnique({ where: { name } });
}
