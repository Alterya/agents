---
title: Research Session
query: "OpenAI pricing and token estimation best practices in apps: up-to-date model pricing (GPT-4o mini etc.), cost guardrails (2025)."
date: 8/11/2025
time: 6:32:05 PM
timestamp: 2025-08-11T15:32:05.010Z
exchanges: 1
---

# Research Session

## Initial Query

**Question:** OpenAI pricing and token estimation best practices in apps: up-to-date model pricing (GPT-4o mini etc.), cost guardrails (2025).

**Response:**

Below is a practical, engineering-focused guide to OpenAI model pricing and token estimation best practices tailored to your project’s provider layer, pages, and reporting. It includes recommended defaults, code you can drop into Task 2 (provider abstraction), schema additions for Task 1 to track token/costs, and route-specific guardrails for Tasks 5–7. I also cover OpenRouter differences, runtime safeguards, and monitoring.

Important note on pricing freshness: OpenAI’s pricing can change, and there isn’t an official pricing API for OpenAI. For OpenRouter, there is an API that returns current pricing per model. Treat the rates below as defaults and add a mechanism to override them via config or periodically update them.


1) Recommended defaults for this project (quick-start)

- Default small/fast model for interactive features (PromptBro / Agent Wars / Scale summaries):
  - OpenAI: gpt-4o-mini
  - Why: Great price-performance; fast; strong for chat and short summarization.
  - Caps: maxTokens: 256–512; temperature: 0.5–0.8; input token cap: 8k for interactive routes.
- Heavy model when needed (opt-in from UI; not default):
  - OpenAI: gpt-4o
  - Caps: maxTokens: 512–1024; input cap: 24k–48k per request.
- Per-request budget guardrail:
  - For gpt-4o-mini: default max request cost USD <= $0.002 (reject or auto-downgrade model if estimate exceeds).
  - For gpt-4o: default max request cost USD <= $0.01 for batch/analysis; lower for interactive.
- Per-session guardrail:
  - Battles (Task 5): stop at goal or 25 messages or $0.05/session (whichever first).
  - Scale (Task 6): runCount <= 10; per-run max $0.01 by default (configurable); global run budget cap (e.g., $0.10).
  - PromptBro (Task 7): per-assist call <= $0.002; daily cap for a user (e.g., 100 calls or $0.10/day).
- Tokenizer and context window assumptions:
  - Use o200k_base for GPT-4o family (4o, 4o-mini, 4.1 family).
  - Use cl100k_base for GPT-3.5 and GPT-4-turbo legacy.
  - Context windows: assume 128k for 4o/4o-mini unless model docs say otherwise. Enforce a configurable input token limit per model.
- Logging/PII:
  - Do not log raw prompts. Store only usage and hashed prompt fingerprint as already planned in your Task 2 test strategy.


2) Model pricing snapshot (use as defaults; override via config)

As of late 2024, OpenAI broadly advertised these rates (USD per million tokens):
- gpt-4o: input $5.00; output $15.00
- gpt-4o-mini: input $0.15; output $0.60
- gpt-4.1: input $10.00; output $30.00
- gpt-4.1-mini: input $0.30; output $0.60
- gpt-4-turbo (legacy family): input $10.00; output $30.00
- gpt-3.5-turbo-0125: input $0.50; output $1.50

Caveats:
- These are last-known ballpark rates; confirm before production. Pricing may vary by region and change over time.
- Reasoning models (o1, o3) historically had different billing; unless you plan to use them, omit for now.
- OpenRouter: do not assume OpenAI rates. Fetch via OpenRouter’s models endpoint (see section 8).


3) Token estimation fundamentals (reliable and fast)

- Token = model-specific unit between characters and words; for English, 1 token ≈ 4 chars or ≈ 0.75 words. Use this only as a coarse fallback.
- Use actual tokenizers for reliable estimates:
  - o-series (GPT-4o/4o-mini/4.1): o200k_base
  - GPT-4-turbo/GPT-3.5: cl100k_base
  - Libraries:
    - Node: tiktoken (preferred, WASM), or js-tiktoken
