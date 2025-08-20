import { NextRequest } from "next/server";
import { z } from "zod";
import { upsertPromptTemplate, listPromptTemplates } from "@/repo/promptTemplates";
import { GuardrailsError, rateLimit } from "@/lib/llm/guards";

export async function GET() {
  const items = await listPromptTemplates();
  return new Response(JSON.stringify({ templates: items }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

const postSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  template: z.string().trim().min(1).max(20000),
  variables: z.array(z.string().trim().min(1)).max(100).default([]),
});

export async function POST(req: NextRequest) {
  try {
    // Simple per-IP limiter for template writes
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    try {
      rateLimit(`ip:${ip}:prompt-template`);
    } catch (e) {
      if (e instanceof GuardrailsError) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429,
          headers: { "content-type": "application/json" },
        });
      }
      throw e;
    }

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
