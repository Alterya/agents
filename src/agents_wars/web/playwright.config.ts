import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  retries: 1,
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command:
      "E2E_MODE=1 NEXT_PUBLIC_E2E_MODE=1 NEXT_PUBLIC_DISABLE_3D=1 ALLOWED_MODELS=gpt-4o-mini npm run build && NEXT_PUBLIC_E2E_MODE=1 NEXT_PUBLIC_DISABLE_3D=1 ALLOWED_MODELS=gpt-4o-mini next start -p 3001",
    url: "http://localhost:3001",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
