import { test, expect } from "@playwright/test";

test.describe("Scale page", () => {
  test("runs a small batch and renders final report", async ({ page }) => {
    // Intercepts to avoid DB and make deterministic
    await page.route("**/api/agents", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ items: [{ id: "a1", name: "Agent One" }] }),
      });
    });
    await page.route("**/api/config/provider-status", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ allowedModels: ["gpt-4o-mini"] }),
      });
    });
    await page.route("**/api/scale/start", async (route) => {
      await route.fulfill({
        status: 202,
        body: JSON.stringify({ id: "run-1", status: "pending" }),
      });
    });
    await page.route("**/api/scale/run-1/status", async (route) => {
      // Emit a terminal SSE and then [DONE]
      const sse = [
        'data: {"id":"run-1","type":"scale","status":"succeeded","data":{"total":2,"succeeded":2,"failed":0}}\n\n',
        "data: [DONE]\n\n",
      ].join("");
      await route.fulfill({
        status: 200,
        headers: { "content-type": "text/event-stream" },
        body: sse,
      });
    });
    await page.route("**/api/scale/run-1/report", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          summary: "Batch complete",
          revisedPrompt: "do X better",
          stats: { total: 2, succeeded: 2, failed: 0, actualUsd: 0.001 },
        }),
      });
    });
    // Navigate to /scale
    await page.goto("/scale");
    await expect(page.locator("h1")).toHaveText(/Scale Testing/i);

    // Wait until Run Report appears and revised prompt is rendered
    const reportHeading = page.getByText("Run Report");
    await reportHeading.waitFor({ state: "attached", timeout: 30000 });
    await reportHeading.scrollIntoViewIfNeeded();
    await expect(reportHeading).toBeVisible();
    await expect(page.getByText("E2E revised prompt")).toBeVisible();

    // Copy buttons visible when report present
    const copyButtons = page.getByRole("button", { name: /Copy (prompt|rationale)/i });
    await expect(copyButtons.first()).toBeVisible();
  });
});
