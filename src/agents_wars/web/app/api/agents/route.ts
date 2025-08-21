import { NextRequest } from "next/server";
import { getActiveAgents } from "@/repo/agents";

export async function GET(_req: NextRequest) {
  try {
    const agents = await getActiveAgents();
    // Ensure shape matches UI expectation when using in-memory fallback
    const items = agents.map((a: any) => ({
      id: a.id,
      name: a.name,
      description: (a as any).description ?? undefined,
    }));
    return new Response(JSON.stringify({ items }), {
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
