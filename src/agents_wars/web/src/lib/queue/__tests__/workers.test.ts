import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const ORIGINAL_ENV = { ...process.env };

describe("ensureWorkers", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete (global as any).__bull_workers_initialized;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("does nothing when REDIS_URL is not set", async () => {
    delete process.env.REDIS_URL;
    const { ensureWorkers } = await import("@/lib/queue/workers");
    ensureWorkers();
    expect((global as any).__bull_workers_initialized).toBeUndefined();
  });

  it("initializes workers once when REDIS_URL is set (createWorker mocked)", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    vi.doMock("@/lib/queue/bull", () => ({
      createWorker: vi.fn((_name: string, _cfg: any, handler: any) => ({
        on: vi.fn(),
        // Simulate a job call without actually running heavy logic
        __handler: handler,
      })),
    }));
    const { ensureWorkers } = await import("@/lib/queue/workers");
    ensureWorkers();
    expect((global as any).__bull_workers_initialized).toBe(true);
    // Calling again should be a no-op
    ensureWorkers();
    expect((global as any).__bull_workers_initialized).toBe(true);
  });
});
