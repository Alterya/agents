import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import HubPage from "app/hub/page";

describe("Hub invalid agent handling", () => {
  afterEach(() => {
    try { vi.unstubAllGlobals(); } catch {}
    vi.restoreAllMocks();
  });

  it("renders a failed session entry with friendly message when invalid_agent", async () => {
    // Mock fetch endpoints used by Hub
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/api/agents")) {
          return new Response(JSON.stringify({ items: [{ id: "ghost", name: "Ghost" }] }), { status: 200, headers: { "content-type": "application/json" } });
        }
        if (url.endsWith("/api/config/provider-status")) {
          return new Response(JSON.stringify({ openaiConfigured: true, openrouterConfigured: false, allowedModels: [] }), { status: 200, headers: { "content-type": "application/json" } });
        }
        if (url.endsWith("/api/battles/start") && init?.method === "POST") {
          return new Response(JSON.stringify({ error: "invalid_agent" }), { status: 400, headers: { "content-type": "application/json" } });
        }
        if (url.includes("/api/battles/") && url.includes("/status")) {
          return new Response(JSON.stringify({ id: "x", type: "battle", status: "failed" }), { status: 200, headers: { "content-type": "application/json" } });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      }) as unknown as typeof fetch,
    );

    render(<HubPage />);

    // Wait for agents to load then select the ghost agent
    const agentSelect = await screen.findByTestId("agent-id");
    fireEvent.change(agentSelect, { target: { value: "ghost" } });

    // Set model via hidden test hook
    // ProviderModelSelector renders pms-model-input (hidden) when no allowed models
    const modelInput = await screen.findByTestId("pms-model-input");
    fireEvent.change(modelInput, { target: { value: "gpt-4o" } });

    const startBtn = await screen.findByTestId("start");
    expect(startBtn).toBeEnabled();
    fireEvent.click(startBtn);

    // A synthetic failed session should appear with the friendly error
    await waitFor(async () => {
      const failed = await screen.findAllByText(/Selected agent is invalid or not found/i);
      expect(failed.length).toBeGreaterThan(0);
    });
  });
});


