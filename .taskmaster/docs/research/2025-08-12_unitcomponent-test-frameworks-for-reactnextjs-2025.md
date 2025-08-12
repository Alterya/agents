---
title: Research Session
query: "Unit/component test frameworks for React/Next.js (2025): Vitest vs Jest, React Testing Library status, @testing-library/jest-dom, MSW for network mocking; snapshot and DOM testing best practices."
date: 8/12/2025
time: 11:19:54 AM
timestamp: 2025-08-12T08:19:54.134Z
exchanges: 1
---

# Research Session

## Initial Query

**Question:** Unit/component test frameworks for React/Next.js (2025): Vitest vs Jest, React Testing Library status, @testing-library/jest-dom, MSW for network mocking; snapshot and DOM testing best practices.

**Response:**

Overview and recommendation (2025)
- For a modern Next.js (App Router) + React 18 project, the most ergonomic stack for unit and component tests in 2025 is:
  - Vitest for test runner + assertion + mocking (fast, ESM-first, TypeScript-native, watch-friendly).
  - React Testing Library (RTL) + @testing-library/user-event for DOM-centric component tests.
  - @testing-library/jest-dom matchers (use the vitest entrypoint) to get rich, readable DOM assertions.
  - MSW v2 for network mocking in both unit/integration tests and during local dev for realistic API behavior.
- Jest remains totally viable and mature, especially if you need features like mocking Node’s built-in modules in older setups or rely on existing Jest-specific tooling. But for a Next.js app that also uses Vite in other parts or values test speed and ESM, Vitest is the better default in 2025.
- For this project’s tasks (Scale Testing page, Agent Wars Hub, PromptBro, DB repos, and marketing/3D page), Vitest + RTL + MSW integrates cleanly with Next.js, Prisma, and Playwright (which you’re already planning for visual and e2e). Use Playwright for full-browser flows and screenshots; use Vitest + RTL for component and integration tests in jsdom.

Vitest vs Jest for Next.js
- Speed and DX:
  - Vitest is generally faster (ESM, Vite-powered transform, multi-threaded). Expect better watch performance and less config.
  - Jest has improved ESM support but still incurs transform overhead in TS-heavy projects. Startup and watch can be slower.
- TypeScript and ESM:
  - Vitest handles TS and ESM out of the box. Jest typically needs Babel or ts-jest/ESM config fiddling.
- Mocking:
  - Both have capable mocking. Vitest’s vi.mock() API is Jest-like. It also supports spyOn, timers, and module mocks.
  - If you have a deep ecosystem of Jest-only plugins, consider sticking with Jest. For most web apps in 2025, Vitest APIs cover needs.
- Environment:
  - Both support jsdom. Vitest’s test.environment = 'jsdom' works well for RTL. Vitest also runs cleanly in Node for server-side tests.
- Next.js integration:
  - Jest has next/jest to preset transforms and handle Next’s SWC pipeline. If you choose Jest, use that preset.
  - Vitest works fine without a Next-specific preset when you alias Next modules that need stubbing, and set up jsdom and polyfills. This is the approach recommended below.
- Coverage:
  - Both produce coverage via v8/istanbul. Vitest uses c8 under the hood; Jest has built-in coverage. Both output LCOV/HTML.
- Bottom line:
  - Pick Vitest unless you have strong Jest lock-in. The rest of this guide assumes Vitest; Jest equivalents are called out where behavior differs.

Project-appropriate package versions (baseline)
- vitest: 1.x (or latest stable)
- @testing-library/react: 14.x (React 18+)
- @testing-library/user-event: 14.x
- @testing-library/jest-dom: 6.x
- msw: 2.x
- jsdom: 22+ (installed implicitly via Vitest peer; pin if needed for consistency)
- whatwg-fetch or cross-fetch (optional; jsdom + MSW generally cover fetch usage)

Setting up Vitest + RTL + jest-dom in Next.js (App Router)
- Install dev deps:
  - pnpm add -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom msw
- vitest.config.ts (jsdom for components; alias Next modules that don’t run in test; include setup file):
  - import { defineConfig } from 'vitest/config'
  - import path from 'node:path'
  - export default defineConfig({
      test: {
        environment: 'jsdom',
        setupFiles: ['./test/setupTests.ts'],
        globals: true,
        css: true, // Tailwind classes won’t break
        coverage: {
          provider: 'v8',
          reporter: ['text', 'lcov', 'html'],
          include: ['src/**/*.{ts,tsx}'],
          exclude: ['**/*.d.ts', 'node_modules', '.next', 'dist', 'test', '**/*.stories.*'],
        },
        alias: {
          // If you use @/* tsconfig paths
          '@': path.resolve(__dirname, './src'),
          // Stub out Next-specific modules that fail in jsdom if imported directly
          'next/navigation': path.resolve(__dirname, './test/mocks/next-navigation.ts'),
          'next/router': path.resolve(__dirname, './test/mocks/next-router.ts'),
          'next/image': path.resolve(__dirname, './test/mocks/next-image.tsx'),
        },
      },
    })
