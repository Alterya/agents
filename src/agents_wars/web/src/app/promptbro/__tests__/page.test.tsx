import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PromptBroPage from "app/promptbro/page";

describe("PromptBroPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/api/prompt-templates") && (!init || init.method === "GET")) {
          return new Response(
            JSON.stringify({ templates: [{ id: "t1", name: "Base", description: "desc" }] }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        if (url.endsWith("/api/prompt-templates") && init?.method === "POST") {
          return new Response(JSON.stringify({ template: { id: "t2", name: "Saved" } }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        if (url.endsWith("/api/llm/chat")) {
          return new Response(JSON.stringify({ text: "What is your goal?" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      }) as unknown as typeof fetch,
    );
  });

  it("loads templates and displays them", async () => {
    render(<PromptBroPage />);
    await screen.findByText("PromptBro");
    expect(await screen.findByText(/Base/)).toBeInTheDocument();
  });

  it("derives variables and assembles preview", async () => {
    render(<PromptBroPage />);
    const template = await screen.findByRole("textbox", { name: /draft template/i });
    fireEvent.change(template, { target: { value: "Hello {{name}}" } });
    const varInput = await screen.findByPlaceholderText(/value for name/i);
    fireEvent.change(varInput, { target: { value: "Ada" } });
    expect(screen.getByText(/Assembled Preview/)).toBeInTheDocument();
    expect(screen.getByText(/Hello Ada/)).toBeInTheDocument();
  });

  it("asks assist and shows response", async () => {
    render(<PromptBroPage />);
    const describeBox = await screen.findByRole("textbox", { name: /describe your task/i });
    fireEvent.change(describeBox, { target: { value: "Find user needs" } });
    fireEvent.click(screen.getByRole("button", { name: /Ask clarifying question/i }));
    await screen.findByText(/What is your goal\?/);
  });

  it("saves template and refreshes list", async () => {
    render(<PromptBroPage />);
    const nameInput = await screen.findByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: "My Template" } });
    const template = await screen.findByRole("textbox", { name: /draft template/i });
    fireEvent.change(template, { target: { value: "Task: {{goal}}" } });
    fireEvent.click(screen.getByRole("button", { name: /Save template/i }));
    await waitFor(() => expect((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.some((c: any[]) => String(c[0]).endsWith("/api/prompt-templates") && c[1]?.method === "POST")).toBe(true));
  });

  it("runs quick checks and shows toast", async () => {
    render(<PromptBroPage />);
    fireEvent.click(await screen.findByRole("button", { name: /Run Quick Checks/i }));
    // Either of success or issues toast should appear
    await screen.findByRole("status");
  });
});


