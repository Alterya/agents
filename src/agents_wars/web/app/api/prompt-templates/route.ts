import { NextRequest } from "next/server";
import { z } from "zod";
import { upsertPromptTemplate, listPromptTemplates } from "@/repo/promptTemplates";

export async function GET() {
  const items = await listPromptTemplates();
  return new Response(JSON.stringify({ templates: items }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

const postSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  template: z.string().trim().min(1),
  variables: z.array(z.string().trim()).default([]),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = postSchema.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "invalid_body", details: parsed.error.flatten() }),
        { status: 400, headers: { "content-type": "application/json" } },
      );
    }
    const saved = await upsertPromptTemplate(parsed.data);
    return new Response(JSON.stringify({ template: saved }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
