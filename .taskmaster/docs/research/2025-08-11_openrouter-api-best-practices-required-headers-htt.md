---
title: Research Session
query: "OpenRouter API best practices: required headers (HTTP-Referer, X-Title), rate limits, model listing APIs, pricing considerations (2025)."
date: 8/11/2025
time: 6:28:55 PM
timestamp: 2025-08-11T15:28:55.949Z
exchanges: 1
---

# Research Session

## Initial Query

**Question:** OpenRouter API best practices: required headers (HTTP-Referer, X-Title), rate limits, model listing APIs, pricing considerations (2025).

**Response:**

Below is a practical, engineering-focused guide to using OpenRouter effectively in 2025 for this project, with specifics you can drop into Task 2 (provider abstraction) and considerations that directly impact Tasks 5, 6, and 7 (concurrency, scale testing, and pricing/cost-controls).

1) Required and recommended headers for OpenRouter
- What to send on every request:
  - Authorization: Bearer YOUR_OPENROUTER_API_KEY
  - HTTP-Referer: The fully qualified origin of your app (e.g., https://yourapp.com). For local dev, use http://localhost:3000. This helps OpenRouter attribute traffic and typically improves rate-limit fairness, especially for serverless/IP-rotating hosts.
  - X-Title: A short, human-friendly name of your app (e.g., PromptBattles). Improves attribution and support visibility.
- Are HTTP-Referer and X-Title strictly required? Practically speaking: treat them as required. While some requests may work without them, OpenRouter’s docs emphasize including both. Not sending them can lead to stricter rate limiting, especially if your IP address rotates (e.g., Vercel/Netlify/serverless). In a batch/scale-testing context (Tasks 5 and 6), these headers materially reduce the chance of 429 spikes.
- Where to add them in this project:
  - In Task 2’s OpenRouter client adapter, configure defaultHeaders on the OpenAI v4 client you’ll reuse for OpenRouter by overriding its baseURL.
  - Set HTTP-Referer using APP_URL (prod domain) with a fallback to localhost. Set X-Title using a static, short app name.

Example: OpenRouter client (TypeScript, OpenAI v4 client)
import OpenAI from 'openai';

export function createOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY');

  const referer = process.env.APP_URL ?? 'http://localhost:3000';
  const title = process.env.APP_NAME ?? 'PromptBattles';

  return new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': referer,
      'X-Title': title,
    },
    // Reasonable request timeout; tune as needed for larger contexts
    timeout: 90_000,
  });
}

2) Rate limits and resiliency best practices
- Reality in 2025: Rate limits vary by model/vendor and are dynamic. OpenRouter does not publish a single global RPM per account; throughput can change based on account reputation, recent usage, provider health, and model. Don’t hardcode magic numbers. Design for 429 resilience and dynamic adaptation.
- What to implement in Task 2 (provider abstraction):
  - Concurrency limiter: Limit concurrent in-flight requests. Start conservatively (e.g., 3–5 concurrent calls per model) and ramp up if you see headroom. For batch pages (Tasks 5 and 6), allow per-run concurrency configuration (with a sane cap).
  - Exponential backoff with jitter: On 429/5xx, retry with decorrelated jitter (e.g., base 250–500 ms, max 10–20 s) up to 3–5 tries.
  - Budget-aware retries: In Scale Testing (Task 6), stop early if estimated cost for the batch risks exceeding a configured cap.
  - Idempotency: If you implement batching that could be replayed, use conversation/run IDs and persist partial progress to avoid double-charging if a retry actually succeeded server-side but the client timed out.
  - Timeouts: Don’t leave requests hanging forever. Use a 60–90s timeout for chat completions, shorter for listing models.
  - Surface Retry-After: If OpenRouter returns Retry-After headers (not guaranteed), obey them to sleep before retrying.
- Detecting and handling 429:
  - Treat HTTP 429 as either “slow down globally” or “slow down for this model.” Back off and reduce concurrency by 1 for that model for a window (e.g., 30–60s).
  - Persist a model-level “cooldown until” timestamp if repeated 429s occur.
- Streaming and rate limits: Streaming responses do not change rate-limit math; you still consume one request. Keep concurrency controls identical for streamed and non-streamed calls.

