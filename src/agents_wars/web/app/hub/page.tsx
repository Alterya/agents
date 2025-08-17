"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";

type StartResponse = { id: string; status: string } | { error: string };

export default function HubPage() {
  const [agentId, setAgentId] = useState("");
  const [provider, setProvider] = useState<"openai" | "openrouter">("openai");
  const [model, setModel] = useState("");
  const [goal, setGoal] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [streamText, setStreamText] = useState<string>("");
  const [isStarting, setIsStarting] = useState(false);
  const [errors, setErrors] = useState<{ agentId?: string; model?: string }>({});
  const sourceRef = useRef<EventSource | null>(null);
  const autoScrollRef = useRef(true);
  const preRef = useRef<HTMLPreElement | null>(null);
  const bufferRef = useRef<string[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted form values and last job on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("hub.form") || "{}");
      if (saved.agentId) setAgentId(saved.agentId);
      if (saved.provider) setProvider(saved.provider);
      if (saved.model) setModel(saved.model);
      if (saved.goal) setGoal(saved.goal);
      if (saved.userMessage) setUserMessage(saved.userMessage);
      const lastJob = localStorage.getItem("hub.lastJobId");
      if (lastJob) setJobId(lastJob);
    } catch {}
  }, []);

  // Persist on changes (debounced by React batching)
  useEffect(() => {
    try {
      localStorage.setItem(
        "hub.form",
        JSON.stringify({ agentId, provider, model, goal, userMessage })
      );
    } catch {}
  }, [agentId, provider, model, goal, userMessage]);

  const stopStreaming = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
  }, []);

  const validate = useCallback(() => {
    const next: { agentId?: string; model?: string } = {};
    if (!agentId.trim()) next.agentId = "Agent ID is required";
    if (!model.trim()) next.model = "Model is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [agentId, model]);

  const start = useCallback(async () => {
    if (!validate()) return;
    setIsStarting(true);
    setStreamText("");
    setJobId(null);
    try {
      const res = await fetch("/api/battles/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId, provider, model, goal, userMessage }),
      });
      const json = (await res.json()) as StartResponse;
      if (!res.ok || "error" in json) {
        setStreamText((t) => t + `\nError starting: ${JSON.stringify(json)}`);
        return;
      }
      const id = json.id;
      setJobId(id);
      try { localStorage.setItem("hub.lastJobId", id); } catch {}
      const es = new EventSource(`/api/battles/${id}/status`);
      sourceRef.current = es;
      es.onmessage = (ev) => {
        // Buffer incoming lines and flush periodically to reduce re-renders
        bufferRef.current.push(ev.data);
        if (!flushTimerRef.current) {
          flushTimerRef.current = setTimeout(() => {
            const chunk = bufferRef.current.join("\n");
            bufferRef.current = [];
            flushTimerRef.current = null;
            setStreamText((t) => {
              const next = (t ? t + "\n" : "") + chunk;
              // Clamp to last 50k chars for performance
              return next.length > 50000 ? next.slice(next.length - 50000) : next;
            });
          }, 100);
        }
        if (ev.data === "[DONE]") {
          stopStreaming();
        }
      };
      es.onerror = () => {
        setStreamText((t) => t + "\n[stream error]");
        stopStreaming();
      };
    } catch (e: any) {
      setStreamText((t) => t + `\nStart failed: ${e?.message || e}`);
    } finally {
      setIsStarting(false);
    }
  }, [agentId, provider, model, goal, userMessage, validate, stopStreaming]);

  useEffect(() => {
    return () => {
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, []);

  // Auto-scroll stream output when updated
  useEffect(() => {
    if (autoScrollRef.current && preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [streamText]);

  return (
    <main className="p-6 grid gap-4 max-w-3xl mx-auto">
      <h1 className="text-2xl text-blue-300">Agent Wars Hub</h1>
      <section className="bg-slate-900/70 rounded-xl p-4 grid gap-3">
        <div className="grid gap-1">
          <label className="text-sm text-slate-300">Agent ID</label>
          <input
            className="rounded bg-slate-800 px-3 py-2 outline-none focus:ring-2 ring-blue-500"
            placeholder="agent id"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            data-testid="agent-id"
          />
          {errors.agentId && <div className="text-xs text-red-400">{errors.agentId}</div>}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="grid gap-1">
            <label className="text-sm text-slate-300">Provider</label>
            <select
              className="rounded bg-slate-800 px-3 py-2 outline-none focus:ring-2 ring-blue-500"
              value={provider}
              onChange={(e) => setProvider(e.target.value as any)}
              data-testid="provider"
            >
              <option value="openai">openai</option>
              <option value="openrouter">openrouter</option>
            </select>
          </div>
          <div className="grid gap-1">
            <label className="text-sm text-slate-300">Model</label>
            <input
              className="rounded bg-slate-800 px-3 py-2 outline-none focus:ring-2 ring-blue-500"
              placeholder="e.g. gpt-4o"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              data-testid="model"
            />
            {errors.model && <div className="text-xs text-red-400">{errors.model}</div>}
          </div>
        </div>
        <div className="grid gap-1">
          <label className="text-sm text-slate-300">Goal (optional)</label>
          <input
            className="rounded bg-slate-800 px-3 py-2 outline-none focus:ring-2 ring-blue-500"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            data-testid="goal"
          />
        </div>
        <div className="grid gap-1">
          <label className="text-sm text-slate-300">User message (optional)</label>
          <input
            className="rounded bg-slate-800 px-3 py-2 outline-none focus:ring-2 ring-blue-500"
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            data-testid="user-message"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center justify-center rounded bg-blue-600 px-4 py-2 hover:bg-blue-500 disabled:opacity-50"
            onClick={start}
            disabled={isStarting}
            aria-busy={isStarting}
            data-testid="start"
          >
            {isStarting ? "Starting..." : "Start battle"}
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded bg-slate-700 px-3 py-2 hover:bg-slate-600 disabled:opacity-50"
            onClick={stopStreaming}
            disabled={!sourceRef.current}
            data-testid="stop"
          >
            Stop stream
          </button>
          <div className="ml-auto text-xs text-slate-400">
            ~Tokens: {estimateTokens(userMessage, goal)} | Est. cost: {estimateCostUSD(userMessage, goal, provider, model)}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <label className="inline-flex items-center gap-1">
            <input
              type="checkbox"
              defaultChecked
              onChange={(e) => (autoScrollRef.current = e.target.checked)}
            />
            Auto-scroll
          </label>
        </div>
      </section>

      <section className="bg-slate-900/70 rounded-xl p-4 grid gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-blue-400">Session</h2>
          <div className="text-xs text-slate-400">{jobId ? `id: ${jobId}` : "no session yet"}</div>
        </div>
        <pre
          ref={preRef}
          className="min-h-[180px] whitespace-pre-wrap rounded bg-slate-950 p-3 text-xs text-slate-200"
          data-testid="stream"
        >
{streamText || "stream output will appear here..."}
        </pre>
      </section>
    </main>
  );
}

function estimateTokens(userMessage: string, goal: string): number {
  const text = `${goal} ${userMessage}`.trim();
  if (!text) return 0;
  // Heuristic: 1 token ~ 4 chars
  return Math.ceil(text.length / 4);
}

function estimateCostUSD(
  userMessage: string,
  goal: string,
  provider: "openai" | "openrouter",
  _model: string
): string {
  const tokens = estimateTokens(userMessage, goal);
  // Heuristic flat rate per 1k tokens
  const ratePerK = provider === "openai" ? 0.0015 : 0.0012;
  const cost = (tokens / 1000) * ratePerK;
  return `$${cost.toFixed(4)}`;
}


