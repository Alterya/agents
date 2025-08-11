---
title: Research Session
query: "BullMQ with Upstash Redis on Vercel: serverless worker patterns, pitfalls, recommended configuration (2024-2025)."
date: 8/11/2025
time: 6:24:27 PM
timestamp: 2025-08-11T15:24:27.979Z
exchanges: 1
---

# Research Session

## Initial Query

**Question:** BullMQ with Upstash Redis on Vercel: serverless worker patterns, pitfalls, recommended configuration (2024-2025).

**Response:**

Below is a practical, 2024–2025-ready guide to using BullMQ with Upstash Redis on Vercel for this project’s background execution needs (battles, scale tests, persistence, and streaming updates). It’s tailored to Task 3 (Background execution APIs), and influences Task 5 (Hub concurrent battles) and Task 6 (Scale Testing). It covers serverless worker patterns, pitfalls you will hit on Vercel, and recommended configuration, with code you can drop into the repo.

High-level executive summary
- Vercel cannot host long-lived workers. BullMQ requires a long-lived Worker process. Use Upstash Redis as the queue store and host the Worker off-Vercel (Fly.io, Railway, Render, ECS/Fargate, a small VM, or a Docker container somewhere).
- In API routes on Vercel, only enqueue/read job state; never instantiate Workers or QueueEvents there.
- Provide a built-in in-process runner fallback when REDIS_URL is absent or if a worker heartbeat isn’t detected. This is critical to keep the app usable in dev and for small deployments.
- Persist progress and final results to your DB; have the UI poll or use SSE that polls (server re-reads from DB/Redis). Avoid direct Redis pub/sub in Vercel routes for progress streaming.
- Upstash Redis works fine with BullMQ; but be careful with connection counts, latency, and cost. Use singletons, minimal connections, removeOnComplete/Fail cleanup, and lower concurrency to control LLM rate limits/costs.

Recommended architecture for this project
1) Two modes
- In-process mode (default): If REDIS_URL not set, POST /api/battles/start runs runBattle inline (in a Background Function if on Vercel to allow longer time), persists messages, and streams progress using SSE (polling from DB or in-memory state for the single request).
- Queue mode (preferred for concurrent sessions and scale tests): If REDIS_URL is set, the API enqueues in BullMQ, returns jobId, and workers process in the background. API endpoints poll job state and DB for messages.

2) Off-Vercel Worker
- Create a small Node service (single script) that creates BullMQ Workers for “battles” and “scale” queues and calls runBattle and runScaleTest. Deploy this service to Fly.io/Railway/Render/etc.
- The worker sets a heartbeat key in Redis so your Vercel API can detect whether a worker is running; if not, fall back to in-process mode or return a clear 503 with guidance.

3) Queue usage in API routes
- Only instantiate Queue, never Worker or QueueEvents.
- Add jobs with defaultJobOptions that clean up completed/failed jobs and limit retries.
- For status, read job.getState(), job.getProgress(), and/or store progress in DB as the canonical single source of truth (recommended).

4) Streaming updates for UI (Task 3/5/6)
- Provide polling endpoints (simple JSON status) for robust behavior on Vercel.
- Optionally provide basic SSE endpoints that poll DB/Redis every 1s and emit events. Run those routes as Node runtime with an increased maxDuration (still limited by Vercel, typically up to 15 minutes on Background Functions). SSE should be “best-effort.”

Minimal code: connection, queues, and worker
- Versions: Node 18+, bullmq ^5.x, ioredis ^5.x.

redis.ts
- Shared ioredis connection tuned for Upstash + serverless.

import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;

export function makeRedis() {
  if (!REDIS_URL) return undefined as unknown as IORedis.Redis; // in-process mode
  const isTls = REDIS_URL.startsWith('rediss://');
  return new IORedis(REDIS_URL, {
    // Prevent long cold starts on serverless, BullMQ recommends these:
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    // Serverless-friendly:
    enableOfflineQueue: false,
    keepAlive: 10_000,
    tls: isTls ? {} : undefined,
  });
}

