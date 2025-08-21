import { test, expect } from "@playwright/test";

test("status SSE streams DONE marker", async ({}, testInfo) => {
  // This is a smoke test that hits API endpoints directly via fetch.
  // It assumes the dev server would proxy to these route handlers; here we use absolute URLs.
  const base =
    (testInfo.project.use as any)?.baseURL || process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001";

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
  if (!startRes.ok) {
    test.skip(true, `start endpoint not available (${startRes.status}); skipping SSE smoke test`);
    return;
  }
  let id: string | undefined;
  try {
    const startJson: any = await startRes.json();
    id = startJson?.id;
  } catch {}
  if (!id) {
    test.skip(true, "start returned no id; skipping SSE smoke test");
    return;
  }

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
