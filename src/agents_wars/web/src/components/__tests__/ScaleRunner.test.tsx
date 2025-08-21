import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ScaleRunner from "@/components/features/scale/ScaleRunner";

describe("ScaleRunner", () => {
  it("disables submit by default until model set and toggles with runs", async () => {
    render(<ScaleRunner agents={[{ id: "a1", name: "Agent One" }]} />);
    const button = screen.getByRole("button", { name: /start batch/i });
    expect(button).toBeDisabled();

    // Set runs invalid first
    const runsInput = screen.getByLabelText(/runs/i) as HTMLInputElement;
    fireEvent.change(runsInput, { target: { value: "0" } });
    expect(button).toBeDisabled();

    // Now set model via ProviderModelSelector input/select
    const modelSelect = screen.queryByTestId("pms-model");
    if (modelSelect) {
      fireEvent.change(modelSelect, { target: { value: "gpt-4o" } });
    } else {
      const modelInput = screen.getByTestId("pms-model-input");
      fireEvent.change(modelInput, { target: { value: "gpt-4o" } });
    }

    fireEvent.change(runsInput, { target: { value: "2" } });
    expect(button).not.toBeDisabled();
  });
});
