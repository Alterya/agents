type JobType = "battle" | "scale";
type JobStatus = "pending" | "running" | "succeeded" | "failed";

export type Job = {
  id: string;
  type: JobType;
  status: JobStatus;
  data?: unknown;
  error?: string;
  createdAt: number;
  updatedAt: number;
};

type Listener = (job: Job) => void;

const jobs = new Map<string, Job>();
const listeners = new Map<string, Set<Listener>>();
const jobOwners = new Map<string, string>();
const ownerActiveCounts = new Map<string, number>();

const EVICT_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function createJob(id: string, type: JobType, owner?: string): Job {
  const now = Date.now();
  const job: Job = { id, type, status: "pending", createdAt: now, updatedAt: now };
  jobs.set(id, job);
  if (owner) {
    jobOwners.set(id, owner);
    ownerActiveCounts.set(owner, (ownerActiveCounts.get(owner) ?? 0) + 1);
  }
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function updateJob(
  id: string,
  patch: Partial<Omit<Job, "id" | "createdAt">>,
): Job | undefined {
  const cur = jobs.get(id);
  if (!cur) return undefined;
  const next: Job = { ...cur, ...patch, updatedAt: Date.now() } as Job;
  jobs.set(id, next);
  const ls = listeners.get(id);
  if (ls) for (const cb of ls) cb(next);

  // When job reaches a terminal state, decrement owner's active count and schedule eviction
  if (next.status === "succeeded" || next.status === "failed") {
    const owner = jobOwners.get(id);
    if (owner) {
      const curCount = ownerActiveCounts.get(owner) ?? 0;
      ownerActiveCounts.set(owner, Math.max(0, curCount - 1));
      jobOwners.delete(id);
    }
    const ttl = process.env.NEXT_PUBLIC_E2E_MODE === "1" ? 250 : EVICT_TTL_MS;
    setTimeout(() => {
      jobs.delete(id);
      listeners.delete(id);
    }, ttl);
  }
  return next;
}

export function subscribeJob(id: string, cb: Listener): () => void {
  const set = listeners.get(id) ?? new Set<Listener>();
  set.add(cb);
  listeners.set(id, set);
  return () => {
    const s = listeners.get(id);
    if (!s) return;
    s.delete(cb);
    if (s.size === 0) listeners.delete(id);
  };
}

export function getActiveCountForOwner(owner: string): number {
  return ownerActiveCounts.get(owner) ?? 0;
}

export function canStartJobForOwner(owner: string, cap: number): boolean {
  return (ownerActiveCounts.get(owner) ?? 0) < cap;
}