- test/setupTests.ts:
  - import '@testing-library/jest-dom/vitest'
  - import { server } from './mocks/server'
  - // jsdom may lack some encoders/decoders in Node versions; polyfill if needed:
  - // globalThis.TextEncoder = globalThis.TextEncoder || (await import('util')).TextEncoder
  - // MSW lifecycle
  - beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  - afterEach(() => server.resetHandlers())
  - afterAll(() => server.close())
- test/mocks/next-image.tsx (mock Next/Image to a simple img – avoids layout and optimization logic):
  - import React from 'react'
  - const NextImage = ({ src, alt, ...props }: any) => <img src={typeof src === 'string' ? src : (src?.src ?? '')} alt={alt ?? ''} {...props} />
  - export default NextImage
- test/mocks/next-navigation.ts (basic stubs for useRouter, usePathname, etc.):
  - export const useRouter = () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() })
  - export const usePathname = () => '/'
  - export const useSearchParams = () => new URLSearchParams()
- test/mocks/next-router.ts (Legacy pages router; if unused, still safe to provide):
  - export const useRouter = () => ({ push: vi.fn(), prefetch: vi.fn() })
- RTL usage example:
  - import { render, screen } from '@testing-library/react'
  - import userEvent from '@testing-library/user-event'
  - test('button toggles modal', async () => {
      render(<MyComponent />)
      await userEvent.click(screen.getByRole('button', { name: /open modal/i }))
      expect(screen.getByRole('dialog', { name: /settings/i })).toBeVisible()
    })

React Testing Library status and best practices (2025)
- RTL remains the standard for React components focusing on behavior and accessibility, not implementation details. Core practices:
  - Prefer queries byRole, byLabelText, byText with exact semantics; avoid getByTestId except as a last resort.
  - Use user-event for realistic interactions (keyboard/mouse/pointer). It handles focus, pointer events, key sequences, etc.
  - For async UI, prefer findBy... or await waitFor(() => ...) with clear timeouts; avoid brittle fixed delays.
  - Scope queries with within(container) or within(section) for complex UIs.
  - Assert accessible names and states: toBeDisabled, toBeChecked, toHaveAccessibleName, toHaveAttribute, toHaveTextContent.
  - Keep tests UI-facing; do not assert Tailwind class strings. If you must assert style, use toHaveStyle on computed styles, not class names.
  - For client/server components: only client components ("use client") should be rendered with RTL. For server components, isolate logic into pure functions and test them directly; or test the integration via Playwright.

@testing-library/jest-dom with Vitest
- Despite the name, @testing-library/jest-dom works with Vitest. Use the /vitest entrypoint in setupTests:
  - import '@testing-library/jest-dom/vitest'
- This adds matchers like toBeInTheDocument, toBeVisible, toHaveTextContent, toHaveAccessibleName, toHaveAttribute, toHaveStyle, toHaveClass. It dramatically improves readability and reduces custom assertion noise.

MSW (Mock Service Worker) for network mocking
- Why MSW:
  - Intercepts fetch/XHR in tests and in the browser, enabling realistic API behavior without stubbing fetch globally per test.
  - Encourages contract-focused tests: define request handlers declaratively per route and reuse them across unit/integration/dev.
- Setup for Vitest (Node/jsdom):
  - test/mocks/handlers.ts:
    - import { http, HttpResponse } from 'msw'
    - export const handlers = [
        http.post('/api/scale/start', async ({ request }) => {
          const body = await request.json()
          if (body.runCount > 10) return HttpResponse.json({ error: 'Run cap exceeded' }, { status: 400 })
          return HttpResponse.json({ runId: 'run_123' })
        }),
        http.get('/api/scale/run_123/status', () => HttpResponse.json({ progress: 100, runs: [{ id: 1, conversationId: 'c1' }] })),
        http.get('/api/scale/run_123/report', () =>
          HttpResponse.json({
            summary: { failures: 1, issues: ['prompt too vague'] },
            revisedPrompt: 'You are a careful assistant...'
          })
        ),
      ]
  - test/mocks/server.ts:
    - import { setupServer } from 'msw/node'
    - import { handlers } from './handlers'
    - export const server = setupServer(...handlers)
- Setup for browser (optional for local dev):
  - Create test/mocks/browser.ts with setupWorker and same handlers, then start worker in development only (e.g., in app/layout.tsx guarded by process.env.NEXT_PUBLIC_ENABLE_MSW === '1').