- Include all roles in estimation:
  - system, user, assistant, tool messages, and function/tool call outputs (role: tool).
  - For tool calls, the tool arguments and tool outputs can dominate costs; cap them explicitly.
- ChatML overhead:
  - Modern OpenAI models’ usage counts the raw tokens in the messages. You don’t need to add special overhead constants if you’re counting message content directly. Still, account for assistant prefix + tool results by literally counting your message strings.


4) Cost guardrail patterns (what to enforce and where)

- Preflight estimate:
  - Compute estPromptTokens = tokenize(all input messages to be sent).
  - Use planned maxTokens (estCompletionTokens).
  - estCostUSD = (estPromptTokens / 1e6) * inputPrice + (estCompletionTokens / 1e6) * outputPrice.
  - If estPromptTokens exceeds model’s context window or your per-request input cap -> prune or summarize older turns.
  - If estCostUSD > per-request budget -> either:
    - Downgrade model (4o -> 4o-mini), and re-estimate, or
    - Reduce maxTokens, or
    - Reject with a clear error to the UI.
- Post-call reconciliation:
  - Use response.usage.prompt_tokens and completion_tokens to compute actualCostUSD and persist it.
  - If actual cost surpasses the remaining session budget, halt further calls.
- Streaming:
  - You won’t get usage until the end; keep your preflight guardrails strict.
  - On final chunk, if usage is returned, reconcile and persist.
- Summarization/truncation when near limits:
  - Always preserve system + latest k user/assistant turns.
  - Consider rolling summarization: compress older turns into a single assistant message.
- Caps for batch/scale:
  - Constrain concurrency to avoid spikes; apply a budgeted queue (e.g., Bottleneck) and per-run token/cost ceilings.


5) Task 2 provider abstraction: model catalog, tokenization, preflight estimate, and guards

Create a small pricing/catalog module and a tokenizer helper. Then integrate preflight and post-call logic into your chat() adapter.

Example: model catalog and tokenizer

- models.ts
export type TokenizerId = 'o200k_base' | 'cl100k_base';

export type ModelPricing = {
  provider: 'openai' | 'openrouter';
  inputPricePerMTokUSD: number;
  outputPricePerMTokUSD: number;
  contextWindow: number; // tokens
  tokenizer: TokenizerId;
  maxOutputTokens?: number;
};

export const OPENAI_DEFAULTS: Record<string, ModelPricing> = {
  'gpt-4o': {
    provider: 'openai',
    inputPricePerMTokUSD: 5.0,
    outputPricePerMTokUSD: 15.0,
    contextWindow: 128_000,
    tokenizer: 'o200k_base',
    maxOutputTokens: 4096,
  },
  'gpt-4o-mini': {
    provider: 'openai',
    inputPricePerMTokUSD: 0.15,
    outputPricePerMTokUSD: 0.60,
    contextWindow: 128_000,
    tokenizer: 'o200k_base',
    maxOutputTokens: 8192,
  },
  'gpt-4.1': {
    provider: 'openai',
    inputPricePerMTokUSD: 10.0,
    outputPricePerMTokUSD: 30.0,
    contextWindow: 128_000,
    tokenizer: 'o200k_base',
  },
  'gpt-4.1-mini': {
    provider: 'openai',
    inputPricePerMTokUSD: 0.30,
    outputPricePerMTokUSD: 0.60,
    contextWindow: 128_000,
    tokenizer: 'o200k_base',
  },
  'gpt-3.5-turbo-0125': {
    provider: 'openai',
    inputPricePerMTokUSD: 0.50,
    outputPricePerMTokUSD: 1.50,
    contextWindow: 16_385,
    tokenizer: 'cl100k_base',
  },
};

