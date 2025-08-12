---
title: Research Session
query: "E2E testing for Next.js (2025): Playwright vs Cypress, Lighthouse CI for performance; recommended setup for App Router and SSR/Edge routes; accessibility testing (axe)."
date: 8/12/2025
time: 11:23:29 AM
timestamp: 2025-08-12T08:23:29.128Z
exchanges: 1
---

# Research Session

## Initial Query

**Question:** E2E testing for Next.js (2025): Playwright vs Cypress, Lighthouse CI for performance; recommended setup for App Router and SSR/Edge routes; accessibility testing (axe).

**Response:**

Below is a practical, 2025-ready testing stack and implementation playbook for a Next.js App Router app with SSR/Edge routes like yours. It covers Playwright vs Cypress, Lighthouse CI for performance budgets, and accessibility testing with axe, and maps the guidance onto your concrete pages (/ for 3D hero and graph, /hub, /scale, /promptbro) and API route handlers under app/api. It also includes CI-ready snippets and project-specific tips for mocking LLM providers, stabilizing visuals, and testing streaming.

Executive summary and recommendation
- Choose Playwright for E2E, API, and visual regression testing.
  - Why: Cross-browser (Chromium, WebKit, Firefox) including WebKit which is valuable for catching Safari issues (3D/Canvas, pointer events). Excellent auto-waiting, robust tracing, built-in visual diffs, parallelization out of the box, easy CI sharding, and first-class request testing for API endpoints. It also has an official @axe-core/playwright integration for a11y checks.
- Keep Cypress optionally for component tests only if your team prefers its dev UX. For E2E, Playwright is stronger for this project’s needs (App Router, SSR/Edge, visual diffs, Lighthouse CI integration strategy).
- Use Lighthouse CI (lhci) to enforce performance budgets on:
  - / (3D hero + node graph)
  - /hub
  - /scale
  - /promptbro
  Set mobile emulation with Fast 3G, assert TBT, TTI, FCP, LCP, CLS thresholds.
- Integrate accessibility checks via @axe-core/playwright in the Playwright suite. Gate PRs on zero serious/critical violations, and log moderate violations as warnings initially to avoid blocking progress on purely decorative 3D items.

Playwright vs Cypress in 2025: what matters for this project
- Browser coverage:
  - Playwright: Chromium, Firefox, WebKit (Safari engine). Important for 3D canvas + touch/hover + reduced-motion behaviors.
  - Cypress: Chromium/Firefox officially; no WebKit. Safari-specific regressions would be missed.
- Speed, reliability, and waits:
  - Playwright: Automatic waits on navigations, network idleness, element state; faster headless mode; fewer flake sources in SSR/Edge apps.
  - Cypress: Good DX but flakier on dynamic pages and transitions; single-tab architecture can clash with streaming/long-polling.
- Visual snapshots:
  - Playwright: expect(page).toHaveScreenshot() built-in; masking, animations control, and per-project baselines supported.
  - Cypress: Requires plugin (e.g., cypress-image-snapshot) and more manual setup.
- API testing:
  - Playwright: APIRequestContext is robust for route handlers (Edge/Node) without browser boot.
  - Cypress: cy.request works but lacks the isolation and rich fixtures of Playwright’s request context.
- Parallelization and CI:
  - Playwright: Built-in parallelism and sharding (–shard), per-project concurrency, trace artifacts.
  - Cypress: Reliable, but optimal parallelism via Dashboard (paid) for load balancing; OSS users can parallel via matrix but with manual balancing.
- Recommendation: Use Playwright across E2E/API/visual. If your team already loves Cypress for component/unit tests, keep it there; otherwise, keep unit tests in Vitest and use Playwright only for E2E/API/visual.

Project-wide testing architecture
- Unit/contract tests (Vitest): Tasks 1 and 2 (Prisma models, provider abstraction).
- Integration tests (Vitest + Next.js route handlers in Node, or Playwright request context): Summarizer prompt builder, RunReport shape, provider adapter request mapping.
- E2E + visual (Playwright):
  - User flows: /hub concurrency, /scale batch runs and revised prompt, /promptbro wizard, homepage navigation via graph nodes.
  - Visual snapshot diff specifically for the hero and graph areas; mask 3D canvas or freeze animation.
