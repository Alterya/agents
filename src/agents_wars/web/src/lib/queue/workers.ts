import { createWorker } from "@/lib/queue/bull";
import { runBattle, type BattleInput, runScaleTest } from "@/lib/runners";
import { updateJob } from "@/lib/jobs";

declare global {
  // eslint-disable-next-line no-var
  var __bull_workers_initialized: boolean | undefined;
}

export function ensureWorkers(): void {
  if (global.__bull_workers_initialized) return;
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return;

  // Battle worker
  createWorker("battles", { redisUrl }, async (job) => {
    const { id, input } = job.data as { id: string; input: BattleInput };
    try {
      const res = await runBattle(input as BattleInput);
      updateJob(id, { status: "succeeded", data: res });
      return res;
    } catch (err: any) {
      updateJob(id, { status: "failed", error: String(err?.message ?? err) });
      throw err;
    }
  });

  // Scale worker
  createWorker("scale-tests", { redisUrl }, async (job) => {
    const { id, input } = job.data as { id: string; input: Parameters<typeof runScaleTest>[0] };
    try {
      const res = await runScaleTest(input);
      updateJob(id, { status: "succeeded", data: res });
      return res;
    } catch (err: any) {
      updateJob(id, { status: "failed", error: String(err?.message ?? err) });
      throw err;
    }
  });

  global.__bull_workers_initialized = true;
}