export function getModelInfo(model: string, provider: 'openai' | 'openrouter'): ModelPricing | undefined {
  // First: provider-specific dynamic fetch (OpenRouter supports this; OpenAI does not).
  // Then: fallback to OPENAI_DEFAULTS or your OpenRouter cache.
  // Implemented in section 8.
  return OPENAI_DEFAULTS[model];
}

- tokenizer.ts
import { encoding_for_model, get_encoding } from '@dqbd/tiktoken'; // or 'tiktoken/lite' + bundles

type ChatMessage = { role: 'system' | 'user' | 'assistant' | 'tool', content: string };

export function getEncodingForTokenizer(tokenizer: 'o200k_base' | 'cl100k_base') {
  return get_encoding(tokenizer);
}

export function countMessageTokens(messages: ChatMessage[], tokenizer: 'o200k_base' | 'cl100k_base'): number {
  const enc = getEncodingForTokenizer(tokenizer);
  try {
    let total = 0;
    for (const m of messages) {
      // Count the content; role tags are negligible; usage accounting from OpenAI counts message text.
      total += enc.encode(m.content || '').length;
    }
    return total;
  } finally {
    // enc.free() if using tiktoken/lite with WASM
  }
}

export function estimateCostUSD(promptTokens: number, completionTokens: number, pricing: ModelPricing): number {
  return (promptTokens / 1_000_000) * pricing.inputPricePerMTokUSD
       + (completionTokens / 1_000_000) * pricing.outputPricePerMTokUSD;
}

- provider/chat.ts (core preflight + guards + reconciliation)
import OpenAI from 'openai';
import { getModelInfo } from './models';
import { countMessageTokens, estimateCostUSD } from './tokenizer';

type Provider = 'openai' | 'openrouter';
type ChatMessage = { role: 'system'|'user'|'assistant'|'tool', content: string };
type ChatOptions = {
  provider: Provider,
  model: string,
  maxTokens?: number,
  temperature?: number,
  stop?: string[],
  stream?: boolean,
  // Guardrails/budget
  maxInputTokens?: number,
  maxEstimatedCostUSD?: number,
  sessionRemainingBudgetUSD?: number,
};

const openaiClients = {
  openai: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  openrouter: new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': process.env.OPENROUTER_REFERRER || '',
      'X-Title': process.env.OPENROUTER_APP_NAME || 'YourApp',
    },
  }),
};

export async function chat(messages: ChatMessage[], opts: ChatOptions) {
  const info = getModelInfo(opts.model, opts.provider);
  if (!info) throw new Error(`Unknown model ${opts.model} for provider ${opts.provider}`);

  // Token caps
  const inputTokens = countMessageTokens(messages, info.tokenizer);
  const maxTokens = Math.min(
    opts.maxTokens ?? info.maxOutputTokens ?? 1024,
    info.maxOutputTokens ?? Infinity
  );

  const maxInputTokens = opts.maxInputTokens ?? Math.min(info.contextWindow - maxTokens, 32_000);
  if (inputTokens > maxInputTokens) {
    throw new Error(`Input too large: ${inputTokens} > cap ${maxInputTokens}. Summarize or truncate.`);
  }

  // Preflight cost estimate
  const maxEstimatedCost = estimateCostUSD(inputTokens, maxTokens, info);
  const perReqBudget = opts.maxEstimatedCostUSD ?? (opts.model.includes('4o-mini') ? 0.002 : 0.01);
  if (maxEstimatedCost > perReqBudget) {
    throw new Error(`Estimated cost ${maxEstimatedCost.toFixed(6)} exceeds per-request budget ${perReqBudget}.`);
  }
  if (opts.sessionRemainingBudgetUSD != null && maxEstimatedCost > opts.sessionRemainingBudgetUSD) {
    throw new Error(`Insufficient session budget. Need <= ${opts.sessionRemainingBudgetUSD}.`);
  }

  const client = openaiClients[opts.provider];

  // Basic retries with exponential backoff
  let lastErr: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await client.chat.completions.create({
        model: opts.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: maxTokens,
        temperature: opts.temperature ?? 0.7,
        stop: opts.stop,
        stream: opts.stream ?? false,
      } as any);

      // Reconcile usage/cost
      const usage = (res as any).usage; // { prompt_tokens, completion_tokens }
      const promptTokens = usage?.prompt_tokens ?? inputTokens;
      const completionTokens = usage?.completion_tokens ?? 0;
      const totalCost = estimateCostUSD(promptTokens, completionTokens, info);

      return {
        response: res,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: (usage?.total_tokens ?? (promptTokens + completionTokens)),
          costUSD: totalCost,
        },
      };
    } catch (err: any) {
      lastErr = err;
      // Optional: honor Retry-After headers for rate limits
      const delay = (attempt + 1) * 500 + Math.random() * 250;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}


