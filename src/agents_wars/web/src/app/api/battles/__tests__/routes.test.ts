import { describe, it, expect } from "vitest";
import { POST as start } from "../../../../../app/api/battles/start/route";
import { GET as stream } from "../../../../../app/api/battles/stream/route";
import { GET as status } from "../../../../../app/api/battles/status/route";
import { POST as cancel } from "../../../../../app/api/battles/cancel/route";

async function readStream(body: ReadableStream<Uint8Array> | null): Promise<string> {
  if (!body) return "";
  const reader = body.getReader();
  const dec = new TextDecoder();
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) out += dec.decode(value, { stream: true });
  }
  out += new TextDecoder().decode();
  return out;
}

describe("battles start/stream routes", () => {
  it("starts a job and streams deltas then [DONE]", async () => {
    const reqStart = new Request("http://localhost/api/battles/start", { method: "POST" });
    const resStart = await start(reqStart as any);
    expect(resStart.status).toBe(200);
    const { jobId } = await resStart.json();
    expect(typeof jobId).toBe("string");

    const reqStream = new Request(`http://localhost/api/battles/stream?jobId=${jobId}`);
    const resStream = await stream(reqStream as any);
    expect(resStream.status).toBe(200);
    expect(resStream.headers.get("content-type")).toContain("text/event-stream");
    const text = await readStream(resStream.body);
    expect(text).toContain("delta");
    expect(text).toContain("[DONE]");
  });

  it("cancels a running job and reports status", async () => {
    const resStart = await start(
      new Request("http://localhost/api/battles/start", { method: "POST" }) as any,
    );
    const { jobId } = await resStart.json();

    const resStatus1 = await status(
      new Request(`http://localhost/api/battles/status?jobId=${jobId}`) as any,
    );
    expect(resStatus1.status).toBe(200);

    const resCancel = await cancel(
      new Request(`http://localhost/api/battles/cancel?jobId=${jobId}`, { method: "POST" }) as any,
    );
    expect(resCancel.status).toBe(200);

    const resStatus2 = await status(
      new Request(`http://localhost/api/battles/status?jobId=${jobId}`) as any,
    );
    expect(resStatus2.status).toBe(200);
  });
});
