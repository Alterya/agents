import { NextRequest } from "next/server";
import { getJob, updateJob } from "../../../../src/lib/jobs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const requestId =
      req.headers.get("x-request-id") ||
      (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
    const id = params.id;
    const job = getJob(id);
    if (!job) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { "content-type": "application/json", "x-request-id": requestId },
      });
    }
    updateJob(id, { status: "failed", error: "cancelled" });
    return new Response(JSON.stringify({ id, status: "cancelled" }), {
      status: 200,
      headers: { "content-type": "application/json", "x-request-id": requestId },
    });
  } catch {
    const requestId = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { "content-type": "application/json", "x-request-id": requestId },
    });
  }
}
