---
title: Research Session
query: "Next.js 14 on Vercel: SSE/streaming limitations vs polling, recommended patterns for background progress updates (2024-2025)."
date: 8/11/2025
time: 6:21:13 PM
timestamp: 2025-08-11T15:21:13.431Z
exchanges: 1
---

# Research Session

## Initial Query

**Question:** Next.js 14 on Vercel: SSE/streaming limitations vs polling, recommended patterns for background progress updates (2024-2025).

**Response:**

Below is a pragmatic, 2024–2025-oriented guide to using SSE/streaming vs polling on Next.js 14 deployed on Vercel, with concrete patterns tailored to your project’s tasks (Hub concurrent battles, Scale Testing runs, PromptBro assist, and the LLM provider abstraction). It covers what works reliably on Vercel today, what doesn’t, and how to implement background progress updates without hitting platform limits.

High-level TL;DR
- Use SSE only for short-lived, interactive streams (e.g., token streaming from OpenAI/OpenRouter in PromptBro assist and single-message chat output). Keep each stream under ~60s and send heartbeat pings every 10–15s. Prefer Edge runtime if possible.
- Use polling for background, multi-minute workflows (e.g., Hub battles and Scale Testing runs). Poll every 1–2s while active; back off to 3–5s when idle or for large N. Store progress in Postgres and expose small, efficient status endpoints.
- For true background jobs beyond Vercel’s function limits (multi-minute/hours, fan-out, retries), use a job runner/queue (Inngest, Trigger.dev, Upstash QStash) or an external worker. Don’t expect a Vercel function to “keep working” after sending a response.
- If you absolutely need push-style live updates for long jobs, use a managed realtime service (Pusher/Ably/Supabase Realtime/Vercel Realtime) and publish progress from your job runner; otherwise, polling is the simplest and most reliable.

1) What Vercel supports today (and the practical limits)
- Route Handlers (Next.js 14 App Router) can stream responses and implement SSE. You can implement both in Node or Edge runtime. In either case, the function instance is held open until the response completes; streaming keeps the request “alive” and uses your function execution time.
- Time limits:
  - Serverless (Node) Functions: Plan-dependent max duration (commonly 10s for Hobby, ~60s for Pro; higher for Enterprise). If your streaming/chat takes longer than the max duration, Vercel will terminate it.
  - Edge Functions: Lower per-invocation compute budget but typically allow streaming for short sessions. Practically, you should still stay under ~60s end-to-end for a single request. You must keep emitting chunks/heartbeats to avoid proxy timeouts.
- No background after response: Vercel Functions do not continue to run after returning a response. Fire-and-forget “background work” inside a single invocation is not guaranteed and will often be killed. Use an external job runner or re-invocation strategy.
- Long-lived connections: WebSockets are now more broadly supported on Vercel than in earlier years, but they still tie up capacity and you must ensure a backend capable of pushing updates. For your use case (background LLM runs), SSE/websockets from Vercel Functions for minutes to hours are not recommended; use polling or a managed realtime service with a durable job runner.

2) When to prefer SSE (or token streaming) vs polling
- Good fits for SSE/streaming on Vercel:
  - Real-time token streaming of a single LLM response (< 60s). Example: PromptBro assist route returning the model’s suggestion as it’s generated.
  - Short-lived operations where immediate feedback is critical (AI chat compositing, progress of one small request).
- Avoid SSE for:
  - Long-running background jobs (minutes to hours), multi-run orchestration, or high concurrency. This includes your Scale Testing page and Hub concurrent battle runs. Use polling for status and messages instead.
- Polling guidance:
  - Poll every 1–2 seconds for active runs; fall back to 3–5 seconds during idle or when the UI is backgrounded (Page Visibility API).
  - Keep payloads small: Provide a /status endpoint with only { progress, counts, state } and separate /messages endpoints that support since/cursor parameters.
  - Use ETag or lastUpdated timestamps to allow conditional requests and avoid redundant data transfer.

3) Patterns that work well on Vercel for background progress
Recommended approach for Tasks 5 and 6:
- Orchestration + Persistence:
  - POST /api/battles/start or /api/scale/start creates a job record (e.g., RunReport or Run entity) in Postgres with status=queued, and an array of child run items.
  - A job runner triggers the actual work (see Job Runner Options below).
  - Worker updates DB rows regularly with progress: per-run status, message counts, errors, and overall aggregates. Use minimal write granularity (e.g., update progress every message or every few seconds).
- UI:
  - Poll GET /api/battles/:jobId/status or GET /api/scale/:runId/status to display progress bars and counts (finished, failed, in-progress). Keep the payload small (no message text).
  - For per-conversation chat history: GET /api/battles/:conversationId/messages?since=<iso or seq> to fetch incremental messages as the job proceeds. This prevents growing payloads and is easy to virtualize in the chat UI.

