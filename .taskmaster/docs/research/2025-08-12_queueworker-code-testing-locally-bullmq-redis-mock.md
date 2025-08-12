---
title: Research Session
query: "Queue/worker code testing locally (BullMQ): redis-mock status, alternatives, local Redis via Docker; test strategies for BullMQ in Node (2025)."
date: 8/12/2025
time: 11:32:17 AM
timestamp: 2025-08-12T08:32:17.730Z
exchanges: 1
---

# Research Session

## Initial Query

**Question:** Queue/worker code testing locally (BullMQ): redis-mock status, alternatives, local Redis via Docker; test strategies for BullMQ in Node (2025).

**Response:**

Below is a practical, 2025-ready guide for testing BullMQ queues/workers locally for this project, with specific recommendations for your Scale Testing (Task 6) and Hub concurrent battles (Task 5). It covers the status of redis-mock, viable alternatives, how to run Redis locally (Docker/Testcontainers), and test strategies (unit, integration, end-to-end) that are robust in CI and local development.

1) TL;DR recommendations for this project
- Do not use redis-mock/ioredis-mock for BullMQ tests. They are incomplete for BullMQ’s stream/Lua usage and will give you false confidence.
- Use a real Redis in tests:
  - Local dev: docker run redis:7-alpine with append-only and snapshotting disabled.
  - Automated tests: Testcontainers to spin up Redis per test suite; or GitHub Actions service container.
- Design your workers with a thin BullMQ shell and pure “processor” functions. Unit test the processors without Redis; integration test the BullMQ plumbing with real Redis.
- Use unique queue names per test and obliterate/drain queues after each run to avoid cross-test contamination.
- For Task 6 (Scale Testing):
  - Add N “conversation” jobs to a queue (or a FlowProducer tree if you want a built-in dependency graph).
  - On completion of all N, add a summarization job that builds the RunReport and revised prompt.
  - Integration-test this with Testcontainers + a fake LLM provider to make the outcomes deterministic.
- For Task 5 (Hub):
  - Add a job per battle with concurrency in the Worker; verify “goal reached” or cap at 25 messages.
  - Integration-test: POST start, poll status, ensure messages accrue and the job completes or stops correctly.

2) redis-mock/ioredis-mock status in 2025
- ioredis-mock (and similar redis-mock libraries) historically lag behind Redis features central to BullMQ: streams (XADD, XREADGROUP, XACK), consumer groups, and Lua scripts. As of 2024–2025, these mocks still do not fully support BullMQ’s command set and behaviors (ack/claim semantics, blocking reads, dead-letter-like handling, rate limiting via scripts).
- Result: BullMQ code that “passes” with a mock often fails with real Redis. Mocks also miss timing-related behaviors, making concurrency/retry logic untested.
- Recommendation: Avoid mocks for BullMQ integration testing. Only use mocks for minimal unit tests of your own wrapper/adapter interfaces (e.g., a fake that collects “adds” to verify orchestrator logic), not for Worker behavior.

3) Alternatives to mocking
- Real Redis via Docker (local dev): Fast, deterministic, easy.
  - Quick command: docker run --rm -p 6379:6379 redis:7-alpine redis-server --save '' --appendonly no
  - Benefits: No persistence, minimal latency, near-instant startup/shutdown.
- Testcontainers (Node): Start a Redis container programmatically in Vitest/Jest suites.
  - Benefits: Fully isolated tests; no developer setup beyond Docker Desktop. Works in CI as well.
- GitHub Actions service container: services: redis:7-alpine for CI jobs.
- Upstash or remote Redis: Works but adds network flakiness/latency; not ideal for unit/integration tests.

4) Local Redis: Docker and docker-compose
- Single container:
  - docker run --rm -p 6379:6379 redis:7-alpine redis-server --save '' --appendonly no
- docker-compose.yml (optionally add Postgres for Task 1 integration tests):
  version: "3.8"
  services:
    redis:
      image: redis:7-alpine
      command: ["redis-server", "--save", "", "--appendonly", "no"]
      ports:
        - "6379:6379"
    # postgres:
    #   image: postgres:16-alpine
    #   environment:
    #     POSTGRES_USER: postgres
    #     POSTGRES_PASSWORD: postgres
    #     POSTGRES_DB: app
    #   ports:
    #     - "5432:5432"
- Optional: redis/redis-stack for RedisInsight if you want UI debugging (heavier image). For automated tests, the alpine image is plenty.

5) Testcontainers setup (recommended for Vitest/Jest integration tests)
- Install:
  - npm i -D testcontainers ioredis bullmq
  - Ensure Docker is available in the environment (local and CI).
