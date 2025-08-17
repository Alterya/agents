import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("a11y: home page has no serious violations", async ({ page }) => {
  await page.goto("/");
  // Wait for key sections
  await expect(page.getByRole("heading", { name: /agent wars/i })).toBeVisible();
  await expect(page.locator("[data-testid='capabilities-graph']")).toBeVisible();

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"]) 
    .analyze();

  const serious = accessibilityScanResults.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious, JSON.stringify(serious, null, 2)).toHaveLength(0);
});