Job runner options (pick one; all are Vercel-proven):
- Inngest: Great for fan-out/background workflows, retries, and long-running state machines. Simple to trigger from your route, scales well, and can publish progress back to your DB. Developer UX is strong in 2024–2025.
- Trigger.dev (v3 Cloud): Similar space; good developer experience for orchestrating LLM workflows and cron/schedules.
- Upstash QStash: HTTP-triggered queue; your function receives a signed callback to process work. Good if you want a lighter-weight queue.
- External worker (Render/Fly/Railway): Run a persistent Node worker connected to your DB and/or queue. Very flexible if you need more control or custom concurrency.

Do not attempt:
- Spawning long loops within a single Vercel function expecting it to run for many minutes. It will get killed.
- Long-polling with timeouts > 30–60s at scale. You’ll tie up concurrent function executions and hit plan limits.

4) Implementing SSE correctly on Next.js 14 (short-lived streams)
Use this for PromptBro assist (Task 7), and optionally for streaming the assistant’s message in a single conversation view.

Key points:
- Prefer Edge runtime when you can (faster cold starts, web-standard streams).
- Set correct headers: Content-Type: text/event-stream; Cache-Control: no-cache, no-transform; Connection: keep-alive.
- Send an initial comment or heartbeat periodically to keep proxies from closing idle connections.
- Abort promptly if the client disconnects to avoid wasted compute.

Example: Edge SSE route handler that proxies an upstream LLM stream safely
export const runtime = 'edge';

function sseHeaders() {
  return {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  };
}

