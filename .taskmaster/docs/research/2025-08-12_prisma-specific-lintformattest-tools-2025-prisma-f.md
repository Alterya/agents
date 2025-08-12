---
title: Research Session
query: "Prisma-specific lint/format/test tools (2025): prisma format/validate, eslint-plugin-prisma (if available), migration testing patterns, DB test strategies (Docker Postgres vs Neon branch)."
date: 8/12/2025
time: 11:26:31 AM
timestamp: 2025-08-12T08:26:31.719Z
exchanges: 1
---

# Research Session

## Initial Query

**Question:** Prisma-specific lint/format/test tools (2025): prisma format/validate, eslint-plugin-prisma (if available), migration testing patterns, DB test strategies (Docker Postgres vs Neon branch).

**Response:**

Below is a 2025-ready, Prisma-focused toolbox and testing strategy tailored to this project. It covers formatting/validation, linting, migration safety, and database testing approaches. I’ve aligned the recommendations to your tasks—especially Task 1 (Prisma models and migrations) and the CI test strategy you outlined—while adding concrete scripts and patterns to drop into the repo.

1) Formatting and validation: make Prisma schema changes safe and consistent
- Core CLI commands
  - prisma format: Formats prisma/schema.prisma consistently (ordering, indentation, quoting, etc.). Fast and deterministic—ideal for pre-commit hooks.
    - npx prisma format or pnpm prisma format
  - prisma validate: Validates schema correctness (syntax, relations, data sources). Use it in CI to catch errors before migration generation or deploy.
    - npx prisma validate

- Recommended workflow hooks
  - Pre-commit (Husky + lint-staged):
    - Install: pnpm add -D husky lint-staged
    - Setup Husky: npx husky init
    - package.json:
      {
        "lint-staged": {
          "prisma/schema.prisma": [
            "prisma format",
            "prisma validate"
          ],
          "*.{ts,tsx,js}": [
            "eslint --fix"
          ]
        },
        "scripts": {
          "prisma:format": "prisma format",
          "prisma:validate": "prisma validate"
        }
      }
    - .husky/pre-commit:
      #!/usr/bin/env sh
      . "$(dirname -- "$0")/_/husky.sh"
      pnpm lint-staged

- Editor support
  - VS Code: Install the official Prisma extension for live linting/formatting-on-save. This enforces “format on save” into developers’ normal workflow.

- CI gate
  - Add a job that runs prisma format --check and prisma validate (format --check isn’t a CLI flag today; emulate by checking “git diff --exit-code” after format in a throwaway commit or run format in a check-only manner using a temporary copy). Example:
    - Run prisma format
    - Verify no diff: git diff --exit-code prisma/schema.prisma

2) ESLint and Prisma: schema vs client usage
- Schema linting
  - There is no widely adopted official ESLint plugin that lints .prisma schema files end-to-end in CI beyond what prisma format/validate already cover. The Prisma Language Server (editor plugin) provides most schema diagnostics.
  - You can optionally evaluate community schema linters (e.g., prisma-schema-linter projects exist in the ecosystem), but they’re not as battle-tested or maintained as the official formatter/validator. For this project, I recommend relying on prisma format + prisma validate for schema correctness, plus conventions captured in code review.

- Client usage linting (JS/TS)
  - eslint-plugin-prisma (official, actively maintained) focuses on Prisma Client usage in application code. It helps catch unsafe raw queries and other common pitfalls.
    - Install: pnpm add -D eslint-plugin-prisma
    - .eslintrc.cjs:
      module.exports = {
        plugins: ["prisma"],
        extends: [
          "plugin:prisma/recommended" // includes safe defaults
        ],
        rules: {
          // Optional: tighten rules as desired
          // E.g., avoid unsafe $queryRaw/$executeRaw strings and encourage parameterization
          // "prisma/no-unsafe-raw-query": "error",
        }
      }
  - Typical value you’ll get:
    - Flags unsafe string interpolation into prisma.$queryRaw/$executeRaw, guiding toward parameterized queries (template tag usage or Prisma.sql parameters).
    - Nudges away from patterns that cause performance or correctness issues.
  - Complement with generic security/SQL linting:
    - eslint-plugin-security, eslint-plugin-no-secrets, and TypeScript strict mode for broader safety.

3) Migration safety and drift detection in CI
- Goals
  - Ensure migrations can be applied cleanly on a fresh database.
  - Ensure app schema and migration history are in sync (no drift).
  - Surface destructive changes early.
  - Keep migrations deterministic across environments.

