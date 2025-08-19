"use client";
import { useEffect, useState } from "react";
import { KeyStatusBanner } from "@/components/KeyStatusBanner";
import { ProviderModelSelector } from "@/components/ProviderModelSelector";

type Msg = { role: "system" | "user" | "assistant" | "tool"; content: string };

export default function PromptBroPage() {
  const [provider, setProvider] = useState<"openai" | "openrouter">("openai");
  const [model, setModel] = useState("gpt-4o");
  const [input, setInput] = useState("");
  const [assistant, setAssistant] = useState<string>("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState(
    "### INSTRUCTION\n<write here>\n\n### CONTEXT\n<write here>\n\n### OUTPUT\n<write here>",
  );
  const [variables, setVariables] = useState<string>("");
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/prompt-templates");
      if (res.ok) {
        const json = await res.json();
        setTemplates(json.templates || []);
      }
    })();
  }, []);

  const askAssist = async () => {
    setAssistant("");
    const messages: Msg[] = [
      { role: "system", content: "You help refine prompts by asking clarifying questions." },
      { role: "user", content: input },
    ];
    const res = await fetch("/api/llm/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider, model, messages }),
    });
    const json = await res.json();
    setAssistant(json.text || "");
  };

  const saveTemplate = async () => {
    const vars = variables
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await fetch("/api/prompt-templates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, description, template, variables: vars }),
    });
    if (res.ok) {
      const next = await (await fetch("/api/prompt-templates")).json();
      setTemplates(next.templates || []);
    }
  };

  return (
    <main className="space-y-4 p-6">
      <h1 className="text-xl font-semibold">PromptBro</h1>
      <KeyStatusBanner />
      <div className="space-y-2">
        <ProviderModelSelector
          provider={provider}
          model={model}
          onChange={(next) => {
            setProvider(next.provider);
            setModel(next.model);
          }}
        />
      </div>
      <section className="space-y-2">
        <h2 className="text-lg font-medium">Describe your task</h2>
        <textarea
          className="w-full border p-2"
          rows={4}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="border px-3 py-1" onClick={askAssist}>
          Ask clarifying question
        </button>
        <pre className="min-h-24 whitespace-pre-wrap break-words border p-2">{assistant}</pre>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-medium">Draft Template</h2>
        <div className="space-x-2">
          <label>
            Name
            <input
              className="ml-2 border p-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Description
            <input
              className="ml-2 border p-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
        </div>
        <label className="block">
          Variables (comma-separated)
          <input
            className="ml-2 border p-1"
            value={variables}
            onChange={(e) => setVariables(e.target.value)}
          />
        </label>
        <textarea
          className="w-full border p-2"
          rows={10}
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
        />
        <button className="border px-3 py-1" onClick={saveTemplate}>
          Save template
        </button>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-medium">Saved Templates</h2>
        <ul className="list-disc pl-6">
          {templates.map((t) => (
            <li key={t.id}>
              <span className="font-medium">{t.name}</span> — {t.description || ""}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