export async function POST(req: Request) {
  const { messages, model } = await req.json();
  const controller = new AbortController();
  const signal = controller.signal;

  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
    signal,
  });

  if (!upstream.ok || !upstream.body) {
    return new Response(`event: error\ndata: ${JSON.stringify({ error: 'Upstream failed' })}\n\n`, { headers: sseHeaders(), status: 502 });
  }

  const encoder = new TextEncoder();
  const pingEveryMs = 15000;
  let pingId: number | undefined;

  const stream = new ReadableStream({
    start(controller) {
      // Initial comment to open the stream quickly
      controller.enqueue(encoder.encode(': connected\n\n'));

      // Heartbeat
      // @ts-ignore - setInterval exists in edge runtime
      pingId = setInterval(() => {
        controller.enqueue(encoder.encode(': ping\n\n'));
      }, pingEveryMs);

      (async () => {
        const reader = upstream.body!.getReader();
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });

            // The OpenAI stream yields "data: {json}\n\n" lines; forward as-is, but never leak your API key
            for (const line of chunk.split('\n')) {
              if (line.startsWith('data:')) {
                controller.enqueue(encoder.encode(`${line}\n`)); // ends with \n
                controller.enqueue(encoder.encode('\n'));        // ensure double newline
              }
            }
          }
          controller.enqueue(encoder.encode('event: end\ndata: {}\n\n'));
          controller.close();
        } catch (e) {
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: 'stream_error' })}\n\n`));
          controller.close();
        } finally {
          if (pingId) clearInterval(pingId as any);
        }
      })();
    },
    cancel() {
      controller.abort();
      if (pingId) clearInterval(pingId as any);
    }
  });

  return new Response(stream, { headers: sseHeaders() });
}

Pitfalls:
- Don’t forward the upstream response object directly (you must terminate with your own headers; also security: never expose your API key).
- Ensure you close and clear intervals on cancel/close to avoid leaks.
- If using the official openai npm client with streaming in Edge, ensure it’s configured for edge fetch and web streams; otherwise, fall back to fetch as above.
- Keep each streamed response under ~60s. For longer content, either chunk requests or switch to non-streamed completions.

5) Implementing polling for your background workflows (Tasks 5 and 6)
Data model alignment (Task 1 + Task 6):
- RunReport:
  - id, runCount, completedCount, failedCount, startedAt, updatedAt, status: 'queued'|'running'|'complete'|'failed', summary JSON fields for aggregated metrics.
- Conversation:
  - id, runId (nullable for Scale), agentId, model, goal, goalReached (bool), endedReason, createdAt, updatedAt.
- Message:
  - id, conversationId, role, content, createdAt, tokenUsage, etc. Ensure an index on (conversationId, createdAt) and maybe (conversationId, id).

Status endpoints:
- GET /api/scale/:runId/status
  - Returns: { runId, status, completed, failed, total, startedAt, updatedAt, progress: number, conversationIds: string[] (optionally capped), lastEventAt }
  - Cache-Control: no-store
- GET /api/scale/:runId/report
  - Returns final summary and revised prompt once status=complete.
- GET /api/battles/:jobId/status
  - Same structure; omit sensitive details. Provide an eventSequence integer to support conditional polling (if-none-match/If-None-Match with ETag).

Messages pagination/incremental fetch:
- GET /api/battles/:conversationId/messages?sinceSeq=123
  - Return only new messages since the given sequence or timestamp.
  - Include nextSince in the response to chain requests.

Client polling strategy:
- Poll status every 1000–1500ms while running.
- If no change after N polls, backoff to 3–5s.
- Use AbortController to cancel in-flight polls when unmounting or switching runs.
- Stop polling when status is 'complete'|'failed'.

6) How this maps to your tasks
- Task 7 (PromptBro guided prompt creator):
  - Use streaming SSE in /api/promptbro/assist for interactive suggestions, capped tokens and short outputs. Stream tokens to the UI to improve perceived latency.
  - Ensure the LLM provider abstraction (Task 2) exposes stream: boolean and returns either an AsyncIterable or a Web Stream, so the route can pipe it to SSE.

- Task 5 (Agent Wars Hub for concurrent battles):
  - Start battle(s) via POST /api/battles/start; persist a session/jobId + conversationId(s).
  - Orchestrate in a background job runner (Inngest/Trigger.dev) that steps through messages until goal or 25-message cap, updating DB on each step.
  - UI polls /api/battles/:jobId/status at 1–2s; and polls /api/battles/:conversationId/messages for the chat UI. This avoids long-lived streams and is robust under Vercel limits.
  - Optional: for the active-focused conversation only, you could allow short-lived SSE streaming for the next assistant message to enhance UX; otherwise stick with polling for consistency.

- Task 6 (Scale Testing):
  - Similar to Hub but N background conversations fan out. Definitely avoid SSE; jobs can run longer than a minute, and you’ll need robust retries.
  - Summarization workflow kicks in when all runs end; that’s a separate short operation (can be non-streamed LLM call). UI keeps polling status until reportReady flag is true, then fetches /report.

- Task 2 (LLM provider abstraction):
  - Provide both streaming and non-streaming modes behind a single interface.
  - In streaming mode, expose a primitive that can be piped into an SSE route (e.g., return a Web ReadableStream or an async generator of string chunks).
  - Implement token caps and retries. For streamed responses, retries should apply only at the request level (not mid-stream). For background jobs, handle provider errors via your job runner’s retry policy.

7) Example: Provider abstraction with streaming pluggable to SSE
// provider.ts
export type ChatMessage = { role: 'system'|'user'|'assistant'|'tool', content: string };
export type ChatOptions = {
  provider: 'openai'|'openrouter',
  model: string,
  maxTokens?: number,
  temperature?: number,
  stop?: string[],
  stream?: boolean
};

export type StreamResult = {
  stream: ReadableStream<Uint8Array>, // Web stream for Edge piping
  cancel: () => void
};

export async function chat(messages: ChatMessage[], opts: ChatOptions): Promise<{ content: string } | StreamResult> {
  const body = {
    model: opts.model,
    messages,
    max_tokens: opts.maxTokens,
    temperature: opts.temperature,
    stop: opts.stop,
    stream: opts.stream ?? false,
  };

  const baseURL = opts.provider === 'openrouter'
    ? 'https://openrouter.ai/api/v1'
    : 'https://api.openai.com/v1';

  const res = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${opts.provider === 'openrouter' ? process.env.OPENROUTER_API_KEY! : process.env.OPENAI_API_KEY!}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Provider error: ${res.status}`);
  }

  if (opts.stream) {
    if (!res.body) throw new Error('No stream body');
    let aborted = false;
    const cancel = () => { aborted = true; res.body?.cancel().catch(() => {}); };
    return { stream: res.body, cancel };
  } else {
    const json = await res.json();
    return { content: json.choices?.[0]?.message?.content ?? '' };
  }
}

Then, in a route handler, pipe StreamResult.stream into SSE (as shown earlier). Always handle auth keys server-side.

8) Edge cases and pitfalls to avoid
- Proxy buffering and heartbeats: Without periodic writes (comment lines or small data), proxies between the user and Vercel can close idle SSE connections. Send a heartbeat every 10–15 seconds in SSE.
- Client abort: Use AbortController / request.signal. When the browser navigates away/closes the tab, your server code should abort upstream fetches and close the stream to save compute.
- Time limit overruns: If you see sudden disconnections or partial responses at ~60s, you’re hitting plan/runtime limits. Mitigate by:
  - Splitting the request into smaller chunks (e.g., shorter max tokens).
  - Switching to non-streaming (single completion) if a response is predicted to be long.
  - Using background jobs and polling (preferred for your batch/scale flows).
