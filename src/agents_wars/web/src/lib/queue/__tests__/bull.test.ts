import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Use dynamic import inside tests to pick up env/mocks correctly

const ORIGINAL_ENV = { ...process.env };

describe("bull enqueue/hasRedis", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
  });

  it("hasRedis returns false and enqueue is no-op when REDIS_URL is absent", async () => {
    delete process.env.REDIS_URL;
    const mod = await import("@/lib/queue/bull");
    expect(mod.hasRedis()).toBe(false);
    const res = await mod.enqueue({ queueName: "test-queue", payload: { a: 1 } });
    expect(res).toBeNull();
  });

  it("enqueue uses BullMQ when REDIS_URL is set (mocked)", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    vi.doMock("bullmq", () => {
      class QueueMock {
        name: string;
        constructor(name: string) {
          this.name = name;
        }
        async add(_name: string, _payload: any) {
          return { id: "job-1" } as any;
        }
      }
      return { Queue: QueueMock } as any;
    });
    const mod = await import("@/lib/queue/bull");
    expect(mod.hasRedis()).toBe(true);
    const res = await mod.enqueue({ queueName: "test-queue", payload: { a: 1 } });
    expect(res).toEqual({ id: "job-1" });
  });
});
