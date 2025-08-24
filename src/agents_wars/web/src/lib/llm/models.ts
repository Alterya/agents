import { getConfig } from "@/lib/config";

export type ModelInfo = {
  id: string;
  contextTokens?: number;
  promptUSDPerMTok?: number;
  completionUSDPerMTok?: number;
};

type Cached<T> = { data: T; fetchedAt: number } | undefined;

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
let cachedOpenRouterModels: Cached<ModelInfo[]>;

export async function getModelCatalog(): Promise<ModelInfo[]> {
  const cfg = getConfig();
  // If OpenRouter not configured, return empty list (OpenAI listing not implemented here)
  if (!cfg.openrouterApiKey) return [];

  const now = Date.now();
  if (cachedOpenRouterModels && now - cachedOpenRouterModels.fetchedAt < SIX_HOURS_MS) {
    return cachedOpenRouterModels.data;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${cfg.openrouterApiKey}`,
    "HTTP-Referer": cfg.openrouterSite || "",
    "X-Title": "Agent Wars",
  };
  const res = await fetch("https://openrouter.ai/api/v1/models", { headers });
  if (!res.ok) throw new Error(`models_fetch_failed:${res.status}`);
  const json: any = await res.json();
  const items: any[] = Array.isArray(json?.data) ? json.data : [];
  const models: ModelInfo[] = items.map((m) => ({
    id: String(m?.id ?? ""),
    contextTokens: typeof m?.context_length === "number" ? m.context_length : undefined,
    promptUSDPerMTok: typeof m?.pricing?.prompt === "number" ? m.pricing.prompt : undefined,
    completionUSDPerMTok:
      typeof m?.pricing?.completion === "number" ? m.pricing.completion : undefined,
  }));

  cachedOpenRouterModels = { data: models, fetchedAt: now };
  return models;
}

export function __clearModelCatalogCache(): void {
  cachedOpenRouterModels = undefined;
}
