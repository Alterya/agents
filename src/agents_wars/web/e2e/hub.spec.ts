import { test, expect } from "@playwright/test";

test("/hub can start and render a session card with status", async ({ page }) => {
  // Deterministic backend via route intercepts
  await page.route("**/api/agents", async (route) => {
    await route.fulfill({ status: 200, body: JSON.stringify({ items: [{ id: "a1", name: "Agent One" }] }) });
  });
  await page.route("**/api/config/provider-status", async (route) => {
    await route.fulfill({ status: 200, body: JSON.stringify({ allowedModels: ["gpt-4o", "gpt-4o-mini"], openaiConfigured: true, openrouterConfigured: true }) });
  });
  await page.route("**/api/battles/start", async (route) => {
    await route.fulfill({ status: 202, body: JSON.stringify({ id: "job-1", status: "pending" }) });
  });
  await page.route("**/api/battles/job-1/status?format=json", async (route) => {
    await route.fulfill({ status: 200, body: JSON.stringify({ id: "job-1", type: "battle", status: "succeeded", updatedAt: Date.now(), data: { endedReason: "goal", conversationId: "c1" } }) });
  });
  await page.route("**/api/battles/c1/messages**", async (route) => {
    await route.fulfill({ status: 200, body: JSON.stringify({ items: [{ id: "m1", role: "assistant", content: "done", createdAt: new Date().toISOString() }] }) });
  });

  await page.goto("/hub");
  await expect(page.getByRole("heading", { name: /agent wars hub/i })).toBeVisible();

  // Fill minimal fields and start
  await page.getByTestId("agent-id").selectOption("a1");
  // Select model via ProviderModelSelector when whitelist present
  await page.getByTestId("pms-model").selectOption("gpt-4o");
  await page.getByTestId("start").click();

  // Expect a session card to appear with a status line, then terminal outcome
  await expect(page.getByText(/Status:/i)).toBeVisible();
});


