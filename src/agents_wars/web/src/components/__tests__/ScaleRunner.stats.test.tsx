import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ScaleRunner from "@/components/features/scale/ScaleRunner";

class MockEventSource {
  url: string;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(url: string) {
    this.url = url;
  }
  close() {}
}

describe("ScaleRunner stats badges & mini-cards", () => {
  let esInstance: MockEventSource | null = null;

  beforeEach(() => {
    vi.resetAllMocks();
    // Stub crypto.randomUUID if missing
    if (!(globalThis as any).crypto) {
      (globalThis as any).crypto = {} as any;
    }
    if (!(globalThis as any).crypto.randomUUID) {
      (globalThis as any).crypto.randomUUID = () => "uuid-test";
    }

    // Stub EventSource
    esInstance = null;
    vi.stubGlobal("EventSource", vi.fn((url: string) => {
      esInstance = new MockEventSource(url);
      return esInstance as unknown as EventSource;
    }));

    // Stub fetch for start and report
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/api/scale/start")) {
          return new Response(JSON.stringify({ id: "run-1", status: "pending", estimatedUsd: 0.0123 }), { status: 202 });
        }
        if (url.endsWith("/api/scale/run-1/report")) {
          return new Response(
            JSON.stringify({ summary: "Batch complete", revisedPrompt: null, stats: { total: 5, succeeded: 4, failed: 1, rationale: "ok", actualUsd: 0.0123 } }),
            { status: 200 },
          );
        }
        if (url.includes("/api/battles/") && url.includes("/messages")) {
          return new Response(JSON.stringify({ items: [] }), { status: 200 });
        }
        // default
        return new Response(JSON.stringify({}), { status: 200 });
      }) as unknown as typeof fetch,
    );
  });

  afterEach(() => {
    try { vi.unstubAllGlobals(); } catch {}
    vi.restoreAllMocks();
  });

  it("renders succeeded/failed badges, win rate, and mini-cards after completion", async () => {
    render(<ScaleRunner agents={[{ id: "a1", name: "Agent One" }]} />);

    // set model to enable start
    const modelSelect = screen.queryByTestId("pms-model");
    if (modelSelect) {
      fireEvent.change(modelSelect, { target: { value: "gpt-4o" } });
    } else {
      const modelInput = await screen.findByTestId("pms-model-input");
      fireEvent.change(modelInput, { target: { value: "gpt-4o" } });
    }

    const btn = screen.getByRole("button", { name: /start batch/i });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);

    // simulate status updates then completion
    await waitFor(() => expect(esInstance).not.toBeNull());
    // running update with data
    const runningJob = {
      id: "run-1",
      type: "scale",
      status: "succeeded",
      updatedAt: Date.now(),
      createdAt: Date.now(),
      data: { total: 5, succeeded: 4, failed: 1, runId: "run-1" },
    } as any;
    await act(async () => {
      esInstance!.onmessage?.({ data: JSON.stringify(runningJob) } as MessageEvent);
    });
    // now end the stream to trigger report fetch
    await act(async () => {
      esInstance!.onmessage?.({ data: "[DONE]" } as MessageEvent);
    });

    // Expect badges and win rate
    await waitFor(() => {
      expect(screen.getByText(/Succeeded: 4/i)).toBeInTheDocument();
      expect(screen.getByText(/Failed: 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Win rate: 80%/i)).toBeInTheDocument();
      const money = screen.getAllByText(/^\$\d+\.\d{4}$/);
      expect(money.length).toBeGreaterThan(0);
      expect(screen.getByText(/Run Report/i)).toBeInTheDocument();
    });
  });
});


