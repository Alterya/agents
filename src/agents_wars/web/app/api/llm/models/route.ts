import { NextRequest } from "next/server";
import { getModelCatalog } from "@/lib/llm/models";

export async function GET(_req: NextRequest) {
  try {
    const items = await getModelCatalog();
    return new Response(JSON.stringify({ models: items }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    const status =
      typeof err?.message === "string" && err.message.startsWith("models_fetch_failed:")
        ? Number(err.message.split(":")[1]) || 502
        : 500;
    return new Response(JSON.stringify({ error: "models_fetch_failed" }), {
      status,
      headers: { "content-type": "application/json" },
    });
  }
}