- Core commands
  - prisma migrate status: Confirms if migrations are in sync with schema and DB. Good first check in CI for drift.
  - prisma migrate deploy: Applies migrations in production/CI environments (no prompts).
  - prisma migrate diff: Compares two states to detect drift or unexpected local changes.
    - Example: Detect un-migrated changes in schema:
      npx prisma migrate diff \
        --from-migrations ./prisma/migrations \
        --to-schema-datamodel ./prisma/schema.prisma \
        --exit-code
      - Exit code non-zero means the schema deviates from migrations (i.e., dev changed schema without generating a migration).
    - Example: Detect DB drift (DB differs from your migrations):
      npx prisma migrate diff \
        --from-url "$DATABASE_URL" \
        --to-migrations ./prisma/migrations \
        --exit-code

- CI flow recommendation (Task 1 + shared CI)
  - Step 1: Validate schema
    - prisma validate
  - Step 2: Check migration alignment
    - prisma migrate diff --from-migrations ./prisma/migrations --to-schema-datamodel ./prisma/schema.prisma --exit-code
  - Step 3: Apply migrations on a fresh DB
    - Use an ephemeral Postgres (Docker or Neon branch; see section 4/5).
    - prisma migrate deploy
    - Optionally prisma db seed
    - Run basic CRUD sanity (small script) to protect against trivial runtime errors and ensure at least the seed Agent exists (as per Task 1).
  - Step 4: Optional destructive change warning
    - You can add a “guardrail” script that inspects the last migration’s SQL for DROP TABLE/COLUMN or ALTER … DROP statements and requires a “needs-manual-approval” label in PRs when destructive changes are introduced. Prisma already warns at migrate dev time, but having a PR-time reminder can be helpful.

- Pre-merge PR check for “sneaky changes”
  - Prevent merging if a developer edited schema.prisma but forgot npx prisma migrate dev --name <change>:
    - The migrate diff check above (from-migrations vs to-schema-datamodel) will fail and block.

4) Migration testing patterns (repeatable, isolated)
- Fresh database test
  - Spin up a fresh Postgres.
  - Apply prisma migrate deploy.
  - Optionally run prisma db seed.
  - Run integration tests that exercise core models (Agent, Conversation, Message, RunReport, PromptTemplate).
  - This validates that migrations alone can bootstrap a working DB for a new environment.

