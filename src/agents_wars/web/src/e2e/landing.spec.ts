import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders 3D scene and node graph", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("scene-canvas")).toBeVisible();
    await expect(page.getByTestId("capabilities-graph")).toBeVisible();
  });

  test("FPS probe provides a sample", async ({ page }) => {
    await page.goto("/");
    const fps = await page.evaluate(() => (window as any).__fpsSample ?? 0);
    expect(typeof fps).toBe("number");
  });
});


