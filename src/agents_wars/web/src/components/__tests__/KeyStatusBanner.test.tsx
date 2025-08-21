import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { KeyStatusBanner } from "@/components/KeyStatusBanner";

describe("KeyStatusBanner", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch as any;
    vi.restoreAllMocks();
  });

  it("renders nothing when both providers are configured", async () => {
    const payload = {
      openaiConfigured: true,
      openrouterConfigured: true,
      allowedModels: ["gpt-4o"],
      rateLimitEnabled: false,
      rateLimitRpm: 0,
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    } as any);

    render(<KeyStatusBanner />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.queryByText(/Missing provider configuration/i)).toBeNull();
  });

  it("shows error message when status fetch fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false } as any);

    render(<KeyStatusBanner />);

    // Error banner text
    const error = await screen.findByText(/Unable to load provider status/i);
    expect(error).toBeInTheDocument();
  });

  it("shows missing providers when one or both are not configured", async () => {
    const payload = {
      openaiConfigured: false,
      openrouterConfigured: true,
      allowedModels: [],
      rateLimitEnabled: false,
      rateLimitRpm: 0,
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    } as any);

    render(<KeyStatusBanner />);

    const banner = await screen.findByText(/Missing provider configuration/i);
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent("OpenAI");
    expect(banner).not.toHaveTextContent("OpenRouter");
  });
});
