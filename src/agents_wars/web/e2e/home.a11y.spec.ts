import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("a11y: home page has no serious violations", async ({ page }) => {
  await page.goto("/");
  // Wait for key header only (graph may be disabled in E2E env)
  await expect(page.getByRole("heading", { name: /agent wars/i })).toBeVisible();

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();

  const serious = accessibilityScanResults.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious, JSON.stringify(serious, null, 2)).toHaveLength(0);
});
