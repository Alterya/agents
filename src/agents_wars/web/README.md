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

## Notes

- Only OpenAI and OpenRouter are supported providers. Set at least one API key.
- For performance/cost controls, you can set `ALLOWED_MODELS`, `MAX_TOKENS_PER_CALL`, and `RATE_LIMIT_*` in `.env.local`.
- Prisma UI: `make -C src/agents_wars prisma-studio`.
- If using a cloud Postgres (Neon/Supabase), update `DATABASE_URL`/`DIRECT_URL` accordingly.