let redisSingleton: IORedis.Redis | undefined;
export function getRedis() {
  if (!REDIS_URL) return undefined as unknown as IORedis.Redis;
  if (!redisSingleton) {
    redisSingleton = makeRedis();
  }
  return redisSingleton;
}

queues.ts
- Instantiate queues as singletons; never create Workers here.

import { Queue } from 'bullmq';
import { getRedis } from './redis';

const connection = getRedis();

function makeQueue(name: string) {
  if (!connection) return undefined as unknown as Queue; // in-process mode
  return new Queue(name, {
    connection,
    defaultJobOptions: {
      attempts: 2, // keep low; LLM operations are expensive
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 3600, count: 5000 }, // keep 1 hour or last 5k
      removeOnFail: { age: 24 * 3600 }, // keep 24 hrs
      // optional: jobId strategy for idempotency, e.g., conversationId
    },
  });
}

declare global {
  // For Next.js dev hot-reload
  var battleQueueGlobal: Queue | undefined;
  var scaleQueueGlobal: Queue | undefined;
}

export const battleQueue =
  globalThis.battleQueueGlobal ?? makeQueue('battles');
export const scaleQueue =
  globalThis.scaleQueueGlobal ?? makeQueue('scale');

if (process.env.NODE_ENV !== 'production') {
  globalThis.battleQueueGlobal = battleQueue;
  globalThis.scaleQueueGlobal = scaleQueue;
}

worker.ts (standalone process, not deployed to Vercel)
- Run on Fly/Railway/etc.

import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { runBattle } from './runners/runBattle';
import { runScaleTest } from './runners/runScaleTest';

const REDIS_URL = process.env.REDIS_URL!;
const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  enableOfflineQueue: false,
  keepAlive: 10_000,
  tls: REDIS_URL.startsWith('rediss://') ? {} : undefined,
});

const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '2', 10);

// Optional limiter to avoid hammering LLM providers:
const limiter = {
  // e.g., max 5 jobs per 10 seconds across all workers
  max: parseInt(process.env.WORKER_RATE_MAX || '5', 10),
  duration: parseInt(process.env.WORKER_RATE_DURATION_MS || '10000', 10),
};

const battleWorker = new Worker(
  'battles',
  async (job) => {
    await runBattle(job); // persist messages; update progress
  },
  { connection, concurrency, limiter }
);

const scaleWorker = new Worker(
  'scale',
  async (job) => {
    await runScaleTest(job); // orchestrates N runs; or enqueues N child jobs
  },
  { connection, concurrency, limiter }
);

// Health heartbeat (so API can detect the worker)
import ms from 'ms';
async function heartbeat() {
  try {
    await connection.set('workers:heartbeat', Date.now().toString(), 'EX', 30);
  } catch {}
  setTimeout(heartbeat, ms('10s'));
}
heartbeat();

battleWorker.on('failed', (job, err) => {
  // Persist failure reason to DB for UI
  console.error('Battle job failed', job?.id, err);
});
scaleWorker.on('failed', (job, err) => {
  console.error('Scale job failed', job?.id, err);
});

Notes:
- From BullMQ v4+, QueueScheduler is no longer needed.
- Avoid QueueEvents inside Vercel routes (uses pub/sub connections); prefer polling job state.

API usage pattern (Next.js Route Handlers)
- Start battle (Task 3/5):
  - If REDIS_URL exists and worker heartbeat is fresh, enqueue to battleQueue and return { jobId, conversationId }.
  - Else: run in-process runBattle(); optionally wrap in Vercel Background Function to allow up to ~15 min.

- Status endpoint:
  - Return { state, progress, updatedAt } from job or DB. If using Queue mode, read job = await battleQueue.getJob(jobId) and job.getState()/progress. For in-process mode, read from DB.

