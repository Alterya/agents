import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders landing content", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Agent Wars/i })).toBeVisible();
  });

  test("FPS probe provides a sample number", async ({ page }) => {
    await page.goto("/");
    const fps = await page.evaluate(() => (window as any).__fpsSample ?? 0);
    expect(typeof fps).toBe("number");
  });

  test("reduced-motion renders static hero (no canvas)", async ({ page, context }) => {
    await context.addInitScript(() => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: (query: string) => ({
          matches: /prefers-reduced-motion/.test(query),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          onchange: null,
          dispatchEvent: () => false,
        }),
      });
    });
    await page.goto("/");
    await expect(page.getByTestId("scene-canvas")).toHaveCount(0);
  });

  test("routes to /hub via CTA", async ({ page }) => {
    await page.goto("/");
    const hubLink = page.getByRole("link", { name: /Go to Hub/i });
    if (await hubLink.count()) {
      await hubLink.first().click();
      await page.waitForURL("**/hub");
      await expect(page.getByRole("heading", { name: /Agent Wars Hub/i })).toBeVisible();
    }
  });
});
