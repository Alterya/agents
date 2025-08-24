export type TemplateSnapshot = {
  id: string;
  timestamp: number; // epoch ms
  name: string;
  description?: string;
  template: string;
  variables: string[];
};

const VERSIONS_KEY = "promptbro:versions";

/**
 * Extract unique templating variables of the form {{token}} from a template string.
 * Tokens may include letters, numbers, underscore, and hyphen.
 */
export function extractVariables(template: string): string[] {
  const regex = /\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g;
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(template)) !== null) {
    const token = match[1]?.trim();
    if (token) found.add(token);
  }
  return Array.from(found);
}

/**
 * Build a final prompt by replacing {{token}} with provided values.
 * Unmatched tokens are left intact to make missing variables visible.
 */
export function buildPrompt(template: string, values: Record<string, string | undefined>): string {
  if (!template) return "";
  return template.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (_m, p1: string) => {
    const key = String(p1 ?? "").trim();
    const val = values[key];
    return typeof val === "string" && val.length > 0 ? val : `{{${key}}}`;
  });
}

function readVersions(): TemplateSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(VERSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TemplateSnapshot[];
    if (!Array.isArray(parsed)) return [];
    // Basic schema guard
    return parsed.filter(
      (v) =>
        v &&
        typeof v.id === "string" &&
        typeof v.timestamp === "number" &&
        typeof v.name === "string" &&
        typeof v.template === "string" &&
        Array.isArray(v.variables),
    );
  } catch {
    return [];
  }
}

function writeVersions(items: TemplateSnapshot[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VERSIONS_KEY, JSON.stringify(items));
  } catch {
    // ignore quota errors
  }
}

/**
 * Save a version snapshot (keeps up to maxCount most-recent entries).
 */
export function saveVersion(
  input: Omit<TemplateSnapshot, "id" | "timestamp">,
  opts: { maxCount?: number } = {},
): TemplateSnapshot {
  const maxCount = Math.max(1, opts.maxCount ?? 10);
  const snapshot: TemplateSnapshot = {
    id: (globalThis.crypto?.randomUUID?.() ??
      `v_${Date.now()}_${Math.random().toString(36).slice(2)}`) as string,
    timestamp: Date.now(),
    name: input.name,
    description: input.description,
    template: input.template,
    variables: [...input.variables],
  };
  const existing = readVersions();
  const next = [snapshot, ...existing].slice(0, maxCount);
  writeVersions(next);
  return snapshot;
}

export function listVersions(): TemplateSnapshot[] {
  return readVersions().sort((a, b) => b.timestamp - a.timestamp);
}

export function getVersion(id: string): TemplateSnapshot | undefined {
  return readVersions().find((v) => v.id === id);
}

export function removeVersion(id: string) {
  const next = readVersions().filter((v) => v.id !== id);
  writeVersions(next);
}

/**
 * Produce a minimal JSON export for the current prompt template.
 */
export function exportTemplateJson(input: {
  name: string;
  template: string;
  variables: string[];
}): string {
  return JSON.stringify(
    {
      name: input.name,
      template: input.template,
      variables: input.variables,
      exportedAt: new Date().toISOString(),
      version: 1,
    },
    null,
    2,
  );
}

export type DraftIssue = {
  id: string;
  severity: "low" | "medium" | "high";
  message: string;
  hint?: string;
};

export function analyzeDraft(template: string): { issues: DraftIssue[]; score: number } {
  const issues: DraftIssue[] = [];
  const vars = extractVariables(template);
  // Heuristics
  if (template.length > 20000) {
    issues.push({
      id: "size",
      severity: "high",
      message: "Template exceeds size limits",
      hint: "Reduce length below 20k characters.",
    });
  }
  // Ambiguity checks
  const lc = template.toLowerCase();
  if (!lc.includes("audience") && !lc.includes("user")) {
    issues.push({
      id: "audience",
      severity: "medium",
      message: "Audience not specified",
      hint: "Mention who the output is for (e.g., developer, end-user).",
    });
  }
  if (!lc.includes("success") && !lc.includes("criteria")) {
    issues.push({
      id: "success",
      severity: "medium",
      message: "Missing success criteria",
      hint: "Define what a good answer looks like.",
    });
  }
  if (!lc.includes("format") && !lc.includes("json") && !lc.includes("markdown")) {
    issues.push({
      id: "format",
      severity: "low",
      message: "Output format not specified",
      hint: "Ask for JSON, Markdown, or a specific structure.",
    });
  }
  // Injection pattern guard
  if (/ignore\s+previous|system:|jailbreak/i.test(template)) {
    issues.push({
      id: "injection",
      severity: "high",
      message: "Potential prompt injection markers detected",
      hint: "Remove instructions that subvert prior rules.",
    });
  }
  // Variable coverage note
  if (vars.length > 0) {
    issues.push({
      id: "variables",
      severity: "low",
      message: `Detected variables: ${vars.join(", ")}`,
      hint: "Ensure these are provided before running.",
    });
  }
  // Score: start at 100, subtract per issue by severity
  let score = 100;
  for (const i of issues) {
    if (i.severity === "high") score -= 30;
    else if (i.severity === "medium") score -= 15;
    else score -= 5;
  }
  score = Math.max(0, Math.min(100, score));
  return { issues, score };
}