- Minimal helper for Redis container in tests:
  import { beforeAll, afterAll, beforeEach, afterEach, test, expect } from 'vitest';
  import { GenericContainer, Wait } from 'testcontainers';
  import { Queue, Worker, QueueEvents } from 'bullmq';
  import IORedis from 'ioredis';

  let container;
  let connection;
  let queue;
  let worker;
  let queueEvents;

  beforeAll(async () => {
    container = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
      .withCommand(['redis-server', '--save', '', '--appendonly', 'no'])
      .start();

    const host = container.getHost();
    const port = container.getMappedPort(6379);

    // ioredis connection options; BullMQ accepts objects with same shape
    connection = { host, port, maxRetriesPerRequest: null };

    // NOTE: Use unique queue names per suite or per test
    const queueName = `test:scale:${Date.now()}:${Math.random().toString(36).slice(2)}`;

    queue = new Queue(queueName, { connection });
    queueEvents = new QueueEvents(queueName, { connection });
    await queueEvents.waitUntilReady();

    worker = new Worker(
      queueName,
      async (job) => {
        // Pure processor should be factored out and tested separately, see below
        // Here we do minimal work to prove the queue/worker pipeline
        return { sum: job.data.a + job.data.b };
      },
      { connection, concurrency: 4 }
    );
    await worker.waitUntilReady();
  });

  afterAll(async () => {
    await worker?.close();
    await queueEvents?.close();
    await queue?.obliterate({ force: true });
    await queue?.close();
    await container?.stop();
  });

  test('processes a job and returns result', async () => {
    const { id } = await queue.add(
      'sum',
      { a: 1, b: 2 },
      { removeOnComplete: true, removeOnFail: true }
    );
    const job = await queue.getJob(id);
    const res = await job.waitUntilFinished(queueEvents, 5000);
    expect(res.sum).toBe(3);
  });
- Notes:
  - queue.obliterate({ force: true }) ensures cleanup across test runs.
  - Always close Worker, QueueEvents, and Queue to prevent hanging handles in Vitest/Jest.
  - Use unique queue names to avoid event cross-talk if tests run concurrently (e.g., parallel workers).

6) Unit-testing your logic without Redis
- Extract pure processors and keep BullMQ objects thin:
  // scaleProcessor.ts
  export interface ScaleDeps {
    llm: { complete: (prompt: string) => Promise<string> };
    repo: { saveMessage: (convId: string, role: string, text: string) => Promise<void> };
    // ...other deps (logger, metrics)
  }

  export interface ScaleJobData {
    agentId: string;
    model: string;
    systemPrompt: string;
    goal?: string;
    runIndex: number;
  }

  export async function runConversation(data: ScaleJobData, deps: ScaleDeps) {
    // Your deterministic logic with injected dependencies:
    // - build prompt
    // - call deps.llm.complete
    // - store via deps.repo
    // - stop when goal reached or 25 messages
    return { goalReached: true, messages: 7, issues: [] };
  }

  // worker wrapper (minimal BullMQ binding)
  import { Job } from 'bullmq';
  export function makeScaleProcessor(deps: ScaleDeps) {
    return async (job: Job<ScaleJobData>) => runConversation(job.data, deps);
  }
- Unit tests target runConversation with fake deps. No Redis. This matches Task 6’s “Integration: End-to-end mocked scale run storing conversations and RunReport” if you stub the repo/llm.

7) Integration-testing BullMQ + your processors + persistence (Tasks 5 and 6)
- Compose approach:
  - Use Testcontainers for Redis.
  - For DB (Task 1), use Postgres via Testcontainers or run a Docker service and point Prisma to it.
  - Inject a fake LLM provider in tests to keep runs deterministic.
  - Stand up Worker(s) with real BullMQ and your makeScaleProcessor(makeDeps()).
