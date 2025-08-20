import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import HubPage from "app/hub/page";

describe("HubPage Arena Tab", () => {
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
            JSON.stringify({ allowedModels: ["gpt-4o", "gpt-4o-mini"] }),
            { status: 200 },
          );
        }
        if (url.endsWith("/api/battles/start")) {
          // Return unique ids per call
          const body = init?.body ? JSON.parse(String(init.body)) : {};
          const side = body?.systemPrompt ? (body.systemPrompt.includes("A") ? "A" : "B") : Math.random() > 0.5 ? "A" : "B";
          return new Response(JSON.stringify({ id: `job-${side}-${Date.now()}`, status: "pending" }), {
            status: 202,
          });
        }
        if (url.includes("/api/battles/") && url.endsWith("/status?format=json")) {
          // Simulate terminal outcome for side A; running for B
          if (url.includes("A")) {
            return new Response(
              JSON.stringify({ id: "job-A", type: "battle", status: "succeeded", updatedAt: Date.now(), data: { endedReason: "goal" } }),
              { status: 200 },
            );
          }
          return new Response(
            JSON.stringify({ id: "job-B", type: "battle", status: "running", updatedAt: Date.now(), data: {} }),
            { status: 200 },
          );
        }
        if (url.includes("/api/battles/") && url.includes("/messages")) {
          const items = [
            { id: "1", role: "user", content: "hello", createdAt: new Date(Date.now() - 2000).toISOString() },
            { id: "2", role: "assistant", content: "hi", createdAt: new Date(Date.now() - 1000).toISOString() },
          ];
          return new Response(JSON.stringify({ items }), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      }) as unknown as typeof fetch,
    );
  });

  afterEach(() => {
    // Ensure global fetch stubs do not leak into other test suites
    try {
      vi.unstubAllGlobals();
    } catch {}
    vi.restoreAllMocks();
  });

  it("disables Start Arena until valid and enables after inputs", async () => {
    render(<HubPage />);
    // Switch to Arena tab
    const arenaTab = screen.getByRole("button", { name: /arena/i });
    fireEvent.click(arenaTab);

    // Agent select
    const agentSelect = await screen.findByTestId("arena-agent-id");
    fireEvent.change(agentSelect, { target: { value: "a1" } });

    // Model via ProviderModelSelector (prefer select when present)
    const modelSelect = screen.queryByTestId("pms-model");
    if (modelSelect) {
      fireEvent.change(modelSelect, { target: { value: "gpt-4o" } });
    } else {
      const modelInput = await screen.findByTestId("pms-model-input");
      fireEvent.change(modelInput, { target: { value: "gpt-4o" } });
    }

    // Broadcast empty keeps disabled
    const startBtn = await screen.findByTestId("arena-start");
    expect(startBtn).toBeDisabled();

    const broadcast = screen.getByTestId("arena-broadcast");
    fireEvent.change(broadcast, { target: { value: "Hello world" } });
    await waitFor(() => expect(startBtn).not.toBeDisabled());

    // Start and then interact with reveal and judge
    fireEvent.click(startBtn);
    const revealBtn = await screen.findByTestId("arena-reveal");
    // Initially disabled until running toggled by start
    // Our mocked start sets running state; wait for enable
    await waitFor(() => expect(revealBtn).not.toBeDisabled());
    fireEvent.click(revealBtn);
    // Judge button
    const judgeBtn = await screen.findByTestId("arena-judge");
    fireEvent.click(judgeBtn);
    await screen.findByText(/Judge: /i);
    // Outcome metrics should render when summary is available
    await screen.findByText(/turns, .* tokens/);
  });
});


