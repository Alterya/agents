---
title: Streaming and Queueing in Next.js (App Router)
status: proposed
date: 2025-08-13
---

Context

We need resilient streaming responses for chat and background execution for battle/scale runs in a Next.js App Router app deployed to serverless. The system must support incremental UI updates, cap long-running work, and provide a durable option when Redis is available.

Options considered

1) Pure SSE from Route Handlers (Node runtime)
   - Pros: Simple, browser-native; fits incremental chat updates
   - Cons: Sensitive to serverless timeouts and multi-instance; not ideal for long jobs or fleet fan-out

2) Polling-first with best-effort SSE
   - Pros: Robust on serverless; compatible with multi-instance; simple caching
   - Cons: More requests; requires minimal client state

3) WebSockets
   - Pros: Bi-directional, low-latency
   - Cons: Infra complexity, stickiness/adapter requirements; overkill for our use case

4) Background jobs: in-process FIFO vs BullMQ+Redis
   - In-process (p-queue): zero external deps, good for short jobs
   - BullMQ (Upstash Redis): durability, scheduling, limiter, visibility; needs a dedicated worker (not on Vercel lambdas)

Decision

- Default to Polling-first with a best-effort SSE endpoint for short, interactive streams (chat). Use Node runtime for SSE.
- Provide an in-process FIFO queue (concurrency=3) by default; when REDIS_URL is set and a worker heartbeat is present, enqueue via BullMQ and process in an external worker service.
- Do not run BullMQ Workers inside the Next.js deployment. The app only enqueues and reads job status.
- Enforce caps: runCount<=10, messageLimit<=25, per-IP concurrent jobs<=3. Apply exponential backoff on transient LLM errors and respect provider rate limits.

Implications

- Route shapes (examples):
  - POST /api/battles/start -> { jobId }
  - GET /api/battles/:jobId/status -> { state, progress, conversationId, endedReason }
  - GET /api/battles/:conversationId/messages?sinceSeq -> { messages[], nextSeq }
  - POST /api/scale/start -> { runId }
  - GET /api/scale/:runId/status -> { state, progress, completed, total }
  - GET /api/scale/:runId/report -> RunReport
  - GET /api/stream/:conversationId -> text/event-stream (best-effort)

- Streaming notes
  - Use Node runtime only for SSE; Edge is not suitable for our server-side assembly
  - Prefer polling as the primary UX on serverless; SSE used for incremental UX for short-lived operations

- Queueing notes
  - In-process FIFO: guard global initialization with globalThis to avoid duplicates during hot reload
  - BullMQ path: singletons for Queue instances; limiter tuned per provider; removeOnComplete/Fail with age/count; idempotent job keys; Redis heartbeat checks to decide path

- Persistence/telemetry
  - Persist messages per turn; maintain seq per conversation; expose nextSeq for efficient deltas
  - Record judge decisions per turn (verdict/criteria) for goal detection; aggregate usage/cost per run

Operational defaults

- p-queue: concurrency=3; abort handling via AbortSignal; TTL for in-memory maps/event emitters
- BullMQ: limiter { max, duration } per provider; removeOnComplete: { age: 86400, count: 1000 }, removeOnFail: { age: 604800, count: 1000 }
- Health: worker heartbeat key worker:background:heartbeat:{region} (TTL 30–60s)
- Idempotency: use conversationId/runId as idempotency keys; return existing job where applicable

Client guidance

- Poll status at a modest cadence with backoff; switch to SSE only for interactive chat streams
- Render incremental messages using sinceSeq; fall back gracefully on network failures

Security & limits

- Validate inputs via zod; sanitize logs; redact secrets; enforce per-IP concurrency and run/message caps

Status & follow-up

- Implement per Task 3 subtasks; document runtime requirements in README
- Provide a dedicated worker deployment guide for BullMQ + Upstash Redis


