import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ScaleRunner from "@/components/features/scale/ScaleRunner";

describe("ScaleRunner invalid agent handling", () => {
  afterEach(() => {
    try { vi.unstubAllGlobals(); } catch {}
    vi.restoreAllMocks();
  });

  it("shows friendly error message when backend returns invalid_agent", async () => {
    // Stub fetch: POST /api/scale/start returns 400 invalid_agent
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/api/scale/start") && init?.method === "POST") {
          return new Response(JSON.stringify({ error: "invalid_agent" }), { status: 400, headers: { "content-type": "application/json" } });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      }) as unknown as typeof fetch,
    );

    render(<ScaleRunner agents={[{ id: "no-such-agent", name: "Ghost" }]} />);

    // Set model via hidden input and runs valid
    const modelInput = await screen.findByTestId("pms-model-input");
    fireEvent.change(modelInput, { target: { value: "gpt-4o" } });
    const runsInput = screen.getByLabelText(/runs/i) as HTMLInputElement;
    fireEvent.change(runsInput, { target: { value: "1" } });

    const startBtn = screen.getByRole("button", { name: /start batch/i });
    expect(startBtn).toBeEnabled();
    fireEvent.click(startBtn);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Selected agent is invalid or not found/i);
  });
});



