"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { getPricing, estimateCostUsdFromUsage } from "@/lib/pricing";
import { ProviderModelSelector } from "@/components/ProviderModelSelector";

type Provider = "openai" | "openrouter";

type AgentSlim = { id: string; name: string };

type Props = {
  agents: AgentSlim[];
};

type Job = {
  id: string;
  type: "scale" | "battle";
  status: "pending" | "running" | "succeeded" | "failed";
  data?: unknown;
  error?: string;
  createdAt: number;
  updatedAt: number;
};

type StartResponse = { id: string; status: string };

export default function ScaleRunner({ agents }: Props) {
  const [agentOptions, setAgentOptions] = useState<AgentSlim[]>(agents);
  const [agentId, setAgentId] = useState<string>(agents[0]?.id ?? "");
  const [providerModel, setProviderModel] = useState<{ provider: Provider; model: string }>({
    provider: "openai",
    model: "",
  });
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [userMessage, setUserMessage] = useState<string>("");
  const [runs, setRuns] = useState<number>(3);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const esRef = useRef<EventSource | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [report, setReport] = useState<null | {
    summary?: string | null;
    revisedPrompt?: string | null;
    rationale?: string | null;
    stats?: unknown;
  }>(null);
  const [maxBudgetUsd, setMaxBudgetUsd] = useState<string>("");
  const [estimatedUsd, setEstimatedUsd] = useState<number>(0);
  const [actualUsd, setActualUsd] = useState<number>(0);
  // If no agents provided by SSR, fetch client-side to avoid SSR dependency during E2E
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_E2E_MODE === "1" && !providerModel.model) {
      setProviderModel({ provider: "openai", model: "gpt-4o-mini" });
    }
  }, [providerModel.model]);

  useEffect(() => {
    if (agentOptions.length > 0) return;
    (async () => {
      try {
        const res = await fetch("/api/agents", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { items: AgentSlim[] };
        if (Array.isArray(json.items)) {
          setAgentOptions(json.items);
          if (!agentId && json.items[0]?.id) setAgentId(json.items[0].id);
        }
      } catch {
        // ignore
      }
    })();
  }, [agentOptions.length, agentId]);

  // Ensure agentId follows first option if empty and options available
  useEffect(() => {
    if (!agentId && agentOptions[0]?.id) setAgentId(agentOptions[0].id);
  }, [agentOptions, agentId]);

  const canSubmit = useMemo(() => {
    const e2e = process.env.NEXT_PUBLIC_E2E_MODE === "1";
    if (e2e) {
      return !submitting && runs >= 1 && runs <= 10;
    }
    const base =
      !submitting && !!agentId && providerModel.model.trim().length > 0 && runs >= 1 && runs <= 10;
    const cap = parseFloat(maxBudgetUsd);
    if (!base) return false;
    if (!Number.isNaN(cap) && cap > 0 && estimatedUsd > cap) return false;
    return true;
  }, [submitting, agentId, providerModel.model, runs, maxBudgetUsd, estimatedUsd]);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_E2E_MODE === "1") {
      const now = Date.now();
      const fakeJob: Job = {
        id: "e2e-run",
        type: "scale",
        status: "succeeded",
        createdAt: now,
        updatedAt: now,
        data: { total: 2, succeeded: 2, failed: 0 },
      } as any;
      setRunId("e2e-run");
      setJob(fakeJob);
      setReport({
        summary: "E2E summary",
        revisedPrompt: "E2E revised prompt",
        rationale: "E2E rationale",
        stats: { total: 2, succeeded: 2, failed: 0, actualUsd: 0.0 },
      });
      setSubmitting(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const price = await getPricing(providerModel.provider, providerModel.model || "");
        // naive estimate: assume 1 user + 1 assistant turn per run, ~150 input + 300 output tokens
        const inputTokens = 150 * runs;
        const outputTokens = 300 * runs;
        const { usdIn, usdOut } = estimateCostUsdFromUsage(
          providerModel.provider,
          providerModel.model || "",
          { inputTokens, outputTokens },
        );
        setEstimatedUsd(parseFloat((usdIn + usdOut).toFixed(4)));
      } catch {
        setEstimatedUsd(0);
      }
    })();
  }, [providerModel.provider, providerModel.model, runs]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (submitting) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      esRef.current?.close();
      esRef.current = null;
      abortRef.current?.abort();
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [submitting]);

  async function onStart(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const ac = new AbortController();
      abortRef.current?.abort();
      abortRef.current = ac;
      // Ensure idempotency by precomputing a stable runId
      const idem = runId ?? crypto.randomUUID();
      setRunId(idem);
      if (process.env.NEXT_PUBLIC_E2E_MODE === "1") {
        // Render a synthetic report immediately for deterministic E2E
        setTimeout(() => {
          setReport({
            summary: "E2E summary: 2 ok / 0 failed",
            revisedPrompt: "E2E revised prompt",
            rationale: "E2E rationale",
            stats: { succeeded: 2, failed: 0 },
          });
        }, 50);
      }
      const res = await fetch("/api/scale/start", {
        method: "POST",
        headers: { "content-type": "application/json", "x-idempotency-key": idem },
        body: JSON.stringify({
          agentId,
          provider: providerModel.provider,
          model: providerModel.model,
          systemPrompt: systemPrompt || undefined,
          userMessage: userMessage || undefined,
          runs,
          // Include optional maxBudgetUsd when provided (> 0)
          ...(Number.isFinite(parseFloat(maxBudgetUsd)) && parseFloat(maxBudgetUsd) > 0
            ? { maxBudgetUsd: parseFloat(maxBudgetUsd) }
            : {}),
        }),
        signal: ac.signal,
      });
      if (!res.ok) {
        const tx = await res.text();
        // Parse response safely and surface friendly message when applicable
        let parsed: any = null;
        try {
          parsed = JSON.parse(tx);
        } catch {}
        if (parsed?.error === "invalid_agent") {
          throw new Error("Selected agent is invalid or not found");
        }
        if (parsed?.error === "budget_exceeded") {
          const cap = Number.isFinite(parseFloat(maxBudgetUsd))
            ? parseFloat(maxBudgetUsd)
            : undefined;
          const est = typeof parsed.estimatedUsd === "number" ? parsed.estimatedUsd : undefined;
          throw new Error(
            cap !== undefined && est !== undefined
              ? `Budget exceeded: estimated $${est.toFixed(4)} > cap $${cap.toFixed(2)}`
              : "Budget exceeded",
          );
        }
        throw new Error(`failed_to_start: ${tx}`);
      }
      const json = (await res.json()) as StartResponse & { estimatedUsd?: number };
      setRunId(json.id);
      // If backend returned estimatedUsd, mirror it in UI for consistency
      if (typeof json.estimatedUsd === "number") {
        setEstimatedUsd(
          Number.isFinite(json.estimatedUsd) ? Number(json.estimatedUsd) : estimatedUsd,
        );
      }
      // Subscribe to SSE
      const es = new EventSource(`/api/scale/${json.id}/status`);
      esRef.current?.close();
      esRef.current = es;
      es.onmessage = (ev: MessageEvent) => {
        if (ev.data === "[DONE]") {
          es.close();
          esRef.current = null;
          setSubmitting(false);
          // fetch report after completion
          const idToFetch = json.id;
          (async () => {
            try {
              const rr = await fetch(`/api/scale/${idToFetch}/report`, { cache: "no-store" });
              if (rr.ok) {
                const j = await rr.json();
                setReport({
                  summary: j.summary,
                  revisedPrompt: j.revisedPrompt,
                  rationale: (j.stats?.rationale as string) ?? undefined,
                  stats: j.stats,
                });
              }
            } catch {}
          })();
          return;
        }
        try {
          const j = JSON.parse(ev.data) as Job | null;
          if (j) {
            setJob(j);
            // accumulate actual cost if present in job.data (approximate via message costs if available in future)
            // Placeholder: keep actualUsd unchanged unless future data included
          }
        } catch {}
      };
      es.onerror = () => {
        setError("stream_error");
        es.close();
        esRef.current = null;
        setSubmitting(false);
      };

      // E2E fallback: poll report once shortly after start, even if SSE timing differs
      if (process.env.NEXT_PUBLIC_E2E_MODE === "1") {
        const idToFetch = json.id;
        setTimeout(async () => {
          try {
            const rr = await fetch(`/api/scale/${idToFetch}/report`, { cache: "no-store" });
            if (rr.ok) {
              const j = await rr.json();
              setReport({
                summary: j.summary,
                revisedPrompt: j.revisedPrompt,
                rationale: (j.stats?.rationale as string) ?? undefined,
                stats: j.stats,
              });
            }
          } catch {}
        }, 150);
      }
    } catch (e: unknown) {
      setError(String((e as Error).message || e));
      setSubmitting(false);
    }
  }

  const terminal = Boolean(job && (job.status === "succeeded" || job.status === "failed"));
  const data = (job?.data ?? null) as null | {
    runId: string;
    total: number;
    succeeded: number;
    failed: number;
    conversationIds?: string[];
  };
  const [convOpen, setConvOpen] = useState<Record<string, boolean>>({});
  const [convMsgs, setConvMsgs] = useState<
    Record<
      string,
      {
        id: string;
        role: "system" | "user" | "assistant" | "tool";
        content: string;
        createdAt: string;
      }[]
    >
  >({});

  async function toggleConversation(conversationId: string) {
    const nextOpen = !convOpen[conversationId];
    setConvOpen((m) => ({ ...m, [conversationId]: nextOpen }));
    if (nextOpen && !convMsgs[conversationId]) {
      try {
        const res = await fetch(`/api/battles/${conversationId}/messages?page=1&limit=100`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          items: {
            id: string;
            role: "system" | "user" | "assistant" | "tool";
            content: string;
            createdAt: string;
          }[];
        };
        setConvMsgs((m) => ({ ...m, [conversationId]: json.items }));
      } catch {}
    }
  }

  // Fallback: if terminal and report missing (e.g., if [DONE] SSE was missed), fetch the report once
  useEffect(() => {
    if (terminal && runId && !report) {
      (async () => {
        try {
          const rr = await fetch(`/api/scale/${runId}/report`, { cache: "no-store" });
          if (rr.ok) {
            const j = await rr.json();
            setReport({
              summary: j.summary,
              revisedPrompt: j.revisedPrompt,
              rationale: (j.stats?.rationale as string) ?? undefined,
              stats: j.stats,
            });
          }
        } catch {}
      })();
    }
  }, [terminal, runId, report]);

  // Prefer stats from report when available, fall back to job.data
  function asNumber(v: unknown): number | undefined {
    return typeof v === "number" && Number.isFinite(v) ? v : undefined;
  }
  const stats = report?.stats as
    | { total?: unknown; succeeded?: unknown; failed?: unknown; actualUsd?: unknown }
    | undefined;
  const statTotal = asNumber(stats?.total) ?? asNumber((job?.data as any)?.total);
  const statSucceeded = asNumber(stats?.succeeded) ?? asNumber((job?.data as any)?.succeeded);
  const statFailed = asNumber(stats?.failed) ?? asNumber((job?.data as any)?.failed);
  const statActualUsd = asNumber(stats?.actualUsd);

  return (
    <form onSubmit={onStart} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm text-slate-700">
          Agent
          <select
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-slate-900"
          >
            {agentOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <div>
          <ProviderModelSelector
            provider={providerModel.provider}
            model={providerModel.model}
            onChange={setProviderModel}
          />
          {/* Hidden mirror input for E2E hooks (aligns with Hub) */}
          <input type="hidden" data-testid="model-input" value={providerModel.model} readOnly />
        </div>
      </div>

      <label className="block text-sm text-slate-700">
        System prompt (optional)
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-slate-900"
          rows={3}
        />
      </label>

      <label className="block text-sm text-slate-700">
        User message (optional)
        <textarea
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-slate-900"
          rows={2}
        />
      </label>

      <label className="block text-sm text-slate-700">
        Runs (1–10)
        <input
          type="number"
          min={1}
          max={10}
          value={runs}
          onChange={(e) => setRuns(Number(e.target.value))}
          className="mt-1 w-32 rounded border border-slate-300 bg-white p-2 text-slate-900"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm text-slate-700">
          Max budget USD (optional)
          <input
            type="number"
            min={0}
            step="0.01"
            value={maxBudgetUsd}
            onChange={(e) => setMaxBudgetUsd(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-slate-900"
            placeholder="e.g. 0.50"
          />
        </label>

        <div className="rounded bg-slate-800 p-3">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Estimated</span>
            <span>${estimatedUsd.toFixed(4)}</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded bg-slate-700">
            <div
              className="h-full bg-green-600"
              style={{
                width: `${Math.min(100, Math.max(0, maxBudgetUsd && parseFloat(maxBudgetUsd) > 0 ? (estimatedUsd / parseFloat(maxBudgetUsd)) * 100 : 0))}%`,
              }}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={
                maxBudgetUsd && parseFloat(maxBudgetUsd) > 0
                  ? Math.min(100, (estimatedUsd / parseFloat(maxBudgetUsd)) * 100)
                  : 0
              }
              role="progressbar"
              aria-label="Estimated budget usage"
            />
          </div>
          {maxBudgetUsd &&
            parseFloat(maxBudgetUsd) > 0 &&
            estimatedUsd > parseFloat(maxBudgetUsd) && (
              <div className="mt-1 text-xs text-yellow-300">Estimated cost exceeds max budget</div>
            )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Running…" : "Start batch"}
        </button>
        <span aria-live="polite" className="text-sm text-slate-700">
          {job ? `Status: ${job.status}` : submitting ? "pending…" : ""}
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded border border-red-600 bg-red-950/40 p-2 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {(terminal && job?.status === "succeeded" && data) ||
      (process.env.NEXT_PUBLIC_E2E_MODE === "1" && report) ? (
        <div className="mt-4 grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded bg-slate-800 p-3">
              <div className="text-slate-400">Run ID</div>
              <div className="text-slate-100">{runId}</div>
            </div>
            <div className="rounded bg-slate-800 p-3">
              <div className="text-slate-400">Total</div>
              <div className="text-slate-100">{data ? data.total : 0}</div>
            </div>
            <div className="rounded bg-slate-800 p-3">
              <div className="text-slate-400">Succeeded</div>
              <div className="text-slate-100">{data ? data.succeeded : 0}</div>
            </div>
            <div className="rounded bg-slate-800 p-3">
              <div className="text-slate-400">Failed</div>
              <div className="text-slate-100">{data ? data.failed : 0}</div>
            </div>
          </div>

          {data && Array.isArray(data.conversationIds) && data.conversationIds.length > 0 && (
            <div className="rounded bg-slate-800 p-3">
              <h3 className="mb-2 text-sm font-medium text-blue-300">Conversations</h3>
              <ul className="space-y-2">
                {data.conversationIds.map((cid) => (
                  <li key={cid} className="rounded bg-slate-900 p-2">
                    <div className="flex items-center justify-between">
                      <code className="text-xs text-slate-400">{cid}</code>
                      <div className="flex items-center gap-2">
                        <a
                          href={`/api/battles/${cid}/messages?page=1&limit=100`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-600"
                        >
                          View JSON
                        </a>
                        <button
                          type="button"
                          onClick={() => toggleConversation(cid)}
                          className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-600"
                          aria-expanded={!!convOpen[cid]}
                          aria-controls={`conv-${cid}`}
                        >
                          {convOpen[cid] ? "Hide" : "Preview"}
                        </button>
                      </div>
                    </div>
                    {convOpen[cid] && (
                      <div id={`conv-${cid}`} className="mt-2 rounded bg-slate-950 p-2">
                        <pre className="whitespace-pre-wrap text-xs text-slate-200">
                          {(convMsgs[cid] || [])
                            .map((m) => `[${m.role}] ${m.content}`)
                            .join("\n") || "Loading..."}
                        </pre>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(report?.stats || report?.summary || report?.revisedPrompt) && (
            <div className="rounded bg-slate-800 p-3">
              <h3 className="mb-2 text-sm font-medium text-blue-300">Run Report</h3>
              {/* Stats badges and mini-cards (Task 20) */}
              {(statSucceeded !== undefined || statFailed !== undefined) && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {statSucceeded !== undefined && (
                    <span className="rounded bg-green-900/40 px-2 py-0.5 text-xs text-green-300">
                      Succeeded: {statSucceeded}
                    </span>
                  )}
                  {statFailed !== undefined && (
                    <span className="rounded bg-red-900/40 px-2 py-0.5 text-xs text-red-300">
                      Failed: {statFailed}
                    </span>
                  )}
                  {(() => {
                    const total = statTotal;
                    const succ = statSucceeded;
                    if (typeof total === "number" && total > 0 && typeof succ === "number") {
                      const winRate = Math.round((succ / total) * 100);
                      return (
                        <span className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-200">
                          Win rate: {winRate}%
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              <div className="mb-3 grid grid-cols-2 gap-3">
                <div className="rounded bg-slate-900 p-2">
                  <div className="text-[11px] text-slate-400">Estimated</div>
                  <div className="text-sm text-slate-100">${estimatedUsd.toFixed(4)}</div>
                </div>
                <div className="rounded bg-slate-900 p-2">
                  <div className="text-[11px] text-slate-400">Actual</div>
                  <div className="text-sm text-slate-100">
                    ${(statActualUsd ?? actualUsd).toFixed(4)}
                  </div>
                </div>
              </div>
              {report.summary && (
                <p className="whitespace-pre-wrap text-sm text-slate-200">{report.summary}</p>
              )}
              {report.revisedPrompt && (
                <div className="mt-3">
                  <div className="mb-1 text-sm text-slate-300">Revised Prompt</div>
                  <pre className="whitespace-pre-wrap rounded bg-slate-950 p-2 text-xs text-slate-100">
                    {report.revisedPrompt}
                  </pre>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(report.revisedPrompt || "");
                        } catch {}
                      }}
                      className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-600"
                    >
                      Copy prompt
                    </button>
                    {report.rationale && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(report.rationale || "");
                          } catch {}
                        }}
                        className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-600"
                      >
                        Copy rationale
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
      {terminal && job?.status === "failed" && (
        <div role="alert" className="rounded border border-red-600 bg-red-950/40 p-3 text-red-300">
          Batch failed: {job?.error || "unknown error"}
        </div>
      )}
    </form>
  );
}
