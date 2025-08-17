import { test, expect } from "@playwright/test";

test("/hub can start and show stream output placeholder", async ({ page }) => {
  await page.goto("/hub");
  await expect(page.getByRole("heading", { name: /agent wars hub/i })).toBeVisible();

  await page.getByTestId("agent-id").fill("agent-1");
  await page.getByTestId("model").fill("gpt-4o");
  await page.getByTestId("start").click();

  // We can't guarantee live SSE in CI, but we expect the stream area to exist
  await expect(page.getByTestId("stream")).toBeVisible();
});


