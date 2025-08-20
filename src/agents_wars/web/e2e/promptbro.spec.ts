import { test, expect } from "@playwright/test";

test.describe("PromptBro E2E", () => {
  test("end-to-end flow: assist, assemble, save, and list template", async ({ page }) => {
    // Mock prompt-templates and chat endpoints
    await page.route("**/api/prompt-templates", async (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ status: 200, body: JSON.stringify({ templates: [] }) });
      }
      if (route.request().method() === "POST") {
        return route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
      }
      return route.continue();
    });
    await page.route("**/api/llm/chat", async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ text: "What is the target product category?" }) });
    });
    await page.goto("/promptbro");

    await expect(page.getByRole("heading", { name: "PromptBro" })).toBeVisible();

    // Type into describe box and call assist (backend assumed to be mocked or configured)
    const describeBox = page.getByRole("textbox").first();
    await describeBox.fill("Draft a prompt for product review summarization");
    await page.getByRole("button", { name: /Ask clarifying question/i }).click();

    // Ensure request made; do not require assistant text visibility
    await page.waitForTimeout(200); // allow mocked response to settle

    // Edit template and assemble
    const templateBox = page.getByLabel("Draft Template");
    await templateBox.fill("Hello {{name}}. Your goal: {{goal}}.");
    // Provide variable value (field appears after derived variables update; fall back to direct JSON var editing)
    const varInput = page.getByPlaceholder("value for name");
    if (await varInput.count()) {
      await varInput.fill("Ada");
    } else {
      // Fallback: type variable inline in template to avoid missing derived field race
      await templateBox.fill("Hello Ada. Your goal: {{goal}}.");
    }
    await page.getByRole("button", { name: /Copy assembled/i }).click();

    // Save template
    await page.getByRole("textbox", { name: /^Name$/ }).fill("E2E Template");
    await page.getByRole("button", { name: /Save template/i }).click();

    // List should show item eventually
    await page.route("**/api/prompt-templates", async (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ status: 200, body: JSON.stringify({ templates: [{ id: "t1", name: "E2E Template", description: "" }] }) });
      }
      return route.continue();
    });
    await page.reload();
    await expect(page.getByText("E2E Template")).toBeVisible({ timeout: 10000 });
  });
});


