import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LlmDebugPage from "../../../../../app/debug/llm/page";
import { vi } from "vitest";

function createSSEStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) {
        controller.enqueue(encoder.encode(c));
      }
      controller.close();
    },
  });
}

describe("LlmDebugPage", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch as any;
    vi.restoreAllMocks();
  });

  it("submits non-streaming request and renders JSON response", async () => {
    const json = { text: "ok", usage: { inputTokens: 1, outputTokens: 2 } };
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => json,
      headers: new Headers({ "content-type": "application/json" }),
    } as any);

    render(<LlmDebugPage />);
    const model = screen.getByLabelText(/model/i);
    const prompt = screen.getByLabelText(/prompt/i);
    const send = screen.getByRole("button", { name: /send/i });

    await userEvent.clear(model);
    await userEvent.type(model, "gpt-4o");
    await userEvent.clear(prompt);
    await userEvent.type(prompt, "Hello");
    await userEvent.click(send);

    const pre = await screen.findByText((content) => content.includes('"text": "ok"'));
    expect(pre).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith("/api/llm/chat", expect.any(Object));
  });

  it("streams SSE and appends chunks when Stream is enabled", async () => {
    const stream = createSSEStream([
      'data: {"delta":"Hel"}\n\n',
      'data: {"delta":"lo"}\n\n',
      "data: [DONE]\n\n",
    ]);

    global.fetch = vi.fn().mockResolvedValue({
      body: stream,
      headers: new Headers({ "content-type": "text/event-stream" }),
    } as any);

    render(<LlmDebugPage />);
    const streamToggle = screen.getByRole("checkbox", { name: /stream/i });
    const send = screen.getByRole("button", { name: /send/i });

    await userEvent.click(streamToggle);
    await userEvent.click(send);

    // Accumulated content should include the SSE chunks
    await screen.findByText((t) => t.includes('data: {"delta":"Hel"}'));
    expect(screen.getByText((t) => t.includes('data: {"delta":"lo"}'))).toBeInTheDocument();
    expect(screen.getByText((t) => t.includes("data: [DONE]"))).toBeInTheDocument();
  });
});
