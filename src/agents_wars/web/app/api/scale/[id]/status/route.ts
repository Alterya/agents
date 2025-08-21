import { NextRequest } from "next/server";
import { getJob, subscribeJob } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  const encoder = new TextEncoder();
  const rs = new ReadableStream<Uint8Array>({
    start(controller) {
      async function emit() {
        let j = getJob(id);
        // Fallback: read from DB if in-memory job evicted or server restarted
        if (!j) {
          let report: any = null;
          if (process.env.E2E_MODE === "1" || process.env.LOCAL_MODE === "1") {
            report = (globalThis as any).__run_reports?.get?.(id) ?? null;
          } else {
            report = await prisma.runReport.findUnique({ where: { runId: id } });
          }
          if (report) {
            j = {
              id,
              type: "scale",
              status: "succeeded",
              data: {
                runId: report.runId,
                total: report.runCount,
                succeeded: (report.stats as any)?.succeeded ?? undefined,
                failed: (report.stats as any)?.failed ?? undefined,
                conversationIds: (report.stats as any)?.conversationIds ?? undefined,
              },
              createdAt: Date.now(),
              updatedAt: Date.now(),
            } as any;
          }
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(j)}\n\n`));
        if (!j || j.status === "succeeded" || j.status === "failed") {
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        }
      }
      emit();
      const unsub = subscribeJob(id, () => emit());
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
    },
  });
}
