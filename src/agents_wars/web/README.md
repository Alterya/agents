# Agent Wars Web (Next.js) — Local Setup (Non‑Docker)

This app lives under `src/agents_wars/web` and uses Next.js App Router, Prisma (Postgres), Vitest, and Playwright.

## Prerequisites

- Node.js 18+ and npm
- Local Postgres running (Neon/Supabase also works)

## 1) Database: create local DB

```bash
# Example local DB name; adjust if desired
createdb agent_wars || psql -c 'CREATE DATABASE agent_wars;'
```

## 2) Configure environment

Copy the example file and fill in real values:

```bash
cd src/agents_wars/web
cp .env.example .env.local
```

Required keys (one of):

- `OPENAI_API_KEY` or `OPENROUTER_API_KEY`

Postgres URLs:

- `DATABASE_URL` — used by the app and Prisma client
- `DIRECT_URL` — used by Prisma migrations (can be the same locally)

## 3) Install dependencies

```bash
make -C src/agents_wars install
```

## 4) Migrate and seed

```bash
# Formats/validates the Prisma schema, runs dev migration, and seeds sample agents
make -C src/agents_wars prisma-migrate
make -C src/agents_wars prisma-seed
```

## 5) Run the app

```bash
make -C src/agents_wars dev
```

## Quality and checks

```bash
# Lint, type-check, tests (unit), basic a11y/Lighthouse checks
make -C src/agents_wars quality

# CI‑like gate (lint + typecheck + tests)
make -C src/agents_wars check
```

## Playwright E2E

The project includes Playwright tests for the Scale page, including axe-core accessibility checks.

- Start tests (auto-starts dev server on an open port):

```bash
cd src/agents_wars/web
npm run e2e
```

- Headed mode for debugging:

```bash
npm run e2e:headed
```

- Run only accessibility tests:

```bash
npm run a11y
```

- CI pipeline target (runs lint, typecheck, unit tests, Playwright, and Lighthouse):

```bash
make -C src/agents_wars ci
```

Notes:
- Ensure `.env.local` contains a valid `DATABASE_URL` and either `OPENAI_API_KEY` or `OPENROUTER_API_KEY` for full end‑to‑end behavior.
- When running locally without API keys, tests may still pass due to graceful fallbacks, but summary/revised prompt content may be "information unavailable".

## BullMQ Worker (Optional)

If you set `REDIS_URL`, battles and scale runs will be enqueued and processed by BullMQ workers.

- Start workers:

```bash
cd src/agents_wars/web
REDIS_URL=redis://localhost:6379 node dist/worker.js
```

- Dev (ts-node via tsx):

```bash
cd src/agents_wars/web
REDIS_URL=redis://localhost:6379 tsx worker.ts
```

Without `REDIS_URL`, the app falls back to in‑memory execution automatically.
