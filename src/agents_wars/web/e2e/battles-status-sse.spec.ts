import { test, expect } from "@playwright/test";

test("status SSE streams DONE marker", async ({}, testInfo) => {
  // This is a smoke test that hits API endpoints directly via fetch.
  // It assumes the dev server would proxy to these route handlers; here we use absolute URLs.
  const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

  // Skip gracefully if server is not running
  try {
    await fetch(`${base}/api/config/provider-status`);
  } catch {
    test.skip(true, "Server not running; skipping SSE smoke test");
    return;
  }

  // Start a job
  const startRes = await fetch(`${base}/api/battles/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ agentId: "agent-1", provider: "openai", model: "gpt-4o" }),
  });
  expect(startRes.status).toBeGreaterThanOrEqual(200);
  const { id } = await startRes.json();
  expect(id).toBeTruthy();

  // Connect to SSE stream and read for a short time; ensure DONE appears eventually
  const res = await fetch(`${base}/api/battles/${id}/status`, {
    headers: { accept: "text/event-stream" },
  });
  expect(res.status).toBe(200);
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) buf += dec.decode(value, { stream: true });
    if (buf.includes("[DONE]")) break;
  }
  expect(buf).toContain("[DONE]");
});