6) Task 1 schema: persist usage and costs

To support reporting in Tasks 5–7 and to allow budgeting, add token/cost fields to Message and Conversation. This enables aggregate reporting and RunReport summaries.

Prisma model suggestions (augment your existing entities):

model Message {
  id               String   @id @default(cuid())
  conversationId   String
  role             String   // 'system' | 'user' | 'assistant' | 'tool'
  content          String
  // Usage/cost
  model            String
  provider         String   // 'openai' | 'openrouter'
  promptTokens     Int      @default(0)
  completionTokens Int      @default(0)
  totalTokens      Int      @default(0)
  inputCostUSD     Decimal  @default(0)
  outputCostUSD    Decimal  @default(0)
  totalCostUSD     Decimal  @default(0)
  createdAt        DateTime @default(now())
  // ...
  @@index([conversationId, createdAt])
  @@index([provider, model])
}

model Conversation {
  id               String   @id @default(cuid())
  agentId          String?
  provider         String
  model            String
  systemPrompt     String?
  goal             String?
  goalReached      Boolean  @default(false)
  endedReason      ConversationEndReason?
  // Aggregates
  totalPromptTokens     Int      @default(0)
  totalCompletionTokens Int      @default(0)
  totalTokens           Int      @default(0)
  totalCostUSD          Decimal  @default(0)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  // ...
  @@index([createdAt])
}

model RunReport {
  id               String   @id @default(cuid())
  runId            String   @unique
  // ...
  totalConversations   Int      @default(0)
  totalPromptTokens    Int      @default(0)
  totalCompletionTokens Int     @default(0)
  totalCostUSD         Decimal  @default(0)
  // revisedPrompt, failures, etc.
  createdAt        DateTime @default(now())
}

- On every successful call in chat(), persist one Message with the assistant content and usage fields; update Conversation aggregates in a transaction.
- Note: If you store user messages as Message rows too, set their token estimates (promptTokens) if available/desired for full accounting.


7) Route-specific guardrails for Tasks 5–7

- Task 5: Agent Wars Hub (/hub)
  - Defaults: provider=openai, model=gpt-4o-mini, temperature=0.7
  - Token caps: maxTokens=256 (assistant), maxInputTokens=8000 per turn
  - Session caps: stop at 25 messages OR goalReached OR $0.05 cost
  - If user selects larger model (e.g., gpt-4o), set per-request budget to $0.01 and keep session cap.
  - Live progress: reconcile usage after each turn; update UI session budget remaining.

- Task 6: Scale Testing (/scale)
  - runCount <= 10
  - Per-run caps: model=gpt-4o-mini, maxTokens=256, per-request budget=$0.002
  - Global caps: total budget per runId <= $0.10 (config)
  - Summarization workflow: when compiling failures/issues, use gpt-4o-mini with tight caps; estimate upfront and ensure the summary call fits remaining budget.

- Task 7: PromptBro (/promptbro)
  - Assist route defaults: gpt-4o-mini, maxTokens=200–300, per-request budget=$0.002
  - Enforce daily quota per user (e.g., 100 assists or $0.10/day) to avoid runaway costs.
  - Consider downgrading automatically if user’s remaining daily budget < estimate.


