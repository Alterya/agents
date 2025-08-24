import { z } from "zod";

const optionalNonEmpty = (schema: z.ZodTypeAny) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim().length === 0 ? undefined : v),
    schema.optional(),
  );

const envSchema = z
  .object({
    OPENAI_API_KEY: optionalNonEmpty(z.string().trim().min(1)),
    OPENROUTER_API_KEY: optionalNonEmpty(z.string().trim().min(1)),
    OPENROUTER_SITE: optionalNonEmpty(z.string().trim()),
    ALLOWED_MODELS: optionalNonEmpty(z.string().trim()),
    SUMMARIZER_MODEL: optionalNonEmpty(z.string().trim()),
    MAX_TOKENS_PER_CALL: z.coerce.number().int().positive().default(512),
    MAX_MESSAGES_PER_CONVO: z.coerce.number().int().positive().default(25),
    RATE_LIMIT_ENABLED: z
      .union([z.string(), z.boolean()])
      .transform((v) => (typeof v === "string" ? v.toLowerCase() !== "false" : !!v))
      .default(true),
    RATE_LIMIT_RPM: z.coerce.number().int().positive().default(60),
    REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(60000),
    MAX_USD_PER_CONVO: z.coerce.number().nonnegative().optional(),
  })
  .refine(
    (v) => Boolean(v.OPENAI_API_KEY || v.OPENROUTER_API_KEY),
    "At least one provider key must be set: OPENAI_API_KEY or OPENROUTER_API_KEY",
  );

// Note: We avoid merging due to Zod effects typing; read REDIS_URL directly from process.env

export type AppConfig = {
  openaiApiKey?: string;
  openrouterApiKey?: string;
  openrouterSite?: string;
  allowedModels: string[];
  summarizerModel?: string;
  maxTokensPerCall: number;
  maxMessagesPerConversation: number;
  rateLimitEnabled: boolean;
  rateLimitRpm: number;
  requestTimeoutMs: number;
  maxUsdPerConversation?: number;
  redisUrl?: string;
};

let cached: AppConfig | undefined;

export function getConfig(): AppConfig {
  if (cached) return cached;
  // In test env, allow missing provider keys by injecting a dummy key
  const env = { ...process.env } as Record<string, string | undefined>;
  if (process.env.NODE_ENV === "test" && !env.OPENAI_API_KEY && !env.OPENROUTER_API_KEY) {
    env.OPENAI_API_KEY = "test-key";
  }
  const parsed = envSchema.parse(env);
  cached = {
    openaiApiKey: parsed.OPENAI_API_KEY || undefined,
    openrouterApiKey: parsed.OPENROUTER_API_KEY || undefined,
    openrouterSite: parsed.OPENROUTER_SITE || undefined,
    allowedModels: parsed.ALLOWED_MODELS
      ? parsed.ALLOWED_MODELS.split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [],
    summarizerModel: parsed.SUMMARIZER_MODEL || undefined,
    maxTokensPerCall: parsed.MAX_TOKENS_PER_CALL,
    maxMessagesPerConversation: parsed.MAX_MESSAGES_PER_CONVO,
    rateLimitEnabled: parsed.RATE_LIMIT_ENABLED,
    rateLimitRpm: parsed.RATE_LIMIT_RPM,
    requestTimeoutMs: parsed.REQUEST_TIMEOUT_MS,
    maxUsdPerConversation: parsed.MAX_USD_PER_CONVO,
    redisUrl: env.REDIS_URL || undefined,
  };
  return cached;
}

// Test-only utility to reset cached config between test cases
export function __clearConfigCache(): void {
  cached = undefined;
}
