import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import { runBattle, type BattleInput } from "@/lib/runners";
import { getConfig } from "@/lib/config";

export type JobId = string;

type BattleEvent =
  | { type: "delta"; data: string }
  | { type: "done" }
  | { type: "error"; message: string };

type JobRecord = {
  id: JobId;
  emitter: EventEmitter;
  status: "queued" | "running" | "done" | "error" | "cancelled";
  cancelled: boolean;
  input?: BattleInput;
};

const jobs: Map<JobId, JobRecord> = new Map();

export function getJob(jobId: JobId): JobRecord | undefined {
  return jobs.get(jobId);
}

export function enqueueBattleRun(input?: BattleInput): JobId {
  const id = randomUUID();
  const emitter = new EventEmitter();
  const rec: JobRecord = { id, emitter, status: "queued", cancelled: false, input };
  jobs.set(id, rec);
  // Kick off async work
  void runJob(rec);
  return id;
}

async function runJob(rec: JobRecord): Promise<void> {
  rec.status = "running";
  // Simulate a couple of streaming deltas then done
  try {
    // small ticks to simulate progress
    await delay(10);
    if (rec.cancelled) return finalizeCancelled(rec);
    rec.emitter.emit("event", { type: "delta", data: "Battle started. " } satisfies BattleEvent);
    await delay(10);
    if (rec.cancelled) return finalizeCancelled(rec);
    rec.emitter.emit("event", { type: "delta", data: "Processing… " } satisfies BattleEvent);
    if (rec.input && isValidBattleInput(rec.input)) {
      const timeoutMs = getConfig().requestTimeoutMs;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), timeoutMs),
      );
      await Promise.race([
        runBattle(rec.input as BattleInput, (delta) => {
          rec.emitter.emit("event", { type: "delta", data: delta } satisfies BattleEvent);
        }),
        timeoutPromise,
      ]);
    }
    await delay(10);
    if (rec.cancelled) return finalizeCancelled(rec);
    rec.emitter.emit("event", { type: "done" } satisfies BattleEvent);
    rec.status = "done";
    jobs.delete(rec.id);
  } catch (e) {
    rec.status = "error";
    const message = String((e as Error)?.message || e) === "timeout" ? "timeout" : "internal_error";
    rec.emitter.emit("event", { type: "error", message } satisfies BattleEvent);
    jobs.delete(rec.id);
  }
}

function finalizeCancelled(rec: JobRecord): void {
  rec.status = "cancelled";
  rec.emitter.emit("event", { type: "error", message: "cancelled" } satisfies BattleEvent);
  jobs.delete(rec.id);
}

export function subscribe(
  jobId: JobId,
  onEvent: (ev: BattleEvent) => void,
): (() => void) | undefined {
  const job = jobs.get(jobId);
  if (!job) return undefined;
  const listener = (ev: BattleEvent) => onEvent(ev);
  job.emitter.on("event", listener);
  return () => job.emitter.off("event", listener);
}

export function getJobStatus(jobId: JobId): JobRecord["status"] | undefined {
  return jobs.get(jobId)?.status;
}

export function cancelJob(jobId: JobId): boolean {
  const job = jobs.get(jobId);
  if (!job) return false;
  job.cancelled = true;
  return true;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isValidBattleInput(v: unknown): v is BattleInput {
  const x = v as any;
  return (
    x &&
    typeof x.agentId === "string" &&
    x.agentId.length > 0 &&
    (x.provider === "openai" || x.provider === "openrouter") &&
    typeof x.model === "string" &&
    x.model.length > 0
  );
}
