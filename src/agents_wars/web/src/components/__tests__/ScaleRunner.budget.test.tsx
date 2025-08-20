import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ScaleRunner from "@/components/features/scale/ScaleRunner";

describe("ScaleRunner budget card", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Make pricing deterministic
    vi.mock("@/lib/pricing", async (orig) => {
      const mod = await orig();
      return {
        ...mod,
        getPricing: async () => ({ inputPer1k: 0.002, outputPer1k: 0.006 }),
      };
    });
  });

  it("disables Start when estimated cost exceeds max budget and shows warning", async () => {
    render(<ScaleRunner agents={[{ id: "a1", name: "Agent One" }]} />);

    // Choose model
    const modelInput = await screen.findByTestId("pms-model-input");
    fireEvent.change(modelInput, { target: { value: "gpt-4o" } });

    // Runs=10 to increase estimate
    const runs = screen.getByLabelText(/Runs/i) as HTMLInputElement;
    fireEvent.change(runs, { target: { value: "10" } });

    // Wait for estimate to compute
    await waitFor(() => expect(screen.getByText(/Estimated/i)).toBeInTheDocument());

    // Set a low max budget to trigger disable
    const max = screen.getByLabelText(/Max budget USD/i) as HTMLInputElement;
    fireEvent.change(max, { target: { value: "0.0001" } });

    const start = screen.getByRole("button", { name: /start batch/i });
    await waitFor(() => {
      expect(screen.getByText(/Estimated cost exceeds max budget/i)).toBeInTheDocument();
      expect(start).toBeDisabled();
    });
  });
});



