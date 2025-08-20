import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("a11y: scale page has no serious violations", async ({ page }) => {
  await page.goto("/scale");
  await expect(page.getByRole("heading", { name: /Scale Testing/i })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"]) 
    .analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious, JSON.stringify(serious, null, 2)).toHaveLength(0);
});


