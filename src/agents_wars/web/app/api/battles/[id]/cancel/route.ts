import { NextRequest } from "next/server";
import { getJob, updateJob } from "@/lib/jobs";

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const job = getJob(id);
    if (!job) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }
    updateJob(id, { status: "failed", error: "cancelled" });
    return new Response(JSON.stringify({ id, status: "cancelled" }), {
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