- Concurrent SSE connections: Each open SSE holds a function instance. Multiple concurrent streams per user can exhaust concurrency on smaller plans. For Hub/Scale, stick with polling.
- CORS: If you allow cross-origin access to your API routes, set proper CORS headers for SSE. Most of your use is same-origin, so default is fine.
- Don’t stream directly from OpenAI to the browser: You must proxy to prevent leakage of your API keys and to normalize error handling.

9) Optional: Using a realtime service instead of polling
If you want “push” updates without SSE limitations:
- Use Pusher, Ably, or Supabase Realtime (or Vercel Realtime if available to you). Your background job runner publishes progress events to a channel; the browser subscribes. This decouples connection lifetime from Vercel Function limits and scales better for many concurrent users.
- You still persist progress to Postgres for durability; the UI can fall back to polling if the realtime connection drops.
- This can be introduced incrementally: Start with polling; add realtime for a better UX on Hub/Scale later.

10) Concrete recommendations for your project
- PromptBro assist (Task 7):
  - Implement SSE streaming on Edge for the assist endpoint. Keep outputs compact (cap tokens). Add heartbeat and abort handling.
  - The provider abstraction (Task 2) should allow both streaming and non-streaming and return a Web stream in stream mode.

- Agent Wars Hub (Task 5):
  - Use POST /api/battles/start to enqueue jobs and return jobId + conversationId(s).
  - Drive the actual conversation loops in a job runner (Inngest recommended). Respect per-provider rate limits, retries, and stop when goal or 25 messages reached.
  - UI polls /status every 1–2s and fetches messages incrementally. Avoid SSE for background progress here.

- Scale Testing (Task 6):
  - Same as Hub but with fan-out (cap runCount <= 10 as specified). Orchestrate via job runner and store per-run status, partial failures, and a final RunReport row.
  - After all runs, kick off summarization as a new short job; fetch via /report when ready. Poll only.

- Data layer (Task 1):
  - Add fields to RunReport to support quick status reads without joining large tables: completedCount, failedCount, totalCount, lastEventAt, status enum.
  - Index Message on (conversationId, createdAt) and (conversationId, id). Consider a monotonically increasing sequence per conversation to support sinceSeq incremental fetch.

- Testing:
  - Integration tests for SSE routes: Simulate an EventSource client and assert receipt of tokens and heartbeats and proper termination within time bounds.
  - Load tests for polling endpoints: Ensure they return in <50ms with minimal payload and correct caching headers (Cache-Control: no-store).
  - End-to-end mocked runs to ensure the UI polls and transitions to final report.

11) Minimal code snippets for polling endpoints
Example status endpoint (Node or Edge; simple JSON, no caching):
export const runtime = 'nodejs'; // or 'edge'

import { db } from '@/lib/db';

export async function GET(_: Request, { params }: { params: { runId: string }}) {
  const run = await db.runReport.findUnique({
    where: { id: params.runId },
    select: { id: true, status: true, completedCount: true, failedCount: true, totalCount: true, updatedAt: true },
  });
  if (!run) return new Response('Not found', { status: 404 });

  const progress = run.totalCount
    ? Math.round(((run.completedCount + run.failedCount) / run.totalCount) * 100)
    : 0;

  const body = JSON.stringify({
    runId: run.id,
    status: run.status,
    completed: run.completedCount,
    failed: run.failedCount,
    total: run.totalCount,
    progress,
    updatedAt: run.updatedAt,
  });

  return new Response(body, {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

Example incremental messages endpoint:
export async function GET(req: Request, { params }: { params: { conversationId: string }}) {
  const url = new URL(req.url);
  const since = url.searchParams.get('sinceSeq') ? Number(url.searchParams.get('sinceSeq')) : 0;

  const messages = await db.message.findMany({
    where: { conversationId: params.conversationId, seq: { gt: since } },
    orderBy: { seq: 'asc' },
    take: 100,
    select: { seq: true, role: true, content: true, createdAt: true },
  });

  const nextSince = messages.length ? messages[messages.length - 1].seq : since;

  return new Response(JSON.stringify({ messages, nextSince }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

12) Final decision framework
- Use SSE (Edge) for:
  - Single LLM responses where streaming improves UX and finishes under ~60s.
- Use polling for:
  - Any background, multi-step orchestration (Hub/Scale). Persist progress and poll.
- Use a job runner / queue for:
  - All background workflows that exceed a single function call’s time limits, require retries, or fan-out/fan-in semantics.
- Consider realtime service if:
  - You need push updates for long jobs. Keep polling as fallback.

This approach aligns with Vercel’s strengths and avoids the common pitfalls of long-lived function execution. It keeps PromptBro interactive, makes Hub/Scale robust and scalable, and fits neatly with your Prisma schema, provider abstraction, and UI polling plans.


---

*Generated by Task Master Research Command*  
*Timestamp: 2025-08-11T15:21:13.431Z*
