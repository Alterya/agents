import { Queue, Worker, JobsOptions, QueueEvents, type Job } from "bullmq";

export type BullConfig = {
  redisUrl: string;
};

export function createQueue(name: string, cfg: BullConfig) {
  const connection = new URL(cfg.redisUrl);
  const queue = new Queue(name, {
    connection: {
      host: connection.hostname,
      port: Number(connection.port) || 6379,
      password: connection.password || undefined,
    } as any,
  });
  const events = new QueueEvents(name, { connection: (queue as any).opts.connection });
  return { queue, events };
}

export function createWorker(
  name: string,
  cfg: BullConfig,
  handler: (job: Job) => Promise<unknown>,
) {
  const connection = new URL(cfg.redisUrl);
  const worker = new Worker(name, handler, {
    connection: {
      host: connection.hostname,
      port: Number(connection.port) || 6379,
      password: connection.password || undefined,
    } as any,
  });
  return worker;
}

export async function addJob<T>(queue: Queue, name: string, data: T, opts?: JobsOptions) {
  return queue.add(name, data as any, opts);
}

// Optional BullMQ adapter (guarded by REDIS_URL). No-op by default.
export type EnqueueOpts = {
  queueName: string;
  payload: Record<string, unknown>;
};

export function hasRedis(): boolean {
  return typeof process !== "undefined" && !!process.env.REDIS_URL;
}

export async function enqueue(opts: EnqueueOpts): Promise<{ id: string } | null> {
  if (!hasRedis()) return null;
  // Lazy import only when enabled to avoid bundling
  const { Queue } = await import("bullmq");
  const connection = { connection: { url: process.env.REDIS_URL as string } } as any;
  const q = new Queue(opts.queueName, connection);
  const job = await q.add(opts.queueName, opts.payload, {
    removeOnComplete: { age: 86400, count: 1000 },
    removeOnFail: { age: 604800, count: 1000 },
  });
  return { id: job.id as string };
}

export async function getJobById(
  queueName: string,
  id: string,
): Promise<{ id: string; state: string } | null> {
  if (!hasRedis()) return null;
  const { Queue } = await import("bullmq");
  const connection = { connection: { url: process.env.REDIS_URL as string } } as any;
  const q = new Queue(queueName, connection);
  const job = await q.getJob(id);
  if (!job) return null;
  const state = (await job.getState()) || "unknown";
  return { id: job.id as string, state };
}
