"use client";
import { useState } from "react";

type Msg = { role: "system" | "user" | "assistant" | "tool"; content: string };

export default function LlmDebugPage() {
  const [provider, setProvider] = useState<"openai" | "openrouter">("openai");
  const [model, setModel] = useState("gpt-4o");
  const [text, setText] = useState("Hello");
  const [result, setResult] = useState<string>("");
  const [stream, setStream] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult("");
    const messages: Msg[] = [{ role: "user", content: text }];
    if (stream) {
      const res = await fetch("/api/llm/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, model, messages, stream: true }),
      });
      if (!res.body) {
        setResult("No stream body");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setResult((r) => r + chunk);
      }
      return;
    }
    const res = await fetch("/api/llm/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider, model, messages }),
    });
    const json = await res.json();
    setResult(JSON.stringify(json, null, 2));
  };

  return (
    <main className="space-y-4 p-6">
      <h1 className="text-xl font-semibold">LLM Debug</h1>
      <form onSubmit={onSubmit} className="space-y-2">
        <div className="space-x-2">
          <label>
            Provider
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as any)}
              className="ml-2 border p-1"
            >
              <option value="openai">openai</option>
              <option value="openrouter">openrouter</option>
            </select>
          </label>
        </div>
        <div>
          <label>
            Model
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="ml-2 border p-1"
            />
          </label>
        </div>
        <div>
          <label>
            Prompt
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="ml-2 w-80 border p-1"
            />
          </label>
        </div>
        <div>
          <label className="space-x-2">
            <input type="checkbox" checked={stream} onChange={(e) => setStream(e.target.checked)} />
            <span>Stream</span>
          </label>
        </div>
        <button type="submit" className="border px-3 py-1">
          Send
        </button>
      </form>
      <pre className="min-h-24 whitespace-pre-wrap break-words border p-2">{result}</pre>
    </main>
  );
}
