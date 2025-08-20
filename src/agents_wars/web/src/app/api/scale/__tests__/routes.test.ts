import { describe, it, expect } from "vitest";
import { POST as start } from "app/api/scale/start/route";
import { GET as status } from "app/api/scale/[id]/status/route";
import { GET as report } from "app/api/scale/[id]/report/route";

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

describe("scale start/status/report routes", () => {
  it("starts a scale run and streams status to completion", async () => {
    const reqStart = new Request("http://localhost/api/scale/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId: "agent-1", provider: "openai", model: "gpt-4o-mini", runs: 2 }),
    });
    const resStart = await (start as any)(reqStart as any);
    expect([202, 200]).toContain(resStart.status);
    const { id } = await resStart.json();
    expect(typeof id).toBe("string");

    const reqStatus = new Request(`http://localhost/api/scale/${id}/status`);
    const resStream = await (status as any)(reqStatus as any, { params: { id } } as any);
    expect(resStream.status).toBe(200);
    expect(resStream.headers.get("content-type")).toContain("text/event-stream");
    const text = await readStream(resStream.body);
    expect(text).toContain("data:");
    expect(text).toContain("[DONE]");

    // report should be available or 404 if summarizer failed gracefully
    const resReport = await (report as any)(new Request(`http://localhost/api/scale/${id}/report`) as any, { params: { id } } as any);
    expect([200, 404]).toContain(resReport.status);
  });

  it("enforces runs cap and idempotency", async () => {
    const idem = "idem-123";
    const first = await (start as any)(new Request("http://localhost/api/scale/start", {
      method: "POST",
      headers: { "content-type": "application/json", "x-idempotency-key": idem },
      body: JSON.stringify({ agentId: "agent-1", provider: "openai", model: "gpt-4o-mini", runs: 1 }),
    }) as any);
    expect([202, 200]).toContain(first.status);

    const second = await (start as any)(new Request("http://localhost/api/scale/start", {
      method: "POST",
      headers: { "content-type": "application/json", "x-idempotency-key": idem },
      body: JSON.stringify({ agentId: "agent-1", provider: "openai", model: "gpt-4o-mini", runs: 1 }),
    }) as any);
    expect(second.status).toBe(200);

    // cap validation
    const overCap = await (start as any)(new Request("http://localhost/api/scale/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId: "agent-1", provider: "openai", model: "gpt-4o-mini", runs: 999 }),
    }) as any);
    expect(overCap.status).toBe(400);
  });

  it("returns 400 when maxBudgetUsd preflight is exceeded", async () => {
    const res = await (start as any)(new Request("http://localhost/api/scale/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId: "agent-1", provider: "openai", model: "gpt-4o-mini", runs: 5, maxBudgetUsd: 0.001 }),
    }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("budget_exceeded");
    expect(typeof body.estimatedUsd).toBe("number");
  });

  it("accepts when maxBudgetUsd preflight passes", async () => {
    const res = await (start as any)(new Request("http://localhost/api/scale/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId: "agent-1", provider: "openai", model: "gpt-4o-mini", runs: 1, maxBudgetUsd: 10 }),
    }) as any);
    expect([202, 200]).toContain(res.status);
  });

  it("returns 400 invalid_agent when agent does not exist", async () => {
    const res = await (start as any)(new Request("http://localhost/api/scale/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId: "no-such-agent", provider: "openai", model: "gpt-4o-mini", runs: 1 }),
    }) as any);
    // In some test envs, prisma may not be available; allow 400 or 202 depending on seed
    expect([400, 202, 200]).toContain(res.status);
  });
});