8) OpenRouter specifics (dynamic pricing, model listing, compatibility)

- Client: Using openai@^4.55.0 with baseURL override is correct.
- Pricing: OpenRouter exposes GET https://openrouter.ai/api/v1/models which returns an array of models with pricing metadata, typically:
  - pricing.prompt (USD per 1M input tokens)
  - pricing.completion (USD per 1M output tokens)
- Strategy:
  - On startup, fetch and cache model list + pricing to a local JSON or in-memory cache with a TTL (e.g., 6 hours).
  - When opts.provider='openrouter', prefer the dynamic model pricing over local defaults.
  - If fetch fails, fall back to last-known cached values; otherwise, throw.

Example OpenRouter pricing fetch

- models.openrouter.ts
import OpenAI from 'openai';

type OpenRouterModel = {
  id: string;
  pricing?: { prompt?: number; completion?: number };
  context_length?: number;
};

let openrouterCache: { time: number, map: Record<string, ModelPricing> } | null = null;

export async function getOpenRouterModelInfo(model: string): Promise<ModelPricing | undefined> {
  const now = Date.now();
  if (!openrouterCache || now - openrouterCache.time > 6 * 60 * 60 * 1000) {
    const client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    });
    const resp: any = await client.models.list();
    const map: Record<string, ModelPricing> = {};
    for (const m of (resp.data as OpenRouterModel[])) {
      const input = m.pricing?.prompt ?? 0;
      const output = m.pricing?.completion ?? 0;
      map[m.id] = {
        provider: 'openrouter',
        inputPricePerMTokUSD: input,
        outputPricePerMTokUSD: output,
        contextWindow: m.context_length ?? 128_000,
        tokenizer: guessTokenizer(m.id), // simple heuristic; allow override
      };
    }
    openrouterCache = { time: now, map };
  }
  return openrouterCache.map[model];
}

function guessTokenizer(modelId: string): TokenizerId {
  // Heuristic: many frontier models use o200k-like tokenization, others cl100k. Customize as needed per model family.
  if (modelId.includes('gpt-4o') || modelId.includes('o3') || modelId.includes('o1') || modelId.includes('4.1')) {
    return 'o200k_base';
  }
  return 'cl100k_base';
}

- Integrate: In getModelInfo(model, provider), if provider==='openrouter', call getOpenRouterModelInfo; else use OPENAI_DEFAULTS with env overrides.


9) Budgeting, rate limiting, retries, and monitoring

- Per-key rate limits:
  - Implement a simple concurrency limiter (e.g., p-limit or Bottleneck) per provider key. Keep concurrency low (e.g., 2–5) for safety; increase gradually.
  - Honor Retry-After headers; exponential backoff on 429/5xx, max 3–5 attempts.
- Budgets:
  - Maintain per-session and per-run budget state in DB (e.g., Conversation has totalCostUSD).
  - Before each call, compute remainingBudget = sessionBudget - totalCostUSD; pass as opts.sessionRemainingBudgetUSD.
- Monitoring:
  - Emit metrics: calls, success rate, tokens, USD, model histogram.
  - Alert on: sudden spikes in total USD/min, error rates, or if a single conversation crosses expected cost.
- Privacy:
  - Store prompt hashes not raw content; for debugging, store the first N characters of user content only when a special debug flag is enabled in non-prod environments.


10) Practical examples: cost math and tradeoffs

- Example A (gpt-4o-mini):
  - Input tokens: 6,000; maxTokens: 500; prices: $0.15/M in, $0.60/M out
  - Est cost = (6000/1e6)*0.15 + (500/1e6)*0.60 = $0.0009 + $0.0003 = $0.0012
- Example B (gpt-4o):
  - Same tokens; prices: $5/M in, $15/M out
  - Est cost = (6000/1e6)*5 + (500/1e6)*15 = $0.030 + $0.0075 = $0.0375
  - 31x more expensive: strong justification needed to default to 4o-only.