- Example: end-to-end of a “Scale run” that enqueues N jobs and then enqueues a summarization job when all complete.
  import { describe, test, beforeAll, afterAll, expect } from 'vitest';
  import { GenericContainer } from 'testcontainers';
  import { Queue, Worker, QueueEvents, FlowProducer } from 'bullmq';
  import { makeScaleProcessor } from '../src/workers/scaleProcessor';
  import { fakeLLM, fakeRepo } from './fakes';

  let redis, connection;
  let flow;

  describe('Scale flow', () => {
    beforeAll(async () => {
      redis = await new GenericContainer('redis:7-alpine')
        .withExposedPorts(6379)
        .withCommand(['redis-server', '--save', '', '--appendonly', 'no'])
        .start();
      const host = redis.getHost();
      const port = redis.getMappedPort(6379);
      connection = { host, port, maxRetriesPerRequest: null };
      flow = new FlowProducer({ connection });
    });

    afterAll(async () => {
      await flow?.close();
      await redis?.stop();
    });

    test('runs N conversations and produces a summary', async () => {
      const scaleQueue = `scale:${Date.now()}`;
      const reportQueue = `scale-report:${Date.now()}`;

      const scaleQ = new Queue(scaleQueue, { connection });
      const reportQ = new Queue(reportQueue, { connection });
      const scaleEvents = new QueueEvents(scaleQueue, { connection });
      const reportEvents = new QueueEvents(reportQueue, { connection });
      await Promise.all([scaleEvents.waitUntilReady(), reportEvents.waitUntilReady()]);

      const deps = { llm: fakeLLM(), repo: fakeRepo() };
      const scaleWorker = new Worker(scaleQueue, makeScaleProcessor(deps), { connection, concurrency: 4 });
      const reportWorker = new Worker(reportQueue, async (job) => {
        // Build RunReport from results persisted by repo
        return { failures: 0, revisedPrompt: '...' };
      }, { connection });

      await Promise.all([scaleWorker.waitUntilReady(), reportWorker.waitUntilReady()]);

      const runCount = 5;

      // Option A: orchestrate with FlowProducer (children + parent)
      await flow.add({
        name: 'scale-run-parent',
        queueName: reportQueue, // parent summarizes after children complete
        data: { runCount },
        children: Array.from({ length: runCount }).map((_, i) => ({
          name: 'conversation',
          queueName: scaleQueue,
          data: { agentId: 'a1', model: 'gpt-4o-mini', systemPrompt: '...', runIndex: i },
          opts: { removeOnComplete: true, removeOnFail: true },
        })),
      });

      // Wait for summary completion
      const summary = await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('timeout')), 15000);
        reportEvents.on('completed', async ({ jobId }) => {
          const job = await reportQ.getJob(jobId);
          clearTimeout(t);
          resolve(await job.returnvalue);
        });
      });

      expect(summary).toHaveProperty('revisedPrompt');

      // Cleanup
      await Promise.all([
        scaleWorker.close(),
        reportWorker.close(),
        scaleEvents.close(),
        reportEvents.close(),
        scaleQ.obliterate({ force: true }),
        reportQ.obliterate({ force: true }),
        scaleQ.close(),
        reportQ.close(),
      ]);
    });
  });
- Notes:
  - FlowProducer is an optional convenience: parent job runs only after children succeed.
  - If you do orchestration in your app instead, you can track N completions and enqueue the summary job manually using QueueEvents’s completed events.

8) Testing API routes and UI flows (Next.js App Router)
- For /api/scale/start and /api/scale/:runId/status:
  - Spin Redis with Testcontainers; start Workers in test process.
  - In integration tests, invoke your API route handlers directly (Node Request/Response mocks) or run the Next.js dev server in-process with a test harness.
  - Use a fake provider for LLM in the Worker deps.
  - Verify:
    - Start returns a runId.
    - Status transitions from queued -> in_progress -> complete.
    - Summary endpoint returns RunReport with revisedPrompt.
- For UI:
  - Use Playwright to run against a dev server that points to local Redis via Docker and a fake LLM provider.
  - Snapshot test the summary and revised prompt blocks, enforce the runCount cap (<= 10), and verify proper error display when exceeded (aligns with Task 6 test plan).

9) GitHub Actions CI options
- Service container approach:
  jobs:
    test:
      runs-on: ubuntu-latest
      services:
        redis:
          image: redis:7-alpine
          ports:
            - 6379:6379
          options: >-
            --health-cmd "redis-cli ping || exit 1"
            --health-interval 5s
            --health-timeout 3s
            --health-retries 20
      env:
        REDIS_HOST: 127.0.0.1
        REDIS_PORT: 6379
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: 20 }
        - run: npm ci
        - run: npm test
- Testcontainers approach:
  - Just ensure Docker is available on the runner; Testcontainers will start Redis on-demand.
  - Good when you need ephemeral Postgres too (Task 1), allowing fully isolated parallel jobs.