- Accessibility (axe via Playwright): Run a11y scans on all main pages.
- Performance (Lighthouse CI): PR check with budgets; nightly scheduled run for drift.

Playwright setup for Next.js App Router (SSR/Edge)
1) Install and scaffold
- pnpm add -D @playwright/test @axe-core/playwright
- npx playwright install --with-deps
- Create tests in tests/e2e and tests/api

2) Scripts (package.json)
- "build": "next build"
- "start": "next start -p 3000"
- "test:e2e": "playwright test"
- "test:e2e:ui": "playwright test --ui"
- "test:e2e:update": "playwright test --update-snapshots"

3) playwright.config.ts (App Router-friendly, production server in CI)
import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PORT || '3000';
const BASE_URL = process.env.BASE_URL || `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
    // Optional mobile view for / (hero perf & layout)
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: process.env.CI
      ? 'pnpm build && pnpm start'
      : 'pnpm start',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NODE_ENV: 'production',
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://localhost:5433/app_test',
      E2E_FAKE_PROVIDER: '1', // force fake LLM provider responses in tests
      TEST_MODE: '1',         // freeze animations, deterministic seeds
    },
  },
});

Notes:
- Prefer next start (production) for stability and to exercise SSR/Edge as deployed. Use next dev locally only for debugging.
- Set TEST_MODE=1 to disable or freeze 3D animation and deterministic graph layout to avoid snapshot flake.
- Set E2E_FAKE_PROVIDER=1 so your app’s provider abstraction returns fixtures, not real API calls (aligns with Task 2 test strategy).
- For Edge route handlers (runtime: 'edge'), Next runs them via the Next server; you don’t need a separate edge runtime in tests.

4) Shared test utilities (tests/utils.ts)
- Provide helpers for:
  - seeding DB via a POST /api/test/seed (only in TEST_MODE)
  - clearing DB between tests
  - a11y scan function
- Use test.use({ colorScheme: 'light', reducedMotion: 'reduce' }) where appropriate to stabilize visuals.

Testing SSR pages and Edge/Route Handlers
- Full-page SSR tests:
  - Use page.goto('/hub') and assert initial network quietness: await page.waitForLoadState('networkidle').
  - Test edge cases: bad query params, empty states, large run counts with cap enforced.
- API route handlers (Node and Edge runtimes):
  - Favor request context tests to keep them fast and isolated:
    import { test, expect, request } from '@playwright/test';

    test('start scale run returns runId', async ({ playwright }) => {
      const ctx = await request.newContext({ baseURL: process.env.BASE_URL });
      const res = await ctx.post('/api/scale/start', {
        data: { provider: 'openai', model: 'gpt-4o-mini', runCount: 3 }
      });
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.runId).toMatch(/^[a-z0-9_-]{6,}$/i);
    });

  - Streaming endpoints (SSE/Fetch streams): Use APIRequestContext.fetch() and read the stream via await res.body(); if your endpoint streams text/event-stream, consider testing at the browser level reading from page.evaluate(async () => { const r = await fetch('/api/stream'); const reader = r.body.getReader(); ... }).
- Edge runtime pitfalls:
  - Avoid Node APIs in edge routes (Buffer, fs). Unit-test route logic with Web Standard APIs (Request/Response).
  - If a route must be tested under real edge infra, complement with deployment smoke tests (optional). For CI E2E, Next’s in-process edge emulation is sufficient.

Mocking backend and provider abstraction (critical for Tasks 5, 6, 7)
- Prefer running your Next server with E2E_FAKE_PROVIDER=1 and feature flags in route handlers to return deterministic fixtures for:
  - /api/battles/start, /api/battles/:jobId/status
  - /api/battles/:conversationId/messages
  - /api/scale/start, /api/scale/:runId/status, /api/scale/:runId/report
  - /api/promptbro/assist
- Where needed, intercept at the test level:
  await page.route('**/api/scale/*', route => {
    if (route.request().url().endsWith('/status')) {
      return route.fulfill({ status: 200, body: JSON.stringify({ progress: 100, runs: [/*...*/] }) });
    }
    route.continue();
  });
- To validate your LLM adapter mapping (Task 2), keep a separate Vitest contract test suite with snapshot-testing of request/response shapes. Use CI flags to run against real APIs only on demand to avoid cost.

Accessibility testing (axe) in Playwright
1) Install and wire
- Already installed: @axe-core/playwright

2) Create tests/a11y/a11y.spec.ts
import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

const checkA11y = async (page) => {
  const results = await new AxeBuilder({ page })
    .disableRules([
      // Optionally disable for 3D canvas if purely decorative
      // 'color-contrast' // consider enabling later
    ])
    .include('main') // scope scan
    .analyze();
  // Fail on serious/critical; warn on moderate/minor
  const violations = results.violations.filter(v => ['serious', 'critical'].includes(v.impact || 'minor'));
  expect(violations, JSON.stringify(results, null, 2)).toEqual([]);
};

test.describe('Accessibility', () => {
  test('Home page', async ({ page }) => {
    await page.goto('/');
    await checkA11y(page);
  });

  test('Hub page', async ({ page }) => {
    await page.goto('/hub');
    await checkA11y(page);
  });

  test('Scale page', async ({ page }) => {
    await page.goto('/scale');
    await checkA11y(page);
  });

  test('PromptBro page', async ({ page }) => {
    await page.goto('/promptbro');
    await checkA11y(page);
  });
});

3) Implementation notes for a11y:
- Ensure the 3D canvas has aria-hidden="true" and role="img" only if it’s informative; otherwise hide from assistive tech and provide alternate text nearby.
- Respect reduced motion: Use prefers-reduced-motion CSS and disable heavy animation when TEST_MODE=1.
- Radix UI (used by shadcn/ui) is a11y-friendly but verify correct aria-controls/aria-expanded on toggles and Tabs/Steps roles in /promptbro.

Visual regression testing strategy (hero + graph and summaries)
- Use Playwright snapshots for:
  - Hero section and graph: call expect(page).toHaveScreenshot('home-hero.png', { mask: [page.locator('canvas')], maxDiffPixelRatio: 0.01 });
  - Summary/revised prompt blocks (Task 6): focus a container element to limit snapshot area and keep it deterministic.
- Freeze animation in TEST_MODE=1 (e.g., scene paused, fixed camera, deterministic node graph layout seed).
- For WebKit, skip snapshots if the 3D vendor differs:
  test.skip(({ browserName }) => browserName === 'webkit', '3D canvas rendering differs on WebKit');

Lighthouse CI (performance budgets)
1) Install
- pnpm add -D @lhci/cli

2) lighthouserc.json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "startServerCommand": "pnpm build && pnpm start",
      "url": [
        "http://127.0.0.1:3000/",
        "http://127.0.0.1:3000/hub",
        "http://127.0.0.1:3000/scale",
        "http://127.0.0.1:3000/promptbro"
      ],
      "settings": {
        "preset": "mobile",
        "throttlingMethod": "simulate",
        "throttling": {
          "rttMs": 150,
          "throughputKbps": 1638.4,
          "cpuSlowdownMultiplier": 4
        },
        "screenEmulation": { "mobile": true, "width": 360, "height": 640, "deviceScaleFactor": 2, "disabled": false },
        "formFactor": "mobile"
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.85 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 3500 }],
        "total-blocking-time": ["error", { "maxNumericValue": 250 }],
        "interactive": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}

3) Budgets (optional, stricter) budgets.json
[
  {
    "path": "/*",
    "resourceSizes": [
      { "resourceType": "script", "budget": 350 },
      { "resourceType": "image", "budget": 600 }
    ],
    "timings": [
      { "metric": "interactive", "budget": 2500 },
      { "metric": "totalBlockingTime", "budget": 250 }
    ]
  }
]

Notes:
- Task 4 explicitly targets TTI < 2.5s and main-thread blocking < 250ms on Fast 3G; the above matches that.
- For 3D assets: Lazy-load R3F and graph via dynamic import in the App Router page, and ensure code-splitting; LHCI will assert improvements regressions.

GitHub Actions CI pipelines
1) E2E + a11y + visual (playwright.yml)
name: e2e
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: app_test
        ports: ['5433:5432']
        options: >-
          --health-cmd="pg_isready -U postgres" --health-interval=10s
          --health-timeout=5s --health-retries=5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - run: pnpm install --frozen-lockfile
      - name: DB migrate + seed
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5433/app_test
          TEST_MODE: 1
        run: |
          pnpm prisma migrate deploy
          pnpm tsx scripts/seed.ts
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      - name: Run Playwright tests
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5433/app_test
          E2E_FAKE_PROVIDER: 1
          TEST_MODE: 1
        run: pnpm test:e2e
      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report
      - name: Upload Playwright traces
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-traces
          path: test-results

2) Lighthouse CI (lhci.yml)
name: lhci
on:
  pull_request:
  push:
    branches: [main]
  schedule:
    - cron: '0 3 * * *' # nightly
jobs:
  lhci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: npx lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}

Page-specific E2E scenarios aligned to your tasks
- Landing page (Task 4)
  - Visual: snapshot hero and node graph with 3D canvas masked or animation frozen.
  - Navigation: click graph nodes route to /hub, /scale, /promptbro.
  - Performance: LHCI thresholds; ensure dynamic imports for R3F and force-graph.
  - Accessibility: axe scan; check semantic headings, alt text/aria-hidden for decorative elements, color contrast.
- Hub (/hub, Task 5)
  - E2E flows:
    - Form validation and model whitelist enforcement.
    - Start one battle and poll status to 100%; assert messages show and stop at goal or 25 messages.
    - Start multiple sessions concurrently; verify independent progress bars and finalization.
  - Mocking: Fake provider drives progress from 0→100 deterministically. Provide unique conversationId/jobId.
  - Edge: If any route is runtime: 'edge', also assert JSON schema via request context tests.
- Scale (/scale, Task 6)
  - Form: enforce runCount cap <= 10 and error display beyond cap.
  - Background runs: kick off N, poll /status; when complete, fetch /report and verify:
    - Failures array populated as per fixtures
    - Issues and revised prompt present and copy-to-clipboard works
  - Visual: snapshot summary card and revised prompt block.
  - Unit: Summarizer prompt builder deterministic structure (Vitest).
- PromptBro (/promptbro, Task 7)
  - Wizard flow: Steps/Tabs navigation, live preview updates, assist endpoint returns suggestion string, and saving creates PromptTemplate row.
  - Accessibility: Tabs semantics and focus management; ensure keyboard nav across steps.
  - Snapshot: preview block only (stable content).
- Shared APIs (Task 1, 2)
  - API tests (request context) for agents list, prompts CRUD, battles/scale endpoints’ happy path and error responses.
  - Provider abstraction smoke tests out-of-band (Vitest); do not call real providers in E2E unless gated.

Stabilizing 3D/graph for tests
- Use TEST_MODE=1 to:
  - Pause R3F animation loop (e.g., conditional in useFrame).
  - Fix random seeds for node graph layout (react-force-graph supports deterministic layout with a seed or by using static coordinates).
  - Disable bloom/postprocessing.
  - Reduce motion via CSS and matchMedia('(prefers-reduced-motion: reduce)') to make snapshots stable.
- In Playwright, mask selectors for inherently nondeterministic regions:
  expect(page).toHaveScreenshot('home-hero.png', {
    mask: [page.locator('canvas'), page.locator('[data-anim]')],
    fullPage: false
  });

Example Playwright tests
1) Navigation and visual on home
import { test, expect } from '@playwright/test';

test('hero renders and graph navigates', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('heading', { name: /scale/i }).waitFor();
  await expect(page.locator('main')).toHaveScreenshot('home-hero.png', {
    mask: [page.locator('canvas')]
  });

  // Click graph node that links to /hub
  await page.getByRole('link', { name: /hub/i }).click();
  await expect(page).toHaveURL(/\/hub$/);
});

2) Hub concurrent sessions
test('multiple battles run concurrently and stop at goal or cap', async ({ page }) => {
  await page.goto('/hub');
  await page.getByLabel('Provider').selectOption('openai');
  await page.getByLabel('Model').selectOption('gpt-4o-mini');
  await page.getByLabel('Agent').selectOption(/.+/);

  // Start two sessions
  await page.getByRole('button', { name: /start battle/i }).click();
  await page.getByRole('button', { name: /start battle/i }).click();

  // Poll progress bars
  await expect(page.getByTestId('session-0-progress')).toHaveAttribute('aria-valuenow', '100', { timeout: 30_000 });
  await expect(page.getByTestId('session-1-progress')).toHaveAttribute('aria-valuenow', '100', { timeout: 30_000 });

  // Messages fetched and either goalReached or messageCount === 25
  const meta0 = page.getByTestId('session-0-meta');
  await expect(meta0).toContainText(/(goal reached|25\/25)/i);
});

3) Scale cap enforcement and summary snapshot
test('scale cap enforced and summary renders', async ({ page }) => {
  await page.goto('/scale');
  await page.getByLabel('Run count').fill('11');
  await page.getByRole('button', { name: /start/i }).click();
  await expect(page.getByRole('alert')).toContainText(/cap .* 10/i);

  await page.getByLabel('Run count').fill('3');
  await page.getByRole('button', { name: /start/i }).click();

  // Wait for complete (fake provider returns quickly)
  await page.getByText(/all runs complete/i).waitFor({ timeout: 20_000 });
  const summary = page.getByTestId('run-summary');
  await expect(summary).toHaveScreenshot('scale-summary.png');
  await expect(page.getByRole('button', { name: /copy revised prompt/i })).toBeEnabled();
});

4) PromptBro wizard and assist
test('promptbro wizard completes and saves', async ({ page }) => {
  await page.goto('/promptbro');

  await page.fill('[name="context"]', 'Build an E2E test plan for a Next.js app');
  await page.click('text=Next'); // Constraints
  await page.fill('[name="constraints"]', 'Use Playwright and Lighthouse CI');

  await page.click('text=Ask for help');
  await expect(page.getByTestId('assist-output')).toContainText(/consider accessibility/i);

  await page.click('text=Save template');
  await expect(page.getByText(/template saved/i)).toBeVisible();
});

Database and data lifecycle in E2E
- Use a dedicated test database and migrations per run:
  - In CI: Postgres service container, run prisma migrate deploy and seed.
  - Locally: Docker compose or Neon branch DB.
- Add a test-only /api/test/reset endpoint (guarded by TEST_MODE) to clear tables for repeatable tests, or wrap tests in transactions if it fits your app model.

Common pitfalls and how to avoid them
- Flaky snapshots due to animations: Always freeze or mask. Prefer reducedMotion in tests.
- Slow LHCI on PRs: Limit to 3 runs per URL and 4 URLs; schedule nightly full runs. Only block on critical assertions (TBT, TTI).
- Edge route Node-only code: Keep Edge routes free of Node APIs. If unavoidable, make them Node runtime routes.
- Provider costs in tests: Always gate real external calls behind CI flags; default to fixtures.
- WebKit rendering differences: Mask 3D canvas; skip or loosen diffs for WebKit. Keep functional tests cross-browser; visual tests on Chromium-only unless there’s a Safari-specific bug to catch.

How this aligns with your tasks
- Task 4 (Landing Page):
  - Playwright visual snapshot + navigation tests.
  - LHCI thresholds enforced in PRs.
  - Axe scans ensure minimum a11y quality.
- Task 5 (Hub):
  - E2E with fake provider: concurrent sessions, polling, and stop conditions.
  - API request-context tests for status/message endpoints.
- Task 6 (Scale):
  - E2E verifies cap ≤ 10, progress UI, summary rendering, revised prompt block snapshot, and copy button behavior.
  - Unit tests for summarizer prompt builder (Vitest), integration for end-to-end mocked scale run storing conversations and RunReport.
- Task 7 (PromptBro):
  - E2E wizard flow with assist route and template save.
  - Axe ensures tab semantics and keyboard navigation are correct.
- Task 2 (Provider abstraction):
  - Contract/unit tests in Vitest; E2E uses fake provider flag.
- Task 1 (DB/Prisma):
  - CI service container for Postgres; migrate + seed; data reset strategy for deterministic E2E runs.

Optional enhancements
- Record HARs of /api responses in local dev and replay in CI to remove server dependencies for a subset of tests (Playwright’s routeFromHAR).
- Use Playwright test projects to separate suites: e2e-chromium, visual-chromium, a11y, api. This allows different timeouts and artifacts per suite.
- Add GitHub PR annotations from LHCI and Playwright (e.g., link to trace viewer and report artifacts).
- Add a Performance Budget to webpack/Next via performance.hints and source-map-explorer or bundle analyzer to catch bundle bloat before LHCI does.

With this setup, you’ll have a cohesive, maintainable testing strategy that specifically addresses Next.js App Router realities, SSR/Edge routes, heavy front-end visuals, and the LLM-centric backend flows your project requires.


---

*Generated by Task Master Research Command*  
*Timestamp: 2025-08-12T08:23:29.128Z*