- Example C (Scale 10 runs, mini, per-run $0.0012 estimate):
  - Total ≈ $0.012. Set global cap $0.02 to allow margin for variance.


11) Applying this to Tasks

- Task 1 (DB): Add usage and cost fields as shown. Seed at least one “budget-friendly” agent configured with gpt-4o-mini. Add indexes for provider+model for cost reporting.
- Task 2 (Provider): Implement the model catalog, tokenizer counting, preflight estimate, and per-request/session guardrails as above. Add OpenRouter pricing fetch. Unit tests:
  - Estimation: known strings yield expected token counts (within 2–3%).
  - Guardrails: requests exceeding caps are rejected; downgrading logic (if implemented) is correct.
  - Reconciliation: given usage {pt, ct}, computed USD matches formula.
- Task 5 (Hub): Enforce session cap and 25-message limit. Display “Remaining budget: $X.XXXX” next to progress. If exceeded, auto-stop and set endedReason='limit'.
- Task 6 (Scale): Validate runCount <= 10; reject with helpful error if exceeded. Compile a RunReport including total tokens and USD. Add a “Cost per run” bar and total.
- Task 7 (PromptBro): The assist route must pass strict caps to provider.chat(). When over budget, return a user-friendly nudge to adjust the draft length or allow a cheaper model.


12) Edge cases and pitfalls

- Tool messages can explode token counts:
  - Enforce a tool-output clamp (e.g., 1–2k tokens) and truncate with a note “[truncated]”.
- Streaming without usage:
  - If usage is missing post-stream, compute tokens on your side for persistence; use the tokenizer to count the assistant text you streamed to user.
- Mixed providers/models mid-conversation:
  - If you let users switch models, reset budget and re-summarize context to fit the new model’s window.
- Encoding changes:
  - If OpenAI introduces new tokenizer variants, you may need to add another mapping. Keep tokenizer selection centralized.
- Pricing drift:
  - Expose PRICING_OVERRIDES via ENV/JSON. At startup, log the effective price table for auditability.


13) Testing strategy add-ons (beyond your current plan)

- Contract tests:
  - Snapshot the computed estimate and final USD for a fixed synthetic conversation across models. Use stable strings.
- Budget enforcement tests:
  - Simulate a conversation that would exceed $0.05; ensure it stops and flags endedReason='limit'.
- OpenRouter integration:
  - Mock the /models endpoint; verify dynamic pricing ingestion and fallback behavior on network failure.
- Load-test guardrails:
  - Hammer the provider layer with concurrency 10–20 in test mode and ensure rate limiting + retries keep error rates acceptable and budgets respected.


14) Operational checklist

- Expose config:
  - DEFAULT_MODEL, PER_REQUEST_BUDGET_USD, SESSION_BUDGET_USD, DAILY_USER_BUDGET_USD, MAX_INPUT_TOKENS, and per-route overrides.
- Add an admin page or JSON endpoint showing:
  - Current pricing table (effective), totals for today, by model/provider, and top conversations by cost.
- Set sensible UI hints:
  - When a user picks an expensive model, show “~30x cost vs mini” inline to reduce surprises.


Closing notes on “up-to-date” pricing

- OpenAI: No official pricing API. Best practice is to:
  - Keep a versioned pricing map in your repo with a visible date.
  - Allow PRICING_OVERRIDES via env or remote JSON controlled by you.
  - Periodically verify against OpenAI’s pricing page and update.
- OpenRouter: Use their models listing to populate pricing at runtime with a TTL cache.

This approach gives you predictable costs with strict guardrails and makes it straightforward to evolve as pricing changes. It’s safe by default (gpt-4o-mini, small maxTokens, per-request/session caps), transparent (persisted usage and costs), and flexible (dynamic pricing for OpenRouter, env overrides for OpenAI).


---

*Generated by Task Master Research Command*  
*Timestamp: 2025-08-11T15:32:05.010Z*
