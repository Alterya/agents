type Provider = "openai" | "openrouter";

type Price = { inputPer1k: number; outputPer1k: number };

const cache: Record<string, { price: Price; at: number }> = {};
const TTL_MS = 60 * 60 * 1000; // 1 hour

// Minimal static defaults as fallback (USD per 1K tokens)
const DEFAULTS: Record<Provider, Price> = {
  openai: { inputPer1k: 0.002, outputPer1k: 0.006 },
  openrouter: { inputPer1k: 0.0015, outputPer1k: 0.005 },
};

function cacheKey(provider: Provider, model: string): string {
  return `${provider}:${model}`;
}

export async function getPricing(provider: Provider, model: string): Promise<Price> {
  const key = cacheKey(provider, model);
  const now = Date.now();
  const hit = cache[key];
  if (hit && now - hit.at < TTL_MS) return hit.price;

  // TODO: Replace with real provider pricing lookup endpoints if available
  // For now, use provider defaults with simple heuristics per family
  const base = DEFAULTS[provider];
  const family = model.toLowerCase();
  let price = base;
  if (family.includes("gpt-4")) {
    price = { inputPer1k: base.inputPer1k * 3, outputPer1k: base.outputPer1k * 3 };
  } else if (family.includes("mini") || family.includes("small")) {
    price = { inputPer1k: base.inputPer1k * 0.6, outputPer1k: base.outputPer1k * 0.6 };
  }
  cache[key] = { price, at: now };
  return price;
}

export function estimateCostUsdFromUsage(
  provider: Provider,
  model: string,
  usage?: { inputTokens?: number; outputTokens?: number },
): { usdIn: number; usdOut: number } {
  const inT = usage?.inputTokens ?? 0;
  const outT = usage?.outputTokens ?? 0;
  const key = cacheKey(provider, model);
  const price = cache[key]?.price ?? DEFAULTS[provider];
  return { usdIn: (inT / 1000) * price.inputPer1k, usdOut: (outT / 1000) * price.outputPer1k };
}
