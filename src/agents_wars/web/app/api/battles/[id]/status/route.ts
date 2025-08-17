import { NextRequest } from "next/server";
import { getJob, subscribeJob } from "@/lib/jobs";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const job = getJob(id);
    if (!job) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    const rs = new ReadableStream<Uint8Array>({
      start(controller) {
        function emit() {
          const j = getJob(id);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(j)}\n\n`));
          if (!j || j.status === "succeeded" || j.status === "failed") {
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          }
        }
        emit();
        const unsub = subscribeJob(id, () => emit());
        // Close on client abort
        // @ts-ignore
        controller.signal?.addEventListener?.("abort", () => unsub());
      },
    });
    return new Response(rs, {
      status: 200,
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}


