import { NextRequest } from "next/server";
import { cancelJob, getJobStatus } from "@/lib/jobs/queue";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  if (!jobId) {
    return new Response(JSON.stringify({ error: "missing_jobId" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const ok = cancelJob(jobId);
  if (!ok) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }
  const status = getJobStatus(jobId);
  return new Response(JSON.stringify({ jobId, status }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