3) Model listing API (dynamic models + metadata)
- Endpoint: GET https://openrouter.ai/api/v1/models
- Auth and headers: Use the same Authorization, HTTP-Referer, and X-Title headers.
- Response shape (typical fields; subject to evolution):
  - data[]: array of model objects
    - id: string like "openai/gpt-4o-mini" or "anthropic/claude-3-haiku"
    - name: human-friendly name
    - context_length: integer (max tokens)
    - pricing: object with input/output (or prompt/completion) prices per 1M tokens in USD; some models may omit or include request/image fields
    - capabilities/architecture: may include modalities (text, image, audio), tool_use support, function calling support, etc.
    - top_p/top_k/min_p: optional defaults
    - vendor/provider metadata
- Best practice for this project:
  - Fetch and cache the list daily (or every few hours) server-side. Provide a manual admin refresh command.
  - Store a normalized in-memory cache and optionally persist to DB for historical cost estimation reproducibility.
  - Maintain a UI whitelist per page (Tasks 5 and 6) to avoid exposing unstable/unsupported models. Use model capabilities to filter (e.g., text-only for your chat flows).
  - Display context window and pricing next to the model selector.

Example: Fetcher with cache
type OpenRouterModel = {
  id: string;
  name: string;
  context_length?: number;
  pricing?: {
    prompt?: string | number;     // some models use "prompt"/"completion"
    completion?: string | number;
    input?: string | number;      // others use "input"/"output"
    output?: string | number;
    request?: string | number;    // optional per-request flat fee
    image?: string | number;      // optional image pricing per unit
  };
  architecture?: {
    modalities?: string[];
  };
};

let modelCache: { data: OpenRouterModel[]; fetchedAt: number } | null = null;
const MODELS_TTL_MS = 6 * 60 * 60 * 1000; // 6h

