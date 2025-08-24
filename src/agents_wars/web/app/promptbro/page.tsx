"use client";
import { useEffect, useState } from "react";
import { KeyStatusBanner } from "@/components/KeyStatusBanner";
import { ProviderModelSelector } from "@/components/ProviderModelSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  buildPrompt,
  extractVariables,
  saveVersion,
  listVersions,
  getVersion,
  removeVersion,
  exportTemplateJson,
  analyzeDraft,
} from "@/lib/prompt";
import type { TemplateSnapshot } from "@/lib/prompt";

const DRAFT_KEY = "promptbro:lastDraft";

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
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [versions, setVersions] = useState<TemplateSnapshot[]>([]);
  const [saveHint, setSaveHint] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [toast, setToast] = useState<string>("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/prompt-templates");
      if (res.ok) {
        const json = await res.json();
        setTemplates(json.templates || []);
      }
    })();
    setVersions(listVersions());
    // Load last draft
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          typeof parsed === "object" &&
          typeof parsed.name === "string" &&
          typeof parsed.description === "string" &&
          typeof parsed.template === "string" &&
          (!parsed.varValues || typeof parsed.varValues === "object")
        ) {
          setName(parsed.name);
          setDescription(parsed.description);
          setTemplate(parsed.template);
          if (parsed.varValues && typeof parsed.varValues === "object")
            setVarValues(parsed.varValues as Record<string, string>);
        }
      }
    } catch {
      // ignore corrupt drafts
    }
  }, []);

  // Derive variable names from template and keep the display string in sync
  useEffect(() => {
    const names = extractVariables(template);
    setVariables(names.join(", "));
    // ensure varValues has keys for all variables
    setVarValues((prev) => {
      const next: Record<string, string> = { ...prev };
      for (const k of names) if (!(k in next)) next[k] = "";
      // prune removed keys
      for (const k of Object.keys(next)) if (!names.includes(k)) delete next[k];
      return next;
    });
  }, [template]);

  // Debounced autosave of draft
  useEffect(() => {
    const handle = setTimeout(() => {
      try {
        const payload = { name, description, template, varValues };
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
        setSaveHint(`Autosaved at ${new Date().toLocaleTimeString(undefined, { hour12: false })}`);
      } catch {
        // ignore quota errors
      }
    }, 500);
    return () => clearTimeout(handle);
  }, [name, description, template, varValues]);

  const askAssist = async () => {
    setAssistant("");
    setErrorMsg("");
    const messages: Msg[] = [
      { role: "system", content: "You help refine prompts by asking clarifying questions." },
      { role: "user", content: input },
    ];
    const res = await fetch("/api/llm/chat", {
      method: "POST",
      headers: { "content-type": "application/json", "x-assist": "promptbro" },
      body: JSON.stringify({ provider, model, messages, maxTokens: 128, temperature: 0.2 }),
    });
    if (!res.ok) {
      setErrorMsg(
        res.status === 429
          ? "Assist rate limited. Try again shortly."
          : "Assist failed. Please try again.",
      );
      return;
    }
    const json = await res.json();
    setAssistant(json.text || "");
  };

  const saveTemplate = async () => {
    setErrorMsg("");
    const vars = extractVariables(template);
    const res = await fetch("/api/prompt-templates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, description, template, variables: vars }),
    });
    if (res.ok) {
      const next = await (await fetch("/api/prompt-templates")).json();
      setTemplates(next.templates || []);
    } else {
      setErrorMsg(
        res.status === 429
          ? "Save rate limited. Try again later."
          : "Save failed. Check inputs and try again.",
      );
    }
  };

  const assembled = buildPrompt(template, varValues);
  const missingVars = extractVariables(template).filter((k) => !(varValues[k] ?? "").trim());

  const onSaveVersion = () => {
    const snap = saveVersion({
      name: name || "unnamed",
      description,
      template,
      variables: extractVariables(template),
    });
    setVersions((prev) => [snap, ...prev]);
    setToast("Version saved");
    setTimeout(() => setToast(""), 1500);
  };

  const onRestoreVersion = (id: string) => {
    const v = getVersion(id);
    if (!v) return;
    setName(v.name);
    setDescription(v.description || "");
    setTemplate(v.template);
  };

  const onDeleteVersion = (id: string) => {
    removeVersion(id);
    setVersions((prev) => prev.filter((v) => v.id !== id));
  };

  const onCopyAssembled = async () => {
    try {
      await navigator.clipboard.writeText(assembled);
      setToast("Assembled prompt copied");
      setTimeout(() => setToast(""), 1500);
    } catch {
      // ignore
    }
  };

  const onExportJson = async () => {
    const json = exportTemplateJson({
      name: name || "unnamed",
      template,
      variables: extractVariables(template),
    });
    try {
      await navigator.clipboard.writeText(json);
      setToast("Template JSON copied");
      setTimeout(() => setToast(""), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <main className="space-y-4 p-6" style={{ backgroundColor: "#ECEADF" }}>
      <h1 className="text-xl font-semibold" style={{ color: "#3F404C" }}>PromptBro</h1>
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
      <section
        className="space-y-2 rounded-[12px]"
        style={{ background: "#fff", border: "1px solid #DFD4CA", padding: "24px", boxShadow: "0 1px 3px rgba(63,64,76,0.1), 0 1px 2px rgba(63,64,76,0.06)" }}
      >
        <h2 className="text-lg font-medium">Describe your task</h2>
        {errorMsg && (
          <div
            role="alert"
            className="rounded border border-red-600 bg-red-950/40 p-2 text-sm text-red-300"
          >
            {errorMsg}
          </div>
        )}
        {toast && (
          <div
            role="status"
            className="rounded border border-emerald-600 bg-emerald-950/40 p-2 text-sm text-emerald-300"
          >
            {toast}
          </div>
        )}
        <Textarea
          className="border"
          rows={4}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Describe your task"
        />
        <Button className="border" variant="secondary" onClick={askAssist}>
          Ask clarifying question
        </Button>
        <pre className="min-h-24 whitespace-pre-wrap break-words border p-2">{assistant}</pre>
      </section>
      <section
        className="space-y-2 rounded-[12px]"
        style={{ background: "#fff", border: "1px solid #DFD4CA", padding: "24px", boxShadow: "0 1px 3px rgba(63,64,76,0.1), 0 1px 2px rgba(63,64,76,0.06)" }}
      >
        <h2 className="text-lg font-medium">Draft Template</h2>
        <div className="space-x-2">
          <label>
            Name
            <Input
              className="ml-2 border"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Description
            <Input
              className="ml-2 border"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
        </div>
        <div className="space-y-1">
          <div className="text-sm text-gray-600">Derived variables</div>
          <div className="flex flex-wrap gap-2">
            {Object.keys(varValues).length === 0 && (
              <span className="text-sm text-gray-500">No variables detected</span>
            )}
            {Object.entries(varValues).map(([k, v]: [string, string]) => (
              <label key={k} className="text-sm">
                <span className="mr-1 font-medium">{`{{${k}}}`}:</span>
                <Input
                  className="border"
                  placeholder={`value for ${k}`}
                  value={v}
                  onChange={(e) => setVarValues((prev) => ({ ...prev, [k]: e.target.value }))}
                />
              </label>
            ))}
          </div>
        </div>
        <Textarea
          className="w-full border"
          rows={10}
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          aria-label="Draft Template"
        />
        <Button className="border" variant="secondary" onClick={saveTemplate}>
          Save template
        </Button>
        {missingVars.length > 0 && (
          <div className="text-sm text-red-600">{`Missing values for: ${missingVars.join(", ")}`}</div>
        )}
        {saveHint && <div className="text-xs text-gray-500">{saveHint}</div>}
        <div className="space-x-2">
          <Button className="border" variant="secondary" onClick={onSaveVersion}>
            Save version
          </Button>
          <Button className="border" variant="secondary" onClick={onCopyAssembled}>
            Copy assembled
          </Button>
          <Button className="border" variant="secondary" onClick={onExportJson}>
            Export JSON
          </Button>
          <Button
            className="border"
            variant="secondary"
            onClick={() => {
              setName("");
              setDescription("");
              setTemplate(
                "### INSTRUCTION\n<write here>\n\n### CONTEXT\n<write here>\n\n### OUTPUT\n<write here>",
              );
              setVarValues({});
              try {
                window.localStorage.removeItem(DRAFT_KEY);
              } catch {
                // ignore
              }
            }}
          >
            Reset draft
          </Button>
        </div>
        <div>
          <h3 className="mt-2 text-base font-medium">Assembled Preview</h3>
          <pre className="min-h-24 whitespace-pre-wrap break-words border p-2">{assembled}</pre>
        </div>
      </section>
      <section
        className="space-y-2 rounded-[12px]"
        style={{ background: "#fff", border: "1px solid #DFD4CA", padding: "24px", boxShadow: "0 1px 3px rgba(63,64,76,0.1), 0 1px 2px rgba(63,64,76,0.06)" }}
      >
        <h2 className="text-lg font-medium">Versions</h2>
        <ul className="list-disc pl-6">
          {versions.length === 0 && <li className="text-sm text-gray-500">No versions saved</li>}
          {versions.map((v) => (
            <li key={v.id} className="flex items-center gap-2">
              <span className="font-medium">{v.name}</span>
              <span className="text-xs text-gray-500">
                {new Date(v.timestamp).toLocaleString()}
              </span>
              <Button className="border" size="sm" variant="secondary" onClick={() => onRestoreVersion(v.id)}>
                Restore
              </Button>
              <Button className="border" size="sm" variant="secondary" onClick={() => onDeleteVersion(v.id)}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
      </section>
      <section
        className="space-y-2 rounded-[12px]"
        style={{ background: "#fff", border: "1px solid #DFD4CA", padding: "24px", boxShadow: "0 1px 3px rgba(63,64,76,0.1), 0 1px 2px rgba(63,64,76,0.06)" }}
      >
        <h2 className="text-lg font-medium">Quick Checks</h2>
        <Button
          className="border"
          variant="secondary"
          onClick={() => {
            const res = analyzeDraft(template);
            if (res.issues.some((i) => i.severity === "high")) {
              setToast(`Checks: ${res.issues.length} issues, score ${res.score}/100`);
            } else {
              setToast(`Checks passed with score ${res.score}/100`);
            }
            setTimeout(() => setToast(""), 2000);
          }}
        >
          Run Quick Checks
        </Button>
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