- Messages endpoint:
  - Always read from DB (canonical). The worker or in-process runner must persist after each assistant/user message.

- SSE endpoint:
  - Node runtime; set maxDuration to a safe upper bound (e.g., 300s). Poll DB/Redis every ~1s and emit events. Don’t rely on pub/sub.

Example: POST /api/battles/start (simplified)
import { battleQueue } from '@/lib/queues';
import { isWorkerAlive } from '@/lib/workerHeartbeat';
import { runBattle } from '@/lib/runners';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.json();
  const { provider, model, agentId, systemPrompt, goal } = body;

  // Create conversation in DB; generate conversationId
  const conversationId = await createConversation({ provider, model, agentId, systemPrompt, goal });

  const useQueue = !!process.env.REDIS_URL && await isWorkerAlive();

  if (useQueue && battleQueue) {
    const job = await battleQueue.add('battle', { conversationId, provider, model, agentId, systemPrompt, goal }, { jobId: conversationId });
    return Response.json({ mode: 'queue', jobId: job.id, conversationId }, { status: 202 });
  }

  // Fallback in-process
  // Optionally, offload to Vercel Background Function via unstable_after()
  // For simplicity, run inline:
  runBattle({ data: { conversationId, provider, model, agentId, systemPrompt, goal } })
    .catch(err => { /* persist failure */ });

  return Response.json({ mode: 'in-process', jobId: conversationId, conversationId }, { status: 202 });
}

workerHeartbeat.ts
import { getRedis } from './redis';

export async function isWorkerAlive() {
  const r = getRedis();
  if (!r) return false;
  try {
    const ts = await r.get('workers:heartbeat');
    if (!ts) return false;
    const age = Date.now() - Number(ts);
    return age < 25_000; // < 25s old
  } catch {
    return false;
  }
}

SSE route skeleton
- Works for both modes by polling DB for new messages and progress. Note: set an upper timeout.

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id } = params; // jobId or conversationId
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const write = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      const send = async () => {
        // Read from DB: messages, progress, status
        const payload = await getStatusAndMessages(id);
        write(payload);
        if (payload.state === 'completed' || payload.state === 'failed') {
          controller.close();
          clearInterval(t);
        }
      };
      const t = setInterval(() => send().catch(() => {}), 1000);
      // Send immediately
      send().catch(() => {});
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

Upstash Redis + BullMQ compatibility and configuration
- Compatibility: Upstash Redis supports Redis >= 7 semantics, streams (XADD, XREADGROUP), Lua (EVAL/EVALSHA), pub/sub. BullMQ relies heavily on streams and Lua; Upstash is compatible.
- Connection limits: Upstash plans have connection caps. BullMQ creates multiple connections per instance (client, subscriber, blocking client). Mitigate:
  - Never create Workers in serverless routes.
  - Use a single off-platform Worker service.
  - In API routes, reuse a singleton Queue instance (1–2 connections).
  - Avoid creating QueueEvents in routes; prefer polling job state or DB.
- Latency: Pick an Upstash region close to your Vercel deployment region. In Next.js Route Handlers, set:
  - export const runtime = 'nodejs'
  - export const preferredRegion = 'iad1' (or your region)
- ioredis options (above) are important for serverless. Set maxRetriesPerRequest: null and enableReadyCheck: false to avoid hangs. enableOfflineQueue: false prevents queuing commands when disconnected (safer in serverless).
- Cleanup: Use removeOnComplete/removeOnFail to avoid unbounded growth in Upstash.
- Cost: Upstash bills per command; BullMQ uses several commands per job step (xadd, xack, zadd, eval…). Limit progress updates (e.g., only after each assistant reply), keep attempt counts low, cap runCount in scale tests (already capped <= 10).

