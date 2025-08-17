import { NextRequest } from "next/server";
import { subscribe, getJob } from "@/lib/jobs/queue";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  if (!jobId) {
    return new Response(JSON.stringify({ error: "missing_jobId" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;
  const rs = new ReadableStream<Uint8Array>({
    start(controller) {
      unsubscribe = subscribe(jobId, (ev) => {
        if (ev.type === "delta")
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: ev.data })}\n\n`));
        if (ev.type === "error") {
          controller.enqueue(
            encoder.encode(`event: error\n` + `data: ${JSON.stringify({ error: ev.message })}\n\n`),
          );
          if (unsubscribe) unsubscribe();
          controller.close();
        }
        if (ev.type === "done") {
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          if (unsubscribe) unsubscribe();
          controller.close();
        }
      });
    },
    cancel() {
      if (unsubscribe) unsubscribe();
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
}