- Reset pattern during tests
  - Between tests, prefer TRUNCATE over re-running migrations (fast).
  - Implement a helper that truncates all tables except _prisma_migrations, then RESTART IDENTITY CASCADE.
    - Example (TypeScript):
      import { PrismaClient } from "@prisma/client";
      import { Client } from "pg";

      export async function truncateAllTables(prisma: PrismaClient) {
        const pg = new Client({ connectionString: process.env.DATABASE_URL });
        await pg.connect();
        const res = await pg.query(`
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public'
            AND tablename <> '_prisma_migrations';
        `);
        const tables = res.rows.map(r => `"public"."${r.tablename}"`).join(", ");
        if (tables.length) {
          await pg.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE;`);
        }
        await pg.end();
      }
  - Avoid wrapping the whole test suite in a single long-lived transaction with Prisma unless you strictly control all DB access through a single interactive transaction (hard in app-level tests). The TRUNCATE approach is simpler and reliable.

- Drift verification after migrations
  - After prisma migrate deploy in CI, run prisma migrate status or prisma migrate diff --from-url ... --to-migrations to ensure the DB has no drift relative to migration history.

5) DB test strategies: Dockerized Postgres vs Neon branch
- Option A: Docker Postgres (local and CI)
  - Pros:
    - Deterministic, fast, offline, easy to snapshot with Testcontainers.
    - No external network flakiness. Simple secrets management.
    - Great fit for unit/integration tests and migration tests.
  - Cons:
    - GPU/Arm runners or some CI runners may have slower cold boots.
    - Managing parallelism across test workers requires either separate DBs or distinct schemas.

  - How to implement
    - GitHub Actions with services:
      jobs:
        test:
          runs-on: ubuntu-latest
          services:
            postgres:
              image: postgres:16
              env:
                POSTGRES_USER: postgres
                POSTGRES_PASSWORD: postgres
                POSTGRES_DB: app_test
              ports: ["5432:5432"]
              options: >-
                --health-cmd="pg_isready -U postgres"
                --health-interval=5s
                --health-timeout=5s
                --health-retries=10
          env:
            DATABASE_URL: postgresql://postgres:postgres@localhost:5432/app_test?schema=public
          steps:
            - uses: actions/checkout@v4
            - uses: pnpm/action-setup@v4
              with: { version: 9 }
            - run: pnpm i --frozen-lockfile
            - run: pnpm prisma migrate deploy
            - run: pnpm test

    - Or use Testcontainers from Node to provision on-demand Postgres per test file:
      import { StartedPostgreSqlContainer, PostgreSqlContainer } from "@testcontainers/postgresql";
      import { PrismaClient } from "@prisma/client";

      let container: StartedPostgreSqlContainer;
      let prisma: PrismaClient;

      beforeAll(async () => {
        container = await new PostgreSqlContainer("postgres:16").start();
        process.env.DATABASE_URL = container.getConnectionUri();
        // Apply migrations to this fresh DB
        await execa("pnpm", ["prisma", "migrate", "deploy"], { stdio: "inherit" });
        prisma = new PrismaClient();
      });

      afterAll(async () => {
        await prisma.$disconnect();
        await container.stop();
      });

- Option B: Neon ephemeral branches (cloud)
  - Pros:
    - True Postgres engine, serverless, very fast branch provisioning, ideal for PR environments.
    - Lets you test against cloud settings similar to prod (SSL, poolers).
  - Cons:
    - Network latency adds variability to test times.
    - CI needs Neon API keys; secret management required.
    - Connection pooling mode needs attention with Prisma.
      - Historically Prisma and PgBouncer “transaction” pooling are incompatible. With Neon, ensure session pooling for Prisma during migrations/tests (or direct connection bypassing pooler). Check Neon’s “pooler mode” and connection string parameters to force session mode for CI tests.

  - How to implement (GitHub Actions sketch)
    - Create branch via Neon API in a pre-test step; get connection string; set DB URL; run prisma migrate deploy; run tests; delete branch.
      - Pseudo-steps:
        - Create branch:
          curl -X POST https://console.neon.tech/api/v2/projects/$NEON_PROJECT/branches \
           -H "Authorization: Bearer $NEON_API_KEY" \
           -H "Content-Type: application/json" \
           -d '{ "branch": { "name": "ci-$GITHUB_RUN_ID" } }'
        - Create database/user (if needed) and obtain a DATABASE_URL.
        - Ensure session pooling (check Neon docs; often adding ?sslmode=require&pgbouncer=false or equivalent session setting).
        - prisma migrate deploy
        - pnpm test
        - Cleanup: delete branch.

  - Recommendation
    - Default to Dockerized Postgres for local dev and CI. Add Neon branch tests only if you need to mirror prod network constraints or to run ephemeral preview environments. For this project’s test matrix, Docker covers the database requirements well.

6) Project-specific guardrails and scripts (apply to Task 1, 2, 3, 5, 6, 7)
- Prisma client singleton (Next.js)
  - Prevent hot-reload storm in dev:
    // src/server/db.ts
    import { PrismaClient } from "@prisma/client";

    const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

    export const prisma =
      globalForPrisma.prisma ??
      new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      });

    if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

- Seeding consistent with Task 1’s prebuilt Agents
  - prisma/seed.ts should insert at least one Agent with isActive and indexes created by migrations. Call via prisma db seed in CI after migrate deploy for smoke coverage.

- Basic CRUD migration smoke test (CI)
  - A tiny script validates the core flow (aligned with Task 1 test strategy):
    - Create Agent
    - Create Conversation linked to Agent
    - Insert a few Messages
    - Read paginated Messages with ORDER BY and index usage (EXPLAIN is optional)
  - Example:
    // scripts/db-smoke.ts
    import { prisma } from "../src/server/db";
    async function main() {
      const agent = await prisma.agent.create({
        data: { name: "SmokeAgent", description: "smoke", systemPrompt: "", persona: {}, isActive: true, tags: [] }
      });
      const conv = await prisma.conversation.create({
        data: { agentId: agent.id, model: "gpt-4o-mini", systemPrompt: "", goal: "test" }
      });
      await prisma.message.createMany({
        data: Array.from({ length: 3 }).map((_, i) => ({
          conversationId: conv.id,
          role: "user",
          content: `m${i}`,
          index: i
        }))
      });
      const messages = await prisma.message.findMany({
        where: { conversationId: conv.id },
        orderBy: { index: "asc" }
      });
      if (messages.length !== 3) throw new Error("Smoke failed");
    }
    main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

- Drift gate in CI
  - Add this job step before tests:
    - pnpm prisma:validate
    - npx prisma migrate diff --from-migrations ./prisma/migrations --to-schema-datamodel ./prisma/schema.prisma --exit-code
    - If this fails, instruct devs to run: npx prisma migrate dev --name <change> and commit the new migration.

- Safety around raw queries in provider code (Task 2/3)
  - If you ever need raw SQL (e.g., reporting aggregates), enforce ESLint rules for safe parameterization and prefer Prisma’s query API first.
  - In logs, avoid printing full SQL or parameters in production to honor the “no PII/logging” guideline in Task 2.

7) Test layering and performance tips (Vitest)
- Global setup (Vitest)
  - Use a globalSetup script that:
    - Provisions a test DB (Docker or Neon branch).
    - Applies prisma migrate deploy.
    - Seeds minimal data.
  - Example vitest.config.ts:
    import { defineConfig } from "vitest/config";
    export default defineConfig({
      test: {
        globals: true,
        environment: "node",
        setupFiles: ["./tests/setup/db.setup.ts"],
        hookTimeout: 120000
      }
    });

- db.setup.ts example
  - With Docker service available in CI:
    import { execa } from "execa";
    export async function setup() {
      process.env.DATABASE_URL ||= "postgresql://postgres:postgres@localhost:5432/app_test?schema=public";
      await execa("pnpm", ["prisma", "migrate", "deploy"], { stdio: "inherit" });
      // Optional seed
      await execa("pnpm", ["prisma", "db", "seed"], { stdio: "inherit" });
    }

- Per-test isolation
  - Use the truncateAllTables helper in beforeEach/afterEach to ensure clean state:
    import { truncateAllTables } from "./truncate";
    beforeEach(async () => { await truncateAllTables(prisma); });

- Parallel workers
  - If running tests with concurrency, either:
    - Enable a unique schema per worker: append ?schema=test_${process.env.VITEST_WORKER_ID} to DATABASE_URL and CREATE SCHEMA on startup, or
    - Use Testcontainers to spin one DB per worker, or
    - Serialize DB tests if contention is an issue.

8) Optional: schema/code quality enhancements specific to this project
- Conventions in schema.prisma
  - Enforce consistent naming for enums and relation fields (document in CONTRIBUTING.md).
  - Add indexes explicitly for read paths you care about (Message by conversationId, index) and verify via EXPLAIN in one test (Task 1 Performance check).

- Runtime safety defaults
  - Prefer findUniqueOrThrow over findUnique + manual null checks in paths where the record must exist (e.g., retrieving Agent to start battles). This surfaces errors early and simplifies code.

- Data migrations vs Prisma migrations
  - If you need data transformations after a schema change (e.g., backfilling a new column), encode them as idempotent scripts executed post prisma migrate deploy in CI or as an additional migration step (Prisma SQL migrations can include ALTER + UPDATE statements as needed).

Putting it all together: recommended CI job matrix
- Lint and schema check:
  - ESLint (with eslint-plugin-prisma), TypeScript build
  - Prisma:
    - prisma validate
    - prisma migrate diff --from-migrations ... --to-schema-datamodel ... --exit-code
- DB migration test (Docker service)
  - Start Postgres service
  - prisma migrate deploy
  - prisma db seed
  - Run db smoke script
- Unit/integration tests (DB enabled; same service)
  - Run Vitest with truncate-per-test or schema-per-worker isolation
- Optional: Neon branch job (nightly or on-demand)
  - Provision branch
  - Run same migrate + test flow using session pooling
  - Teardown branch

What to implement next in this repo (actionable checklist)
- Add Husky + lint-staged and wire prisma format/validate on schema changes.
- Add eslint-plugin-prisma and extend plugin:prisma/recommended in ESLint config.
- Create CI steps for prisma validate and migrate diff alignment check.
- Choose DB strategy:
  - Default: GitHub Actions Postgres service; add Testcontainers for local dev if convenient.
  - Optional: Neon branch workflow for preview environments (later).
- Implement test helpers:
  - prisma client singleton (src/server/db.ts)
  - truncateAllTables helper
  - Vitest setup file to migrate/seed before tests
- Add db smoke script and wire it into CI after prisma migrate deploy.
- Document destructive-change policy and add a simple SQL-scan guard for DROP statements in migrations if you want the extra belt-and-suspenders check.

This setup will make Task 1’s migration validation and tests reliable, while supporting Tasks 2–7 with stable DB access patterns in unit/integration tests. It also gives you fast feedback locally and in CI, protects against schema drift, and enforces safe Prisma usage in application code.


---

*Generated by Task Master Research Command*  
*Timestamp: 2025-08-12T08:26:31.719Z*
