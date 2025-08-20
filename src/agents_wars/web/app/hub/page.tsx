"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useArenaState } from "@/hooks/useArenaState";
import { ProviderModelSelector } from "@/components/ProviderModelSelector";

type StartResponse = { id: string; status: string } | { error: string };

type Provider = "openai" | "openrouter";

type Agent = { id: string; name: string; description?: string | null };

type JobStatus = "pending" | "running" | "succeeded" | "failed";

type JobPayload = {
  id: string;
  type: string;
  status: JobStatus;
  data?: unknown;
  error?: string;
  createdAt: number;
  updatedAt: number;
};

type Message = {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  createdAt: string;
};

type Session = {
  id: string; // jobId
  conversationId?: string;
  provider: Provider;
  model: string;
  agent?: Agent;
  goal?: string;
  userMessage?: string;
  status: JobStatus;
  error?: string;
  endedReason?: "goal" | "limit" | "error" | "manual" | "timeout";
  messages: Message[];
  polling?: boolean;
};

export default function HubPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState<boolean>(true);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [allowedModels, setAllowedModels] = useState<string[]>([]);
  const [agentId, setAgentId] = useState("");
  const [provider, setProvider] = useState<Provider>("openai");
  const [model, setModel] = useState("");
  const [goal, setGoal] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [errors, setErrors] = useState<{ agentId?: string; model?: string }>({});
  const [sessions, setSessions] = useState<Session[]>([]);
  const autoScrollRef = useRef(true);
  const preRefs = useRef<Record<string, HTMLPreElement | null>>({});
  const abortedRef = useRef(false);

  // Load persisted form values and last job on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("hub.form") || "{}");
      if (saved.agentId) setAgentId(saved.agentId);
      if (saved.provider) setProvider(saved.provider);
      if (saved.model) setModel(saved.model);
      if (saved.goal) setGoal(saved.goal);
      if (saved.systemPrompt) setSystemPrompt(saved.systemPrompt);
      if (saved.userMessage) setUserMessage(saved.userMessage);
      // restore sessions if present
      const savedSessions = JSON.parse(localStorage.getItem("hub.sessions") || "[]");
      if (Array.isArray(savedSessions) && savedSessions.length) {
        setSessions(savedSessions as Session[]);
      }
    } catch {}
  }, []);

  // Persist on changes (debounced by React batching)
  useEffect(() => {
    try {
      localStorage.setItem(
        "hub.form",
        JSON.stringify({ agentId, provider, model, goal, systemPrompt, userMessage })
      );
    } catch {}
  }, [agentId, provider, model, goal, systemPrompt, userMessage]);

  // Persist sessions
  useEffect(() => {
    try {
      localStorage.setItem("hub.sessions", JSON.stringify(sessions));
    } catch {}
  }, [sessions]);

  // Mark unmount to help polling loops bail early
  useEffect(() => {
    return () => {
      abortedRef.current = true;
    };
  }, []);

  // Load agents
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/agents", { cache: "no-store" });
        if (!res.ok) throw new Error("agents_failed");
        const json = (await res.json()) as { items: Agent[] };
        setAgents(json.items);
      } catch (e: any) {
        setAgents([]);
        setAgentsError(e?.message || "Failed to load agents");
      } finally {
        setAgentsLoading(false);
      }
    })();
  }, []);

  // Load provider status (for model whitelist)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/config/provider-status", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { allowedModels: string[] };
        setAllowedModels(Array.isArray(json.allowedModels) ? json.allowedModels : []);
      } catch {
        setAllowedModels([]);
      }
    })();
  }, [systemPrompt]);

  // Keyboard shortcut moved below start() declaration

  const validate = useCallback(() => {
    const next: { agentId?: string; model?: string } = {};
    if (!agentId.trim()) next.agentId = "Agent ID is required";
    if (!model.trim()) next.model = "Model is required";
    if (model.trim() && allowedModels.length > 0 && !allowedModels.includes(model.trim())) {
      next.model = "Model not allowed";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [agentId, model, allowedModels]);

  const pollSession = useCallback((id: string) => {
    let cancelled = false;
    let stableCount = 0;
    let lastUpdatedAt = 0;
    const maxDelay = 5000;
    const baseDelay = 1200;
    function computeJitterMs(key: string): number {
      let sum = 0;
      for (let i = 0; i < key.length; i++) sum = (sum + key.charCodeAt(i)) % 9973;
      return (sum % 400); // up to 400ms jitter
    }
    async function tick(delayOverride?: number) {
      if (cancelled) return;
      if (abortedRef.current) return;
      try {
        const res = await fetch(`/api/battles/${id}/status?format=json`, { cache: "no-store" });
        if (res.status === 429 || res.status >= 500) {
          const nextDelay = Math.min((delayOverride ?? baseDelay) * 2, maxDelay);
          setTimeout(() => tick(nextDelay), nextDelay + computeJitterMs(id));
          return;
        }
        if (!res.ok) throw new Error("status_failed");
        const job = (await res.json()) as JobPayload;
        if (typeof job.updatedAt === "number") {
          if (job.updatedAt === lastUpdatedAt) stableCount += 1; else { stableCount = 0; lastUpdatedAt = job.updatedAt; }
        }
        setSessions((s) =>
          s.map((sess) =>
            sess.id === id && !sess.endedReason
              ? { ...sess, status: job.status, error: (job as any).error }
              : sess,
          ),
        );
        // If job has conversation id in data, fetch messages
        const data = job.data as any;
        const conversationId: string | undefined = data?.conversationId;
        if (conversationId) {
          const msgRes = await fetch(`/api/battles/${conversationId}/messages?page=1&limit=100`, {
            cache: "no-store",
          });
          if (msgRes.ok) {
            const msgs = (await msgRes.json()) as { items: Message[] };
            setSessions((s) =>
              s.map((sess) =>
                sess.id === id && !sess.endedReason
                  ? { ...sess, conversationId, messages: msgs.items }
                  : sess,
              ),
            );
          }
        }
        if (job.status === "succeeded" || job.status === "failed") {
          const endedReason = (job.data as any)?.endedReason as Session["endedReason"] | undefined;
          setSessions((s) => s.map((sess) => (sess.id === id ? { ...sess, endedReason } : sess)));
          return; // stop polling
        }
      } catch (e) {
        // swallow and keep polling; minimal backoff
      }
      const slow = stableCount >= 3 ? 3500 : baseDelay;
      const delay = delayOverride ?? slow;
      setTimeout(() => tick(), delay + computeJitterMs(id));
    }
    // initial call with jitter to stagger across sessions
    setTimeout(() => tick(), computeJitterMs(id));
    return () => {
      cancelled = true;
    };
  }, []);

  const start = useCallback(async () => {
    if (!validate()) return;
    setIsStarting(true);
    try {
      const res = await fetch("/api/battles/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId, provider, model, goal, systemPrompt, userMessage }),
      });
      const json = (await res.json()) as StartResponse;
      if (!res.ok || "error" in json) {
        const msg = (json as any)?.error === "invalid_agent" ? "Selected agent is invalid or not found" : "Failed to start";
        // Surface error via a synthetic session entry
        const errId = `err-${Date.now()}`;
        setSessions((s) => [
          ...s,
          {
            id: errId,
            provider,
            model,
            status: "failed",
            error: msg,
            goal,
            userMessage,
            messages: [],
            agent: agents.find((a) => a.id === agentId),
          },
        ]);
        return;
      }
      const id = json.id;
      const session: Session = {
        id,
        provider,
        model,
        goal,
        userMessage,
        status: "pending",
        agent: agents.find((a) => a.id === agentId),
        messages: [],
        polling: true,
      };
      setSessions((s) => {
        const exists = s.some((x) => x.id === id);
        return exists ? s.map((x) => (x.id === id ? { ...x, ...session } : x)) : [...s, session];
      });
      // Kick off polling loop for this session
      pollSession(id);
    } catch (e: any) {
      const errId = `err-${Date.now()}`;
      setSessions((s) => [
        ...s,
        {
          id: errId,
          provider,
          model,
          status: "failed",
          error: e?.message || String(e),
          goal,
          userMessage,
          messages: [],
          agent: agents.find((a) => a.id === agentId),
        },
      ]);
    } finally {
      setIsStarting(false);
    }
  }, [agents, agentId, provider, model, goal, userMessage, validate, pollSession, systemPrompt]);

  // Keyboard shortcut: Cmd/Ctrl+Enter to start when valid
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMeta = navigator.platform.toLowerCase().includes("mac") ? e.metaKey : e.ctrlKey;
      if (isMeta && e.key === "Enter") {
        if (agentId.trim() && model.trim() && !isStarting) {
          e.preventDefault();
          start();
        }
      }
      if (!isMeta && (e.key === "s" || e.key === "S")) {
        // Stop the most recent running session
        const running = [...sessions].reverse().find((x) => x.status !== "succeeded" && x.status !== "failed");
        if (running) {
          e.preventDefault();
          fetch(`/api/battles/${running.id}/cancel`, { method: "POST" }).catch(() => {
            setSessions((prev) => prev.map((x) => (x.id === running.id ? { ...x, status: "failed", endedReason: "manual" } : x)));
          });
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [agentId, model, isStarting, start, sessions]);

  // Auto-scroll each session stream when updated
  useEffect(() => {
    if (!autoScrollRef.current) return;
    sessions.forEach((sess) => {
      const pre = preRefs.current[sess.id];
      if (pre) pre.scrollTop = pre.scrollHeight;
    });
  }, [sessions]);

  const [activeTab, setActiveTab] = useState<"hub" | "arena">("hub");
  const arena = useArenaState({ agentId, provider, model, allowedModels });
  const [arenaStarting, setArenaStarting] = useState<boolean>(false);
  const [arenaRunning, setArenaRunning] = useState<boolean>(false);
  const [arenaJobAId, setArenaJobAId] = useState<string | null>(null);
  const [arenaJobBId, setArenaJobBId] = useState<string | null>(null);
  const [judgeResult, setJudgeResult] = useState<{ winner: "A" | "B" | "tie"; reasoning: string } | null>(null);

  const startArenaReal = useCallback(async () => {
    if (arenaStarting) return;
    // simple guard aligning with arena.canStart
    if (!agentId.trim()) return;
    if (!model.trim()) return;
    if (allowedModels.length > 0 && !allowedModels.includes(model.trim())) return;
    if (!arena.broadcast.trim()) return;
    setArenaStarting(true);
    try {
      const commonHeaders = { "content-type": "application/json" } as const;
      const base = { agentId, provider, model, userMessage: arena.broadcast } as const;
      // Start side A
      const resA = await fetch("/api/battles/start", {
        method: "POST",
        headers: commonHeaders,
        body: JSON.stringify({ ...base, systemPrompt: arena.promptA || undefined }),
      });
      const jsonA = (await resA.json()) as StartResponse;
      let okA = false;
      if (!resA.ok || (jsonA as any).error) {
        const errId = `arena-A-${Date.now()}`;
        setSessions((s) => [
          ...s,
          {
            id: errId,
            provider,
            model,
            status: "failed",
            error: "Failed to start (A)",
            messages: [],
            agent: agents.find((a) => a.id === agentId),
          },
        ]);
      } else {
        const idA = (jsonA as any).id as string;
        const sessA: Session = {
          id: idA,
          provider,
          model,
          status: "pending",
          agent: agents.find((a) => a.id === agentId),
          messages: [],
          polling: true,
        };
        setSessions((s) => {
          const exists = s.some((x) => x.id === idA);
          return exists ? s.map((x) => (x.id === idA ? { ...x, ...sessA } : x)) : [...s, sessA];
        });
        setArenaJobAId(idA);
        pollSession(idA);
        okA = true;
      }
      // Start side B
      const resB = await fetch("/api/battles/start", {
        method: "POST",
        headers: commonHeaders,
        body: JSON.stringify({ ...base, systemPrompt: arena.promptB || undefined }),
      });
      const jsonB = (await resB.json()) as StartResponse;
      let okB = false;
      if (!resB.ok || (jsonB as any).error) {
        const errId = `arena-B-${Date.now()}`;
        setSessions((s) => [
          ...s,
          {
            id: errId,
            provider,
            model,
            status: "failed",
            error: "Failed to start (B)",
            messages: [],
            agent: agents.find((a) => a.id === agentId),
          },
        ]);
      } else {
        const idB = (jsonB as any).id as string;
        const sessB: Session = {
          id: idB,
          provider,
          model,
          status: "pending",
          agent: agents.find((a) => a.id === agentId),
          messages: [],
          polling: true,
        };
        setSessions((s) => {
          const exists = s.some((x) => x.id === idB);
          return exists ? s.map((x) => (x.id === idB ? { ...x, ...sessB } : x)) : [...s, sessB];
        });
        setArenaJobBId(idB);
        pollSession(idB);
        okB = true;
      }
      setArenaRunning(okA && okB);
    } catch {
      // No-op; failures already surfaced per-side
    } finally {
      setArenaStarting(false);
    }
  }, [arenaStarting, agentId, provider, model, allowedModels, arena.broadcast, arena.promptA, arena.promptB, agents, pollSession]);

  const arenaSummary = useMemo(() => {
    if (!arenaJobAId || !arenaJobBId) return null;
    const sideA = sessions.find((s) => s.id === arenaJobAId);
    const sideB = sessions.find((s) => s.id === arenaJobBId);
    if (!sideA || !sideB) return null;

    function estimateTokensFromMessages(msgs: Message[]): number {
      const text = msgs.map((m) => m.content).join(" ");
      if (!text) return 0;
      return Math.ceil(text.length / 4);
    }
    function medianLatencyMs(msgs: Message[]): number {
      const times: number[] = [];
      for (let i = 1; i < msgs.length; i++) {
        const t0 = Date.parse(msgs[i - 1].createdAt);
        const t1 = Date.parse(msgs[i].createdAt);
        if (!Number.isNaN(t0) && !Number.isNaN(t1) && t1 >= t0) times.push(t1 - t0);
      }
      if (!times.length) return 0;
      times.sort((a, b) => a - b);
      const mid = Math.floor(times.length / 2);
      return times.length % 2 ? times[mid] : Math.floor((times[mid - 1] + times[mid]) / 2);
    }
    function meanLatencyMs(msgs: Message[]): number {
      const times: number[] = [];
      for (let i = 1; i < msgs.length; i++) {
        const t0 = Date.parse(msgs[i - 1].createdAt);
        const t1 = Date.parse(msgs[i].createdAt);
        if (!Number.isNaN(t0) && !Number.isNaN(t1) && t1 >= t0) times.push(t1 - t0);
      }
      if (!times.length) return 0;
      const sum = times.reduce((a, b) => a + b, 0);
      return Math.ceil(sum / times.length);
    }
    function turns(msgs: Message[]): number {
      return msgs.length;
    }
    const a = {
      terminal: sideA.status === "succeeded" || sideA.status === "failed",
      succeeded: sideA.status === "succeeded" || sideA.endedReason === "goal",
      turns: turns(sideA.messages),
      tokens: estimateTokensFromMessages(sideA.messages),
      latency: medianLatencyMs(sideA.messages),
      tokensPerTurn: (() => {
        const t = turns(sideA.messages);
        return t > 0 ? Math.ceil(estimateTokensFromMessages(sideA.messages) / t) : 0;
      })(),
      latencyPerTurn: (() => {
        return meanLatencyMs(sideA.messages);
      })(),
    };
    const b = {
      terminal: sideB.status === "succeeded" || sideB.status === "failed",
      succeeded: sideB.status === "succeeded" || sideB.endedReason === "goal",
      turns: turns(sideB.messages),
      tokens: estimateTokensFromMessages(sideB.messages),
      latency: medianLatencyMs(sideB.messages),
      tokensPerTurn: (() => {
        const t = turns(sideB.messages);
        return t > 0 ? Math.ceil(estimateTokensFromMessages(sideB.messages) / t) : 0;
      })(),
      latencyPerTurn: (() => {
        return meanLatencyMs(sideB.messages);
      })(),
    };
    let winner: "A" | "B" | "tie" = "tie";
    if (a.succeeded && !b.succeeded) winner = "A";
    else if (!a.succeeded && b.succeeded) winner = "B";
    else if (a.succeeded && b.succeeded) {
      if (a.turns !== b.turns) winner = a.turns < b.turns ? "A" : "B";
      else if (a.tokens !== b.tokens) winner = a.tokens < b.tokens ? "A" : "B";
      else if (a.latency !== b.latency) winner = a.latency < b.latency ? "A" : "B";
      else winner = "tie";
    } else {
      // both failed or running: tie for now
      winner = "tie";
    }
    return { a, b, winner } as const;
  }, [arenaJobAId, arenaJobBId, sessions]);

  // Judge result based on arenaSummary with simple rationale
  useEffect(() => {
    if (!arenaSummary) return;
    const { a, b, winner } = arenaSummary;
    // Build concise rationale based on tie-breaker chain
    let reasoning = "";
    if (winner === "tie") {
      reasoning = "Tie: either both failed or all metrics equal.";
    } else if (winner === "A" || winner === "B") {
      const first = winner === "A" ? a : b;
      const second = winner === "A" ? b : a;
      if (first.succeeded && !second.succeeded) {
        reasoning = `${winner} succeeded while the other did not.`;
      } else if (first.turns !== second.turns) {
        reasoning = `${winner} used fewer turns (${first.turns} < ${second.turns}).`;
      } else if (first.tokens !== second.tokens) {
        reasoning = `${winner} used fewer tokens (${first.tokens} < ${second.tokens}).`;
      } else if (first.latency !== second.latency) {
        reasoning = `${winner} had lower median latency (${first.latency}ms < ${second.latency}ms).`;
      } else {
        reasoning = `${winner} is marginally ahead on tie-breakers.`;
      }
    }
    setJudgeResult({ winner, reasoning });
  }, [arenaSummary]);

  return (
    <main className="p-6 grid gap-4 max-w-5xl mx-auto">
      <h1 className="text-2xl text-blue-300">Agent Wars Hub</h1>
      <div className="flex gap-2 text-sm">
        <button
          className={`px-3 py-1 rounded ${activeTab === "hub" ? "bg-blue-600" : "bg-slate-700"}`}
          onClick={() => setActiveTab("hub")}
        >
          Hub
        </button>
        <button
          className={`px-3 py-1 rounded ${activeTab === "arena" ? "bg-blue-600" : "bg-slate-700"}`}
          onClick={() => setActiveTab("arena")}
        >
          Arena (A/B)
        </button>
      </div>

      {activeTab === "hub" ? (
      <>
      <section className="bg-slate-900/70 rounded-xl p-4 grid gap-3">
        {agentsError ? (
          <div className="text-sm text-yellow-300">Failed to load agents</div>
        ) : null}
        <div className="grid gap-1">
          <label className="text-sm text-slate-300">Agent</label>
          <select
            className="rounded bg-slate-800 px-3 py-2 outline-none focus:ring-2 ring-blue-500"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            data-testid="agent-id"
          >
            <option value="">Select an agent…</option>
            {agentsLoading ? (
              <option disabled>Loading…</option>
            ) : Array.isArray(agents) ? (
              agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))
            ) : null}
          </select>
          {errors.agentId && <div className="text-xs text-red-400">{errors.agentId}</div>}
        </div>
        <div className="grid gap-1">
          <ProviderModelSelector
            provider={provider}
            model={model}
            onChange={(next) => {
              setProvider(next.provider);
              setModel(next.model);
            }}
          />
          {/* Hidden test hook */}
          <input type="hidden" data-testid="model-input" value={model} onChange={() => {}} />
          {errors.model && <div className="text-xs text-red-400">{errors.model}</div>}
        </div>
        <div className="grid gap-1">
          <label className="text-sm text-slate-300">System prompt (optional)</label>
          <textarea
            className="w-full rounded bg-slate-800 p-2 outline-none focus:ring-2 ring-blue-500 text-sm"
            rows={3}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            data-testid="system-prompt"
          />
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
            disabled={
              isStarting ||
              !agentId.trim() ||
              !model.trim() ||
              (allowedModels.length > 0 && !allowedModels.includes(model.trim()))
            }
            aria-busy={isStarting}
            data-testid="start"
          >
            {isStarting ? "Starting..." : "Start battle"}
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

      <section className="grid gap-4">
        {sessions.length === 0 ? (
          <div className="text-sm text-slate-400">No sessions started yet.</div>
        ) : (
          sessions
            .filter((v, i, arr) => arr.findIndex((x) => x.id === v.id) === i)
            .map((s) => (
            <div key={s.id} className="bg-slate-900/70 rounded-xl p-4 grid gap-2">
              <div className="flex items-center justify-between">
                <h2 className="text-blue-400">Session {s.id}</h2>
                <div className="text-xs text-slate-400">
                  {s.agent ? `${s.agent.name} · ${s.provider}/${s.model}` : `${s.provider}/${s.model}`}
                </div>
              </div>
              <div className="text-xs text-slate-400" data-testid={`status-${s.id}`}>
                Status: {s.status}
                {s.endedReason ? ` · ended: ${s.endedReason}` : ""}
                {s.error ? ` · ${s.error}` : ""}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center justify-center rounded bg-slate-700 px-3 py-2 hover:bg-slate-600 disabled:opacity-50"
                  onClick={async () => {
                    try {
                      const r = await fetch(`/api/battles/${s.id}/cancel`, { method: "POST" });
                      if (!r.ok) throw new Error("cancel_failed");
                    } catch {
                      // local fallback: mark as manually ended
                      setSessions((prev) =>
                        prev.map((x) =>
                          x.id === s.id
                            ? { ...x, status: "failed", endedReason: "manual" }
                            : x,
                        ),
                      );
                    }
                  }}
                  disabled={s.status === "succeeded" || s.status === "failed"}
                  data-testid={`stop-${s.id}`}
                >
                  Stop
                </button>
                <div className="ml-auto text-[10px] text-slate-400">
                  messages: {s.messages.length} / 25
                </div>
              </div>
              <pre
                ref={(el) => {
                  preRefs.current[s.id] = el;
                }}
                className="min-h-[140px] whitespace-pre-wrap rounded bg-slate-950 p-3 text-xs text-slate-200"
              >
{s.messages.map((m) => `[${m.role}] ${m.content}`).join("\n") || "messages will appear here..."}
              </pre>
            </div>
          ))
        )}
      </section>
      </>
      ) : (
        // Arena tab content
        <section className="bg-slate-900/70 rounded-xl p-4 grid gap-3">
          {agentsError ? (
            <div className="text-sm text-yellow-300">Failed to load agents</div>
          ) : null}
          <div className="grid gap-1">
            <label className="text-sm text-slate-300">Agent</label>
            <select
              className="rounded bg-slate-800 px-3 py-2 outline-none focus:ring-2 ring-blue-500"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              data-testid="arena-agent-id"
            >
              <option value="">Select an agent…</option>
              {agentsLoading ? (
                <option disabled>Loading…</option>
              ) : Array.isArray(agents) ? (
                agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))
              ) : null}
            </select>
          </div>
          <div className="grid gap-1">
            <ProviderModelSelector
              provider={provider}
              model={model}
              onChange={(next) => {
                setProvider(next.provider);
                setModel(next.model);
              }}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm text-slate-300">Broadcast input</label>
            <input
              className="rounded bg-slate-800 px-3 py-2 outline-none focus:ring-2 ring-blue-500"
              value={arena.broadcast}
              onChange={(e) => arena.setBroadcast(e.target.value)}
              placeholder="Type once to send to both A and B"
              data-testid="arena-broadcast"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-slate-950 p-3">
              <div className="text-slate-300 mb-2">Side A</div>
              <label className="text-xs text-slate-400">System Prompt (A)</label>
              <textarea
                className="w-full rounded bg-slate-900 p-2 text-sm"
                rows={4}
                value={arena.promptA}
                onChange={(e) => arena.setPromptA(e.target.value)}
                placeholder="Hidden identity; identical styling"
                data-testid="arena-prompt-a"
              />
              <div className="mt-2 h-24 rounded bg-slate-900 p-2 text-xs text-slate-400">Messages (A) will appear here…</div>
            </div>
            <div className="rounded-xl bg-slate-950 p-3">
              <div className="text-slate-300 mb-2">Side B</div>
              <label className="text-xs text-slate-400">System Prompt (B)</label>
              <textarea
                className="w-full rounded bg-slate-900 p-2 text-sm"
                rows={4}
                value={arena.promptB}
                onChange={(e) => arena.setPromptB(e.target.value)}
                placeholder="Hidden identity; identical styling"
                data-testid="arena-prompt-b"
              />
              <div className="mt-2 h-24 rounded bg-slate-900 p-2 text-xs text-slate-400">Messages (B) will appear here…</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center justify-center rounded bg-purple-600 px-4 py-2 hover:bg-purple-500 disabled:opacity-50"
              onClick={startArenaReal}
              disabled={arenaStarting || !arena.canStart}
              aria-busy={arenaStarting}
              data-testid="arena-start"
            >
              {arenaStarting ? "Starting…" : "Start Arena"}
            </button>
            <button
              className="ml-auto inline-flex items-center justify-center rounded bg-slate-700 px-3 py-2 disabled:opacity-50"
              onClick={() => arena.setReveal(!arena.reveal)}
              disabled={!arenaRunning}
              data-testid="arena-reveal"
            >
              {arena.reveal ? "Hide Participants" : "Reveal Participants"}
            </button>
          </div>
          <div className="text-xs text-slate-400">
            Outcome: {arenaSummary ? (
              <>
                <span className={"inline-flex items-center gap-1 rounded px-2 py-0.5 " + (arenaSummary.winner === "A" ? "bg-green-900/40 text-green-300" : arenaSummary.winner === "B" ? "bg-blue-900/40 text-blue-300" : "bg-slate-800 text-slate-300") }>
                  {arenaSummary.winner === "tie" ? "Tie" : `Winner: ${arenaSummary.winner}`}
                </span>
                {" "}· A: {arenaSummary.a.turns} turns, {arenaSummary.a.tokens} tokens, {arenaSummary.a.latency}ms median latency
                {" "}· B: {arenaSummary.b.turns} turns, {arenaSummary.b.tokens} tokens, {arenaSummary.b.latency}ms median latency
                {judgeResult?.reasoning ? (
                  <span className="ml-2 text-slate-300">· Rationale: {judgeResult.reasoning}</span>
                ) : null}
              </>
            ) : (
              <span className="text-slate-300">TBD</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center justify-center rounded bg-slate-700 px-3 py-2 disabled:opacity-50"
              onClick={() => setJudgeResult({ winner: "tie", reasoning: "Mocked judge: insufficient signal." })}
              disabled={!arenaRunning}
              data-testid="arena-judge"
            >
              Judge (mock)
            </button>
            {judgeResult ? (
              <div className="text-[11px] text-slate-400">Judge: {judgeResult.winner} · {judgeResult.reasoning}</div>
            ) : null}
          </div>
        </section>
      )}
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
  provider: Provider,
  _model: string
): string {
  const tokens = estimateTokens(userMessage, goal);
  // Heuristic flat rate per 1k tokens
  const ratePerK = provider === "openai" ? 0.0015 : 0.0012;
  const cost = (tokens / 1000) * ratePerK;
  return `$${cost.toFixed(4)}`;
}


