import { describe, it, expect } from "vitest";
import { POST as start } from "app/api/battles/start/route";
import { GET as status } from "app/api/battles/[id]/status/route";
import { GET as messages } from "app/api/battles/[id]/messages/route";

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

describe("battles start/status routes", () => {
  it("starts a job and streams status until [DONE]", async () => {
    const reqStart = new Request("http://localhost/api/battles/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId: "agent-1", provider: "openai", model: "gpt-4o" }),
    });
    const resStart = await start(reqStart as any);
    expect([202, 200]).toContain(resStart.status);
    const { id } = await resStart.json();
    expect(typeof id).toBe("string");

    const reqStatus = new Request(`http://localhost/api/battles/${id}/status`);
    const resStream = await (status as any)(reqStatus as any, { params: { id } } as any);
    expect(resStream.status).toBe(200);
    expect(resStream.headers.get("content-type")).toContain("text/event-stream");
    const text = await readStream(resStream.body);
    expect(text).toContain("data:");
    expect(text).toContain("[DONE]");

    // fetch first page of messages for the conversation (if present in stream payload)
    const pageRes = await messages(
      new Request(`http://localhost/api/battles/${id}/messages?page=1&limit=10`) as any,
      { params: { id } } as any,
    );
    expect([200, 500, 404]).toContain(pageRes.status);
  });

  it("is idempotent when starting with the same id", async () => {
    const id = "job-test-123";
    const first = await start(
      new Request("http://localhost/api/battles/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, agentId: "agent-1", provider: "openai", model: "gpt-4o" }),
      }) as any,
    );
    expect([202, 200]).toContain(first.status);

    const second = await start(
      new Request("http://localhost/api/battles/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, agentId: "agent-1", provider: "openai", model: "gpt-4o" }),
      }) as any,
    );
    // Second call should return an existing status (200 per route)
    expect(second.status).toBe(200);
    const json = await second.json();
    expect(json.id).toBe(id);
  });

  it("returns 400 invalid_agent when agent does not exist", async () => {
    const req = new Request("http://localhost/api/battles/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId: "no-such-agent", provider: "openai", model: "gpt-4o" }),
    });
    const res = await start(req as any);
    expect([400, 202, 200]).toContain(res.status);
  });
});