- Pattern:
  - beforeAll -> server.listen()
  - afterEach -> server.resetHandlers()
  - afterAll -> server.close()
- Overriding per-test:
  - server.use(http.get('/api/scale/run_123/status', () => HttpResponse.json({ progress: 50 })))
- Route Handlers and Server Actions:
  - For internal Next.js app/api route handler unit tests, you can call your GET/POST directly with NextRequest/Response. Use MSW to mock external services (LLM provider HTTP calls).
  - For Server Actions that call fetch, MSW intercepts those too in tests, but prefer isolating action logic into pure functions that accept injected fetch/client to simplify testing.

Snapshot testing: do’s and don’ts
- Default to semantic assertions instead of snapshots. Snapshots are best used for:
  - Small, stable, presentation-only blocks (e.g., the “Revised Prompt” panel in Task 6) where the string/markup is the product.
  - Regression guards for error states, empty states, or short markdown-to-HTML transforms.
- Avoid:
  - Large, deeply nested DOM snapshots (noisy churn, hard to review).
  - Snapshots as behavior assertions (they don’t communicate intent).
- How:
  - Prefer inline snapshots for small strings:
    - expect(screen.getByRole('region', { name: /revised prompt/i })).toHaveTextContentMatchingInlineSnapshot(`
        You are a careful assistant...
      `)
  - For HTML, pretty-print a scopped container:
    - import { prettyDOM } from '@testing-library/dom'
    - const block = screen.getByTestId('revised-prompt')
    - expect(prettyDOM(block, 10000)).toMatchSnapshot()
  - In Vitest, use toMatchInlineSnapshot() and toMatchSnapshot(). Consider snapshotSerializers for React elements if you rely on component-level snapshots; but generally stick to DOM snapshots via prettyDOM.
- Keep snapshots small, target a single block, and pair them with one or two semantic assertions (e.g., role/name visible).

DOM testing patterns tailored to this project
- Task 6 (Scale Testing):
  - Form validation: assert runCount cap UI (<= 10) shows an error and disables submit when exceeded; test that POST fires with correct payload when valid.
  - Progress UI: MSW-driven status progression (0 -> 100); use findByRole for async elements; avoid timers by letting MSW responses resolve.
  - Summary and revised prompt: snapshot only those blocks; also assert a11y roles (region with accessible name) and copy-to-clipboard button’s label and behavior.
- Task 5 (Agent Wars Hub):
  - Model whitelist and disabling logic: assert option disabled state and helper text; user-event to select provider + model; mock polling with MSW for progress.
  - Stop criteria: simulate reaching goal or 25 messages via MSW handlers, assert UI stops and shows final status.
- Task 7 (PromptBro):
  - Multi-step wizard: test step transitions via keyboard and mouse; ensure preview updates as user types; verify assist route integration via MSW returns a hint string shown in the UI.
  - Saving template: MSW POST /api/prompts returns created row; assert success toast and that list refreshes.
- Task 1 (Prisma repos):
  - Use Vitest in Node environment (not jsdom): add a vitest.node.config.ts with test.environment: 'node'.
  - Spin a disposable Postgres (Docker or Neon branch). Run migrations before tests. In tests, use transactions and rollbacks per test or truncate tables per suite.
  - Avoid mocking Prisma for repository logic; test the real DB behavior and constraints (unique, indexes). Use MSW only for external HTTP, not for DB.

Dealing with Next.js and RSC nuances
- Client vs Server:
  - Mark components that need interactivity as "use client"; test those with RTL.
  - For Server Components, prefer extracting logic (e.g., prompt builders, selectors, serializers) into pure functions and test them directly with Vitest in Node env.
- next/navigation and next/image mocks:
  - Provide simple mocks (as shown above). If you rely on router events or prefetch behavior, assert that your code calls push/replace with correct arguments rather than trying to simulate full navigation.
- Dynamic imports and suspense:
  - When components lazy load heavy 3D/graph sections (Task 4), test that the fallback renders and that on resolve the placeholder is replaced. Example:
    - expect(screen.getByTestId('graph-skeleton')).toBeInTheDocument()
    - await waitFor(() => expect(screen.queryByTestId('graph-skeleton')).not.toBeInTheDocument())
- WebGL/Three.js:
  - Do not render full R3F scenes in jsdom. Abstract visualization into a component with well-defined props and verify props translation, fallback UI, and error boundaries. Use Playwright for end-to-end visuals if needed.

Realistic example: Scale page tests (component + integration)
- Component test (form behavior):
  - render(<ScalePage />)
  - const runCount = screen.getByLabelText(/run count/i)
  - await userEvent.clear(runCount); await userEvent.type(runCount, '11')
  - expect(screen.getByText(/cap.*10/i)).toBeVisible()
  - expect(screen.getByRole('button', { name: /start/i })).toBeDisabled()
