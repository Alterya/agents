"use client";
import { useEffect, useState } from "react";

type ProviderStatus = {
  openaiConfigured: boolean;
  openrouterConfigured: boolean;
  allowedModels: string[];
  rateLimitEnabled: boolean;
  rateLimitRpm: number;
};

export function KeyStatusBanner() {
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/config/provider-status");
        if (!res.ok) throw new Error("status_failed");
        const json = (await res.json()) as ProviderStatus;
        setStatus(json);
      } catch {
        setError("Unable to load provider status");
      }
    })();
  }, []);

  if (error) {
    return <div className="border bg-yellow-50 p-2 text-sm text-yellow-800">{error}</div>;
  }
  if (!status) return null;

  const missing: string[] = [];
  if (!status.openaiConfigured) missing.push("OpenAI");
  if (!status.openrouterConfigured) missing.push("OpenRouter");

  if (missing.length === 0) return null;

  return (
    <div className="border bg-yellow-50 p-2 text-sm text-yellow-800">
      Missing provider configuration: {missing.join(", ")}. Some features may be limited.
    </div>
  );
}
