import { NextRequest } from "next/server";
import { getConfig } from "../../../src/lib/config";

export async function GET(_req: NextRequest) {
  try {
    // Use config for models, but compute provider booleans from env to keep tests deterministic
    const cfg = getConfig();
    const openaiConfigured = Boolean(
      process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0,
    );
    const openrouterConfigured = Boolean(
      process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim().length > 0,
    );
    // Flatten response for ProviderModelSelector, but also include nested providers for tests
    const body = {
      openaiConfigured,
      openrouterConfigured,
      allowedModels: cfg.allowedModels,
      rateLimitEnabled: cfg.rateLimitEnabled,
      rateLimitRpm: cfg.rateLimitRpm,
      providers: { openaiConfigured, openrouterConfigured },
    };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch {
    // Fallback: do not fail if keys are absent; expose non-sensitive booleans and ALLOWED_MODELS from env
    const openaiConfigured = Boolean(
      process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0,
    );
    const openrouterConfigured = Boolean(
      process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim().length > 0,
    );
    const allowedEnv = (process.env.ALLOWED_MODELS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const body = {
      openaiConfigured,
      openrouterConfigured,
      allowedModels: allowedEnv,
      rateLimitEnabled: true,
      rateLimitRpm: 60,
      providers: { openaiConfigured, openrouterConfigured },
    };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
}