export async function listOpenRouterModels(client = createOpenRouterClient()) {
  if (modelCache && Date.now() - modelCache.fetchedAt < MODELS_TTL_MS) {
    return modelCache.data;
  }
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': process.env.APP_URL ?? 'http://localhost:3000',
      'X-Title': process.env.APP_NAME ?? 'PromptBattles',
    },
  });
  if (!res.ok) {
    throw new Error(`OpenRouter /models failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  modelCache = { data: json.data ?? [], fetchedAt: Date.now() };
  return modelCache.data;
}

4) Pricing considerations (2025) and cost guards
- Pricing source of truth: The /models endpoint. Prices change; don’t hardcode. OpenRouter standardizes to USD per 1M tokens for input/prompt and output/completion. Some entries use input/output; others use prompt/completion—normalize both. Some models include a per-request fee.
- Normalizing prices:
  - pricePerTokenInput = (input || prompt) / 1_000_000
  - pricePerTokenOutput = (output || completion) / 1_000_000
  - If request fee exists, add it per call in your estimator.
- Estimating cost before issuing a call:
  - Use a tokenizer (e.g., gpt-tokenizer for cl100k_base) to approximate tokens for input. For output, use maxTokens as an upper bound or a reasonable expected output tokens (e.g., 30–50% of input tokens) when budgeting batch runs.
  - This is especially important for Task 6 (Scale Testing) to:
    - Cap total estimated spend per run and per batch.
    - Abort early and report “budget exceeded” gracefully.
- Logging and reporting:
  - Store per-call: modelId, promptTokens, completionTokens, per-call cost.
  - Aggregate to Conversation and RunReport (Task 1 schema includes RunReport).
  - For the Scale Testing page (Task 6), display total spend estimate vs. actuals, with failures and suggested prompt revision.
- 2025 dynamics to anticipate:
  - Frequent model/pricing changes and new providers joining/leaving.
  - “Reasoning” or “thinking” models with separate “reasoning token” pricing. If OpenRouter exposes reasoning pricing fields in /models, treat them similarly: normalize per 1M tokens and incorporate into estimates. If not exposed, treat unknown as 0 and annotate uncertainty in the UI.
  - Per-request image or audio processing fees for multimodal endpoints.

Example: Cost estimator utility
type NormalizedPricing = {
  inPerToken: number;   // USD per token
  outPerToken: number;  // USD per token
  requestFee: number;   // USD per request
};

export function normalizePricing(raw: OpenRouterModel['pricing']): NormalizedPricing {
  const get = (v?: string | number) => (v == null ? 0 : typeof v === 'string' ? parseFloat(v) : v);
  const prompt = get(raw?.prompt);
  const completion = get(raw?.completion);
  const input = get(raw?.input);
  const output = get(raw?.output);
  const request = get(raw?.request);
  const inUSDPerMillion = input || prompt || 0;
  const outUSDPerMillion = output || completion || 0;
  return {
    inPerToken: inUSDPerMillion / 1_000_000,
    outPerToken: outUSDPerMillion / 1_000_000,
    requestFee: request,
  };
}

export function estimateCost(pricing: NormalizedPricing, promptTokens: number, maxOutputTokens: number) {
  return pricing.requestFee +
    pricing.inPerToken * promptTokens +
    pricing.outPerToken * maxOutputTokens;
}

5) Unified provider adapter for OpenRouter and OpenAI
- Using OpenAI’s official client for both providers:
  - For OpenRouter: baseURL = https://openrouter.ai/api/v1, defaultHeaders include HTTP-Referer and X-Title.
  - For OpenAI: default baseURL; use OPENAI_API_KEY.
- Interface (Task 2):
  - messages: { role: system|user|assistant|tool, content: string }[]
  - opts: { provider: 'openai'|'openrouter', model: string, maxTokens?, temperature?, stop?, stream? }
  - Return: { content, usage, raw } with usage tokens and cost if possible.

Example: Unified chat()
import OpenAI from 'openai';

type ChatMessage = { role: 'system'|'user'|'assistant'|'tool', content: string };
type ChatOptions = {
  provider: 'openai'|'openrouter';
  model: string;
  maxTokens?: number;
  temperature?: number;
  stop?: string[];
  stream?: boolean;
};

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const openrouterClient = createOpenRouterClient();

export async function chat(messages: ChatMessage[], opts: ChatOptions) {
  const client = opts.provider === 'openrouter' ? openrouterClient : openaiClient;
  const req = {
    model: opts.model,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    max_tokens: opts.maxTokens,
    temperature: opts.temperature,
    stop: opts.stop,
    stream: opts.stream ?? false,
  };

  try {
    if (req.stream) {
      const stream = await client.chat.completions.create(req as any);
      // You can return the stream directly to the caller/UI
      return { stream };
    } else {
      const resp = await client.chat.completions.create(req as any);
      const choice = resp.choices?.[0];
      const content = choice?.message?.content ?? '';
      const usage = resp.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      return { content, usage, raw: resp };
    }
  } catch (err: any) {
    // Bubble up structured errors to allow backoff logic at the orchestration layer
    const status = err.status ?? err.code;
    const body = err.response?.data || err.message;
    throw new Error(`Chat failed (${status}): ${JSON.stringify(body)}`);
  }
}

6) Rate limit orchestration for batch and concurrency (applies to Tasks 5 and 6)
- Concurrency control:
  - For Scale Testing (Task 6), cap runCount to <= 10 as specified, but also limit concurrent calls to 3–5 to avoid 429 waves.
  - For Agent Wars (Task 5), allow multiple concurrent battles but throttle per model/provider.
- Retry strategy:
  - On 429/503/504: exponential backoff with full jitter. Example backoff sequence (ms): 400, 900, 1900, 4000, 8000, with randomization ±50%.
  - Respect Retry-After if present.
- Implementation tips:
  - Use p-limit for per-model concurrency and Bottleneck if you want dynamic reservoir control.
  - Centralize retry policy in the provider layer so pages don’t each reinvent it.
- Example backoff helper:
export async function withRetries<T>(fn: () => Promise<T>, opts = { retries: 4, baseMs: 400, maxMs: 10_000 }) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (e: any) {
      const status = e.status ?? 0;
      if (attempt >= opts.retries || ![429, 500, 502, 503, 504].includes(status)) throw e;
      const delay = Math.min(opts.maxMs, (opts.baseMs * 2 ** attempt) * (0.5 + Math.random()));
      await new Promise(r => setTimeout(r, delay));
      attempt++;
    }
  }
}

7) Applying to each task in this project
- Task 2 (Provider abstraction):
  - Implement createOpenRouterClient() with required headers.
  - Implement chat() with retries and concurrency controls.
  - Add a getModels() function to dynamically populate model selectors in UI pages. Filter by capability and maintain a whitelist.
  - Add cost guards: estimate cost pre-call and compute actual cost post-call using response.usage and pricing cache.
- Task 5 (Agent Wars Hub):
  - When running multiple sessions, use per-model concurrency limiters to avoid 429.
  - Display model pricing and context length near the model selector to set expectations.
  - Enforce max 25 messages and a budget cap per battle (e.g., $0.10 default) to avoid runaway cost.
- Task 6 (Scale Testing):
  - Before starting N runs, compute an estimated total batch budget using model pricing and planned maxTokens; prompt the user if it exceeds a configurable threshold.
  - Space out start times slightly (e.g., 100–200 ms between kicks) to avoid burst 429s.
  - In the RunReport, include:
    - Total requests, failures, retries, observed 429/5xx counts
    - Estimated vs actual cost
    - Average latency per model
    - Any prompt truncation events (if tokens exceeded model context)
    - Suggested prompt revision block (from your summarization workflow)
- Task 7 (PromptBro guided prompt creator):
  - Use a small, cost-effective model by default (e.g., gpt-4o-mini or equivalent) and hard-cap maxTokens in the assist route.
  - Show the model’s per-1M token price and an “estimated cost per assist” line item.

8) Error handling and edge cases
- Model not found (400/404): If a previously selectable model disappears, gracefully warn users and select the next-best model (or require re-selection).
- Capability mismatch: Some models don’t support tools or function-calling. If you add tool calls later, verify the model’s capabilities (from /models) before enabling those features.
- Token overruns: Enforce input token estimation. If near the model’s context_length, truncate system/user history with a clear rule (e.g., preserve system + latest K turns).
- Streaming edge cases: If the client disconnects mid-stream, cancel the request server-side if possible to avoid unnecessary tokens. Track partial usage if you rely on streaming output.
- Mixed pricing schemas: Normalize input/output vs prompt/completion; don’t assume both fields are present. Treat missing as zero.
- Per-request fees: Some models may include request pricing; include it even if tokens are zero.

9) Security and compliance
- Never expose your OpenRouter key to the browser. Send requests only via server routes.
- It’s fine to send HTTP-Referer and X-Title from your server; they are metadata for attribution and rate-limit fairness.
- Avoid logging full prompts. If you need debugging, hash or redact content. In Task 2, align with “Security: Ensure no PII/logging of prompt content beyond hash” from the task details.
- Consider a per-user or per-session cost ceiling to avoid abuse if you later add multi-tenant features.

10) Quick reference: curl example (for manual testing)
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "HTTP-Referer: https://yourapp.com" \
  -H "X-Title: PromptBattles" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-4o-mini",
    "messages": [
      {"role":"system","content":"You are helpful."},
      {"role":"user","content":"Hello!"}
    ],
    "max_tokens": 200,
    "temperature": 0.7
  }'

11) Validation and tests to add
- Unit tests (Task 2):
  - Verify default headers on OpenRouter client.
  - Retry logic triggers on mocked 429/503.
  - Cost estimator normalizes prompt/completion and input/output pricing shapes.
- Integration tests:
  - Mock /api/v1/models and verify the UI model pickers filter by capability and show prices.
  - End-to-end mocked Scale Testing run that hits the concurrency limiter and produces a RunReport with costs and failures.
- Observability:
  - Log structured metrics: model_id, latency_ms, status_code, retries, prompt_tokens, completion_tokens, cost_usd.
  - Add SLO alerts if 429 rate exceeds a threshold or average latency spikes.

Key takeaways
- Always send HTTP-Referer and X-Title with OpenRouter calls; treat them as required for stable rate limits.
- Build dynamic, cached model listing from /api/v1/models; do not hardcode pricing.
- Implement robust concurrency, backoff, and budget-aware guards; they’re essential for Tasks 5 and 6.
- Normalize pricing to USD per token and estimate costs both pre- and post-call for accurate reporting in RunReports.
- Keep the provider abstraction clean so Task 7’s assist route can cheaply and safely query small models within strict caps.


---

*Generated by Task Master Research Command*  
*Timestamp: 2025-08-11T15:28:55.949Z*