Worker design for battles and scale tests
- Concurrency: Start low (2–4), matching provider rate limits. Use BullMQ limiter to avoid bursts that cause 429s from LLM providers.
- Idempotency: Give jobs deterministic jobId (e.g., conversationId) and ensure runBattle checks if the conversation already reached a terminal state. On retry, continue safely instead of duplicating messages.
- Progress: Call job.updateProgress({ step, total, messageCount, lastMessageAt }) after each assistant turn. Also persist to DB so UI/status endpoints don’t need QueueEvents.
- Cancellation: Provide a cancel route that writes a cancel flag in Redis (e.g., set battle:cancel:<conversationId> = 1). The worker periodically checks this flag between LLM calls; if present, gracefully abort and mark job as failed/cancelled, and persist that state to DB.
- Time limits: Impose a hard cap (25 messages) and stop-on-goal as per spec. Also set per-job “soft timeout” in your runner to avoid runaway cost if provider stalls.

Patterns on Vercel (serverless reality)
- Don’t run BullMQ Worker in Vercel route handlers or Edge Functions. They are short-lived and can’t maintain the Redis stream consumer reliably.
- If you must run jobs on Vercel without an external worker, prefer the in-process runner path and limit job duration to Background Function limits. This won’t scale for concurrency or large backlogs, but covers small use cases and local dev.
- SSE on Vercel is best-effort. Keep message frequency low (1/sec). Provide polling endpoints as a fallback; the Hub and Scale UI should be resilient to SSE disconnects.
- Testing on CI: If REDIS_URL exists in CI, run a lightweight worker process as part of the tests (node worker.ts &) and execute one job to validate the path. Otherwise, use in-process runner tests with a mocked LLM provider.

Pitfalls and mitigations
- Pitfall: Connection explosion
  - Creating Queue/Worker/QueueEvents per-request will quickly exceed Upstash connection caps and increase costs. Use singletons; only one Worker process.
- Pitfall: Relying on pub/sub with serverless
  - QueueEvents uses pub/sub; connections may drop on cold starts. Prefer direct polling of job state and DB for status and SSE. If you do need events off-platform (inside the worker process), it’s fine.
- Pitfall: Long-running serverless functions
  - Vercel limits execution time. Don’t block a route handler with a long job. Either enqueue or run in Background Function and stream limited-time SSE. Ensure UI also polls.
- Pitfall: LLM rate limits and cost spikes
  - Use limiter and low concurrency; implement exponential backoff; centralize provider rate limit config; optionally implement “circuit breaker” (temporary pause) on repeated 429s.
- Pitfall: Job retention and Redis bloat
  - Use removeOnComplete/removeOnFail with age/count to prevent unbounded growth. Provide a maintenance script to clean old keys if necessary.
- Pitfall: Time drift for delayed jobs
  - If using delayed jobs (less relevant here), be aware of potential region drift. Keep worker and Redis in same region.
- Pitfall: Worker not running
  - Implement heartbeat and API-side logic to fall back or inform the user/admin. Expose a /api/queue/health endpoint for the Hub/Scale UI to surface worker status.

Recommended queue settings (BullMQ options)
- Queue.defaultJobOptions
  - attempts: 1–2
  - backoff: exponential, delay 1–2s
  - removeOnComplete: { age: 3600, count: 5000 }
  - removeOnFail: { age: 24*3600 }
  - jobId: set to conversationId for battles (idempotency)
- Worker options
  - concurrency: 2–4
  - limiter: { max: 5, duration: 10000 } (tune to provider limits)
  - autorun: true
- Redis connection (ioredis)
  - maxRetriesPerRequest: null
  - enableReadyCheck: false
  - enableOfflineQueue: false
  - keepAlive: 10000
  - TLS on rediss://
- Region
  - Upstash region matched to your Vercel region; in Next.js routes, set preferredRegion and runtime = 'nodejs'.

