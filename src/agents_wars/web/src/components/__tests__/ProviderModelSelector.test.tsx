import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ProviderModelSelector } from "@/components/ProviderModelSelector";

describe("ProviderModelSelector", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch as any;
    vi.restoreAllMocks();
  });

  it("renders text input for model when no allowedModels returned", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false } as any);

    const handleChange = vi.fn();
    render(
      <ProviderModelSelector provider="openai" model="gpt-4o" onChange={handleChange} />
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    const modelInput = screen.getByLabelText(/model/i) as HTMLInputElement;
    expect(modelInput).toBeInTheDocument();
    await userEvent.clear(modelInput);
    await userEvent.type(modelInput, "gpt-4o-mini");
    await waitFor(() => expect(handleChange).toHaveBeenCalled());
  });

  it("renders select with allowedModels and updates on selection", async () => {
    const payload = {
      openaiConfigured: true,
      openrouterConfigured: true,
      allowedModels: ["gpt-4o", "gpt-4o-mini"],
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    } as any);

    const handleChange = vi.fn();
    render(
      <ProviderModelSelector provider="openai" model="gpt-4o" onChange={handleChange} />
    );

    // Wait for select (combobox role) to appear after fetch resolves
    const modelSelect = await screen.findByRole("combobox", { name: /model/i });
    await userEvent.selectOptions(modelSelect, "gpt-4o-mini");
    expect(handleChange).toHaveBeenLastCalledWith({ provider: "openai", model: "gpt-4o-mini" });
  });

  it("allows switching provider via select", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false } as any);

    const handleChange = vi.fn();
    render(
      <ProviderModelSelector provider="openai" model="gpt-4o" onChange={handleChange} />
    );

    const providerSelect = screen.getByLabelText(/provider/i);
    await userEvent.selectOptions(providerSelect, "openrouter");
    expect(handleChange).toHaveBeenLastCalledWith({ provider: "openrouter", model: "gpt-4o" });
  });
});


