import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import HubPage from "app/hub/page";

describe("HubPage start & poll", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/api/agents")) {
          return new Response(
            JSON.stringify({ items: [{ id: "a1", name: "Agent One" }] }),
            { status: 200 },
          );
        }
        if (url.endsWith("/api/config/provider-status")) {
          return new Response(
            JSON.stringify({ allowedModels: ["gpt-4o"] }),
            { status: 200 },
          );
        }
        if (url.endsWith("/api/battles/start")) {
          return new Response(JSON.stringify({ id: "job-1", status: "pending" }), { status: 202 });
        }
        if (url.includes("/api/battles/") && url.endsWith("/status?format=json")) {
          return new Response(
            JSON.stringify({ id: "job-1", type: "battle", status: "succeeded", updatedAt: Date.now(), data: { endedReason: "goal", conversationId: "c1" } }),
            { status: 200 },
          );
        }
        if (url.includes("/api/battles/") && url.includes("/messages")) {
          return new Response(
            JSON.stringify({ items: [{ id: "m1", role: "assistant", content: "done", createdAt: new Date().toISOString() }] }),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify({}), { status: 200 });
      }) as unknown as typeof fetch,
    );
  });

  afterEach(() => {
    try { vi.unstubAllGlobals(); } catch {}
  });

  it("starts a session and shows terminal status with messages", async () => {
    render(<HubPage />);
    // Fill form
    const agent = await screen.findByTestId("agent-id");
    fireEvent.change(agent, { target: { value: "a1" } });
    const modelSelect = screen.queryByTestId("pms-model");
    if (modelSelect) {
      fireEvent.change(modelSelect, { target: { value: "gpt-4o" } });
    } else {
      const modelInput = await screen.findByTestId("model-input");
      fireEvent.change(modelInput, { target: { value: "gpt-4o" } });
    }

    const start = await screen.findByTestId("start");
    await waitFor(() => expect(start).not.toBeDisabled());
    fireEvent.click(start);

    // Advance polling timers and wait for UI to show succeeded
    await waitFor(async () => {
      expect(await screen.findByText(/Status: succeeded/i)).toBeInTheDocument();
    }, { timeout: 10000 });
    // Messages area renders fetched messages
    await screen.findByText(/\[assistant\] done/);
  });
});