How this integrates with Task 3, 5, 6 specifically
- Task 3 (Background execution + persistence + streaming)
  - Implement /api/battles/start to enqueue or fallback to in-process.
  - Implement /api/battles/:jobId/status and /api/battles/:conversationId/messages. The status endpoint can read job state when in queue mode; messages always from DB.
  - Implement /api/battles/:jobId/stream (SSE) that polls DB/Redis every 1s and flushes events. Cap at 5 minutes and tell client to retry if still running.
  - Implement a tiny classifier invocation after each assistant message to detect goal completion (store boolean in DB and mark job complete).

- Task 5 (Hub page)
  - Form POST calls /api/battles/start; store jobId+conversationId in sessions list.
  - Poll /api/battles/:jobId/status every 1–2s; optionally subscribe to SSE.
  - When complete or hitting 25 messages, show final state; ensure UI supports multiple concurrent sessions.

- Task 6 (Scale Testing)
  - Option A (simple): Enqueue N independent “battle” jobs with a runId and aggregate results by runId. The Worker writes runId in each conversation row; a summarizer job (in-process or queue) generates RunReport.
  - Option B (BullMQ Flow): Use parent job -> N children; complete when all children done. Simpler to start with Option A.
  - Provide /api/scale/:runId/status and /api/scale/:runId/report; UI polls until completion.
  - Summarization runs as a separate job or inline after N finish, with rate limits.

Observability and operations
- Health endpoints:
  - /api/queue/health: returns Upstash ping, workerHeartbeat age, counts = await battleQueue.getJobCounts()
- Metrics/logging:
  - Log Worker errors; persist failure reasons in DB for the UI.
  - Expose minimal admin route for counts: waiting, active, completed, failed.
- Cancel/retry:
  - /api/battles/:jobId/cancel sets cancel flag; Worker checks and aborts.
  - /api/battles/:jobId/retry re-enqueues if failed (or runs in-process if no worker).
- CI:
  - If REDIS_URL provided, boot a worker process in the CI pipeline and run one end-to-end job. Else, run in-process tests with mocked LLM.

When BullMQ is not ideal on Vercel (alternatives)
- If you want “purely serverless” on Vercel without running an external worker, consider:
  - Upstash QStash (HTTP-based queue/push model) or Vercel Queues (if available to you). These call back your HTTP route on Vercel; suitable for webhook-style, short processing tasks.
  - For long-running LLM orchestration, BullMQ with an off-platform Worker remains the most predictable approach.
- If you’re already on Cloudflare, Cloudflare Queues + Durable Objects/Workers can be a fully serverless option. But it requires platform shift.

Checklist of gotchas before shipping
- Ensure no Worker/QueueEvents is created in any Vercel route or module imported by a route.
- Verify Upstash region matches Vercel region to minimize latency.
- Rate limits: set limiter and concurrency; handle 429s from LLM with backoff.
- DB persistence after each assistant message; UI always reads from DB.
- SSE is optional; provide polling fallback. Set runtime and maxDuration in routes.
- Implement worker heartbeat and in-process fallback logic.
- Clean up jobs; cap retention.
- Load testing: 10 concurrent battles with small models; validate no 429 storms; memory stays stable; Upstash command costs acceptable.

Final notes (2024–2025 context)
- BullMQ v5 has eliminated the need for QueueScheduler; stick to Worker + Queue. Keep your BullMQ version current due to frequent fixes around streams and scripts.
- Upstash continues to improve serverless Redis performance, but cost scales with commands. Minimize job churn, progress updates, and QueueEvents usage from serverless.
- Vercel keeps enhancing Background Functions and Cron Jobs. Even so, they’re not a replacement for a long-lived queue worker. Your split-architecture (Vercel for API/UI + small worker service elsewhere) is the safest, production-ready pattern for this project.

If you want, I can provide:
- A complete worker Dockerfile and Procfile.
- Ready-to-use Next.js route handlers for start/status/messages/stream (wired to Prisma).
- A tiny “mock LLM provider” and tests for both in-process and BullMQ modes.


---

*Generated by Task Master Research Command*  
*Timestamp: 2025-08-11T15:24:27.979Z*