10) Pitfalls and edge cases to watch for
- QueueScheduler removal: In BullMQ v4, scheduling is integrated; do not instantiate QueueScheduler (it existed in Bull).
- Hanging tests: Always close Worker, QueueEvents, Queue, and prisma.$disconnect() or tests will hang.
- maxRetriesPerRequest: Set to null in ioredis options for BullMQ to avoid timeouts during blocking operations.
- Unique queue names: Avoid cross-test event leakage; parameterize queue names (prefix + random suffix).
- Remove-on-complete: Use { removeOnComplete: true, removeOnFail: true } to keep the DB small during tests.
- Timeouts: Integration tests should have generous but finite timeouts; add explicit timeouts around waits for completed events.
- Race conditions: Do not rely only on queue.drain when testing completion of specific jobs. Prefer waitUntilFinished or QueueEvents completed events for those jobIds.
- Flaky “drained” semantics: Drained means no waiting jobs; it doesn’t guarantee no delayed jobs or retried jobs pending. Use explicit job completion tracking.
- FlowProducer and retries: If children retry and ultimately fail, the parent won’t run. Decide whether to tolerate failures by adding a separate “collector” job that runs regardless and inspects results in DB.

11) Optional: in-memory “fake queue” for unit tests of orchestrators
- For your orchestrator services (e.g., POST /api/scale/start), define a small interface so you can unit-test logic without BullMQ:
  export interface SimpleQueue<T> {
    add: (name: string, data: T, opts?: any) => Promise<{ id: string }>;
  }

  export class BullMQQueueAdapter<T> implements SimpleQueue<T> {
    constructor(private queue: Queue<T>) {}
    add(name: string, data: T, opts?: any) {
      return this.queue.add(name, data, opts);
    }
  }

  // Fake for unit tests:
  export class InMemoryQueue<T> implements SimpleQueue<T> {
    jobs: Array<{ name: string; data: T; opts?: any; id: string }> = [];
    async add(name: string, data: T, opts?: any) {
      const id = Math.random().toString(36).slice(2);
      this.jobs.push({ name, data, opts, id });
      return { id };
    }
  }
- This lets you validate “N jobs created with correct data” without Redis. Use integration tests for actual processing.

12) How this ties into your project tasks
- Task 6 (Scale Testing):
  - Queue: scale-conversation-queue
  - Worker: processes each conversation (goal <= 25 messages, storing Message rows; mark goalReached).
  - Orchestration: either FlowProducer or a controller that listens to completions and then enqueues a summarization job into scale-report-queue.
  - Tests:
    - Unit: Summarizer prompt builder is deterministic (already in your test plan).
    - Integration: Spin Redis (Testcontainers), run N jobs with a fake LLM; assert RunReport fields and revised prompt; ensure runCount cap enforced by /api/scale/start.
    - UI: Snapshot tests for summary and revised prompt; ensure progress polling shows correct states.
- Task 5 (Hub):
  - Queue: battles-queue
  - Worker: runs a single battle until goal or limit of 25 messages; writes Conversation + Messages; returns final status.
  - Tests:
    - Unit: Validate form/whitelist logic.
    - Integration: Enqueue multiple battles; poll status endpoint until complete; assert that “goal reached” vs “limit reached” semantics work.
    - E2E: Run with fake LLM provider to simulate concurrent sessions and verify live progress.

13) Example: a concise Worker + QueueEvents harness you can reuse
- Worker factory:
  import { Worker, QueueEvents, Queue, JobsOptions, Job } from 'bullmq';

  export function makeWorker<TData, TReturn>(
    queueName: string,
    processor: (job: Job<TData>) => Promise<TReturn>,
    connection: any,
    concurrency = 4
  ) {
    const worker = new Worker<TData, TReturn>(queueName, processor, { connection, concurrency });
    const events = new QueueEvents(queueName, { connection });
    const queue = new Queue<TData, TReturn>(queueName, { connection });
    const ready = Promise.all([worker.waitUntilReady(), events.waitUntilReady()]);
    const close = async () => {
      await Promise.all([worker.close(), events.close(), queue.obliterate({ force: true }), queue.close()]);
    };
    return { worker, events, queue, ready, close };
  }

- Test usage:
  const harness = makeWorker('scale:test:123', makeScaleProcessor(deps), connection, 4);
  await harness.ready;
  const job = await harness.queue.add('conversation', data, { removeOnComplete: true, removeOnFail: true });
  const res = await (await harness.queue.getJob(job.id)).waitUntilFinished(harness.events, 10000);
  expect(res.goalReached).toBe(true);
  await harness.close();

14) Bottom line
- The ecosystem has settled on “use a real Redis” for BullMQ tests. Mocks are not up to the task, especially for streams and Lua-driven features BullMQ relies on.
- For this project, combine pure-function unit tests for processors with Testcontainers-powered integration tests for BullMQ plumbing. This yields fast, deterministic tests locally and in CI, and aligns perfectly with your Task 5/6 requirements.
- Start small: one Redis container, fake LLM provider, and a handful of deterministic jobs. Then grow to Postgres-in-the-loop integration tests as Task 1 lands.


---

*Generated by Task Master Research Command*  
*Timestamp: 2025-08-12T08:32:17.730Z*
