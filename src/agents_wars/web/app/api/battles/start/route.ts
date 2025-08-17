import { NextRequest } from "next/server";
import { enqueueBattleRun } from "@/lib/jobs/queue";

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => ({} as any));
  const id = enqueueBattleRun(json);
  return new Response(JSON.stringify({ jobId: id }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
