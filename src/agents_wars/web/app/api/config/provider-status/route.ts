import { NextRequest } from "next/server";
import { getConfig } from "@/lib/config";

export async function GET(_req: NextRequest) {
  try {
    // Try to use validated config when available
    const cfg = getConfig();
    const body = {
      providers: {
        openaiConfigured: Boolean(cfg.openaiApiKey && cfg.openaiApiKey.length > 0),
        openrouterConfigured: Boolean(cfg.openrouterApiKey && cfg.openrouterApiKey.length > 0),
      },
      allowedModels: cfg.allowedModels,
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
      providers: { openaiConfigured, openrouterConfigured },
      allowedModels: allowedEnv,
    };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
}