- Integration with MSW (start -> status -> report):
  - server.use(
      http.post('/api/scale/start', async () => HttpResponse.json({ runId: 'run_X' })),
      http.get('/api/scale/run_X/status', async () => HttpResponse.json({ progress: 100, runs: [{ id: 1, conversationId: 'c1' }] })),
      http.get('/api/scale/run_X/report', async () => HttpResponse.json({ summary: { failures: 0, issues: [] }, revisedPrompt: 'Improved...' }))
    )
  - render(<ScalePage />)
  - fill form; click Start
  - await findByText(/progress.*100%/i)
  - const revised = await screen.findByTestId('revised-prompt')
  - expect(revised).toHaveTextContent('Improved')
  - expect(prettyDOM(revised)).toMatchSnapshot()

Jest equivalents (if you choose Jest)
- Install jest, @types/jest, ts-jest or Babel + next/jest.
- Use next/jest preset in jest.config.js for transforms. Environment: jsdom.
- Setup file imports '@testing-library/jest-dom'.
- MSW setup is the same (setupServer from 'msw/node').
- Timers and mocking API differ slightly; otherwise RTL tests are identical.

Common pitfalls and how to avoid them
- Testing implementation details:
  - Don’t assert internal state variables, className strings (especially with Tailwind), or call counts unless that’s the explicit contract (e.g., verifying router.push called).
- Flaky async tests:
  - Use findBy* and waitFor, not arbitrary setTimeouts. Prefer MSW to control server timing deterministically; if needed, delay handlers with await new Promise(r => setTimeout(r, 10)).
- Mixing environments:
  - Keep jsdom tests for UI, node tests for server-only code (Prisma repos, LLM orchestration). Use separate vitest config or per-file annotations: // @vitest-environment node.
- Global state leakage:
  - Reset MSW handlers after each test. Reset module mocks with vi.resetModules() if dynamic imports are used. Clear localStorage/sessionStorage if used.
- Next.js runtime APIs:
  - Some Next server-only APIs fail in jsdom. If you must import code that touches them, invert dependencies so UI layers depend on interfaces, and inject test doubles.

Coverage targets and CI
- Target per-layer thresholds (example):
  - Repos/Utilities (Node): 90% branches, 95% lines.
  - UI components (jsdom): 80% branches, 85% lines (favor meaningful tests over coverage gaming).
  - Pages with heavy visuals (Task 4): focus on Playwright and smoke RTL tests.
- Run in CI:
  - vitest run --coverage
  - Playwright tests: npx playwright test
- Consider a GitHub Action matrix:
  - Unit (Node, jsdom) with Vitest
  - Integration with MSW
  - Playwright e2e (headed=false, project=chromium)
  - Lighthouse CI for the marketing page performance budget (already in Task 4 test strategy)

Quick checklists per task
- Task 6 Scale Testing:
  - RTL form tests (cap <= 10), MSW integration for run lifecycle, snapshot of summary and revised prompt blocks, DOM assertions on accessibility and copy buttons.
- Task 1 Prisma:
  - Vitest Node env, real Postgres (Docker/Neon), migration apply in test setup, repository CRUD and index behavior tests, seed sanity.
- Task 4 Marketing page:
  - RTL for lazy-loading fallbacks and interactions; skip full 3D rendering in jsdom; Playwright screenshot diffs for hero+graph; Lighthouse CI thresholds; axe/core accessibility check.
- Task 7 PromptBro:
  - Wizard step logic unit tests, draft builder deterministic merge tests, MSW-backed assist route tests, save-and-restore PromptTemplate flow.
- Task 5 Agent Wars Hub:
  - Model whitelist/disable logic unit tests, MSW job progression polling tests, stopping at goal or 25 messages integration tests, concurrent sessions UI state tests.

Migration notes if starting from Jest
- You can run both in parallel temporarily:
  - Keep jest.config.js and add vitest.config.ts. Migrate suites folder by folder.
- Replace jest.fn/... imports with vi.fn/... or rely on globals (both expose globals when configured).
- For jest-dom, switch setup import to '@testing-library/jest-dom/vitest'.
- Remove next/jest-only transform config when fully on Vitest.

With this setup, you’ll get fast, readable, and maintainable unit/component tests for Next.js in 2025, realistic network behavior via MSW, and pragmatic snapshot use where it adds value—aligned with your project’s Scale Testing, Hub, and PromptBro feature goals.


---

*Generated by Task Master Research Command*  
*Timestamp: 2025-08-12T08:19:54.134Z*
