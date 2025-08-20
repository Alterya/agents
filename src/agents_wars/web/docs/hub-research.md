# Hub Research: UI components, caching, and realtime strategy

This note summarizes implementation decisions and references for the Agent Wars Hub and Arena experiences.

## shadcn/ui component APIs and a11y gotchas

- Select: controlled value + onChange; ensure label association and keyboard navigation. Prefer native <select> for basics to keep bundle small; migrate to shadcn Select when custom popover UX is needed.
- Textarea / Input: controlled with value + onChange; ensure aria-invalid and inline error descriptions when validation fails.
- Button: prefer type="button" for non-submit actions; use aria-busy during async actions.
- Tabs/Card: tabs for Hub vs Arena separation; ensure role=tablist, aria-selected and focus ring.

References: ui.shadcn.com (components), WCAG 2.2 AA keyboard and label guidance.

## Next.js fetch caching & route handlers

- Client polling (recommended default): use fetch(url, { cache: "no-store" }) to bypass the cache.
- Server components/data loaders: use revalidation (ISR) for static lists (e.g., agents) when allowed, but avoid for frequently changing statuses.
- Route Handlers: return JSON for polling paths; for SSE, set headers: content-type: text/event-stream, cache-control: no-cache, no-transform, connection: keep-alive.

## Polling vs SSE on Vercel (Node vs Edge)

- Polling (1–2s) is robust on serverless; add backoff to 3–5s after consecutive stable results; stagger intervals per session to avoid thundering herd.
- SSE can work in Node runtime, but long-lived connections may be interrupted by serverless lifecycle, proxies, or timeouts; require keep-alives and careful error handling. Prefer polling by default; gate SSE behind a feature flag.
- Budget/cost telemetry should be included in status payloads when available; otherwise computed client-side as a hint only.

## Model whitelist & validation strategy

- Source of truth: GET /api/config/provider-status returns allowedModels (from validated config or env ALLOWED_MODELS).
- UX: when allowedModels.length > 0, render a model <select> of allowed items and disable Start when selection is not in the list; otherwise render a text input.
- Persist last provider/model to localStorage and hydrate on load.

## Price map & estimates

- Pricing references: OpenAI and OpenRouter public pricing pages.
- Strategy: naive estimate in UI (tokens≈chars/4; flat per‑1k rate); label as estimate and do not block on cost unless an explicit cap is set. Compute authoritative usage on the server when possible.

## Hub orchestration summary (current impl)

- Start: POST /api/battles/start returns 202 { id }.
- Progress: Poll GET /api/battles/:jobId/status?format=json every 1–2s with jitter/backoff; when data.conversationId present, fetch messages.
- Messages: GET /api/battles/:conversationId/messages?page=1&limit=100 for simple incremental display (future: sinceSeq).
- Stop: POST /api/battles/:jobId/cancel; on failure, immediately set endedReason=manual in UI and stop polling that session.
- Safeguards: model whitelist enforced; Start disabled when invalid; keyboard shortcuts (Cmd/Ctrl+Enter to start, S to stop latest).

## Arena (A/B) guidance (for later)

- Identity masking until reveal; single-input broadcast to both sides; identical gen params; allow manual winner select and optional LLM‑as‑judge.
- Outcome tie-breakers: goal-first, then fewer turns, fewer tokens, lower median latency.
- Budget caps per side; auto-stop and annotate endedReason="limit:budget".

References: LMSYS Chatbot Arena UX patterns; Elo/BTL/TrueSkill rating methods.
