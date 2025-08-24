import { getConfig } from "@/lib/config";

export function getAllowedModels(): Set<string> {
  const cfg = getConfig();
  return new Set(cfg.allowedModels);
}

export function getMaxTokensPerCall(): number {
  return getConfig().maxTokensPerCall;
}

export function getMaxMessagesPerConversation(): number {
  return getConfig().maxMessagesPerConversation;
}

export class GuardrailsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GuardrailsError";
  }
}

export function enforceCaps(args: {
  requestedMaxTokens: number | undefined;
  messageCount: number;
  model: string;
}): void {
  const maxTokens = getMaxTokensPerCall();
  if ((args.requestedMaxTokens ?? maxTokens) > maxTokens) {
    throw new GuardrailsError(`maxTokens exceeds cap (${args.requestedMaxTokens} > ${maxTokens})`);
  }
  const maxMsgs = getMaxMessagesPerConversation();
  if (args.messageCount > maxMsgs) {
    throw new GuardrailsError(`message count exceeds cap (${args.messageCount} > ${maxMsgs})`);
  }
  const allowed = getAllowedModels();
  if (allowed.size > 0 && !allowed.has(args.model)) {
    throw new GuardrailsError(`model not allowed: ${args.model}`);
  }
}

type Window = { count: number; windowStartMs: number };
const limiterStore: Map<string, Window> = new Map();

export function rateLimit(key: string): void {
  const cfg = getConfig();
  if (!cfg.rateLimitEnabled) return;
  const maxPerWindow = cfg.rateLimitRpm;
  const now = Date.now();
  const windowMs = 60_000;
  const w = limiterStore.get(key);
  if (!w || now - w.windowStartMs >= windowMs) {
    limiterStore.set(key, { count: 1, windowStartMs: now });
    return;
  }
  if (w.count >= maxPerWindow) {
    throw new GuardrailsError("rate limit exceeded");
  }
  w.count += 1;
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((res) => setTimeout(res, ms));
}

export function computeBackoffDelayMs(attempt: number): number {
  // attempt: 0,1,2 -> 250ms, 750ms, 1250ms with jitter
  const base = 250 + attempt * 500;
  const jitter = Math.floor(Math.random() * 100);
  return base + jitter;
}
