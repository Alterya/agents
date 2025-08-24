import { NextRequest } from "next/server";
import { getJob, subscribeJob } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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

    // Support JSON polling when requested via query (?format=json) or Accept header
    const url = new URL(req.url);
    const wantsJson =
      url.searchParams.get("format") === "json" ||
      (req.headers.get("accept") || "").includes("application/json");
    if (wantsJson) {
      return new Response(JSON.stringify(job), {
        status: 200,
        headers: { "content-type": "application/json", "x-request-id": requestId },
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
        // Close on client abort using request signal (NextRequest supports AbortSignal)
        req.signal.addEventListener("abort", () => {
          unsub();
          try {
            controller.close();
          } catch {}
        });
      },
    });
    return new Response(rs, {
      status: 200,
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "x-request-id": requestId,
      },
    });
  } catch {
    const requestId = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { "content-type": "application/json", "x-request-id": requestId },
    });
  }
}
