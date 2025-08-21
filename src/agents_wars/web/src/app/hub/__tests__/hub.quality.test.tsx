import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import HubPage from "app/hub/page";

describe("HubPage quality checks", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("updates token estimate when goal/user message changes", async () => {
    // Minimal fetch mocks for initial load
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/agents")) {
          return new Response(JSON.stringify({ items: [] }), { status: 200 });
        }
        if (url.endsWith("/api/config/provider-status")) {
          return new Response(JSON.stringify({ allowedModels: [] }), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      }) as unknown as typeof fetch,
    );

    render(<HubPage />);

    // Initially shows zero tokens
    const costRow = await screen.findByText(/~Tokens:/);
    expect(costRow.textContent).toMatch(/~Tokens:\s*0/i);

    const goal = screen.getByTestId("goal");
    fireEvent.change(goal, { target: { value: "this is a short goal" } });

    await waitFor(() => {
      const updated = screen.getByText(/~Tokens:/);
      expect(updated.textContent).toMatch(/~Tokens:\s*[1-9]/i);
    });
  });

  it("renders error banner when agents fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/agents")) return new Response("", { status: 500 });
        if (url.endsWith("/api/config/provider-status")) {
          return new Response(JSON.stringify({ allowedModels: [] }), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      }) as unknown as typeof fetch,
    );

    render(<HubPage />);
    expect(await screen.findByText(/Failed to load agents/i)).toBeInTheDocument();
  });
});
