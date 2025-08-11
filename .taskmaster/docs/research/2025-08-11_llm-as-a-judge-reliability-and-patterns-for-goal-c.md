---
title: Research Session
query: "LLM-as-a-judge reliability and patterns for goal completion detection; structured judge prompts, calibration, and fallback heuristics (2024-2025)."
date: 8/11/2025
time: 6:34:01 PM
timestamp: 2025-08-11T15:34:01.315Z
exchanges: 1
---

# Research Session

## Initial Query

**Question:** LLM-as-a-judge reliability and patterns for goal completion detection; structured judge prompts, calibration, and fallback heuristics (2024-2025).

**Response:**

Overview and recommendations
Reliable goal-completion detection is critical for your Agent Wars Hub (Task 5) and Scale Testing (Task 6). In 2024–2025, “LLM-as-a-judge” has matured but still exhibits known issues: susceptibility to superficial cues, positional and verbosity bias, and overconfidence. The strongest patterns that improve reliability combine: (1) structured, checklist-style judge prompts with explicit evidence requirements; (2) cascading pipelines that try deterministic or domain validators first; (3) calibrated thresholds based on human-labeled runs; (4) ensembles and cross-checks; and (5) conservative “abstain” defaults with fallback heuristics and caps.

Below is a practical, project-ready blueprint that fits your current architecture and tasks. It includes structured judge prompts, how to calibrate, how to implement fallbacks, concrete TypeScript snippets that align with your planned provider layer (Task 2) and DB schema (Task 1), and integration points for Agent Wars Hub (Task 5), Scale Testing (Task 6), and PromptBro (Task 7).

LLM-as-a-judge: reliability landscape and what works in practice
- Biases and pitfalls:
  - Brand/identity bias: Judges rate outputs differently if they know the model/provider. Hide identity in judge prompts.
  - Verbosity/fluency bias: Longer, confident-sounding answers win. Force judges to justify using direct quotes/snippets (“point to evidence”).
  - Order bias: Last message and order of candidates influence judgments. Use a consistent, blind comparison or evaluate against a checklist rather than “A vs B.”
  - Overconfidence and hallucinated evidence: Judges “find” satisfied constraints not supported by the conversation. Require verbatim evidence quoting with indices and refuse to mark complete if missing evidence.
  - Incentive mismatch: If agents optimize for the judge, they might learn superficial patterns. Randomize goal phrasing for the judge and require evidence extracted from the conversation content, not meta-signals like “Final answer.”

- What works:
  - Structured, schema-constrained outputs with explicit “abstain/unknown.”
  - Checklist-first judging: Convert goals to objective checklists then ask the judge to assess each item with quoted evidence.
  - Evidence-only instructions: “Use only content from conversation; if missing, mark unsatisfied.”
  - Two-stage or ensemble judges: cheap fast judge every turn, strong judge for stopping condition confirmation.
  - Deterministic pre-checks: regex/JSON schema validation, compilation, unit tests, HTTP status checks, etc., before calling a judge.
  - Calibration: Select thresholds using labeled conversations; measure precision/recall for “complete” vs “incomplete.”

A judge pipeline architecture for your project
- Stage 0: Programmatic validators (deterministic checks)
  - Examples: JSON schema validation of tool outputs, regex for required phrases, executing unit tests against generated code, verifying URL returns expected status or string, running SQL against a sandbox DB and verifying results shape.
  - If a hard-pass validator succeeds, you can mark complete with high confidence immediately. If a hard-fail validator detects missing mandatory artifact, mark “not complete” with high confidence and skip the LLM judge.

- Stage 1: Fast LLM judge (per turn or every N turns)
  - Use a small, cost-effective model (e.g., GPT-4o-mini or comparable through OpenRouter) with a strict JSON schema and evidence requirements.
  - This judge can produce: status in {complete, partial, not_yet, refuse, unknown}, confidence ∈ [0,1], list of satisfied/unsatisfied criteria, quoted evidence with message indices.

- Stage 2: Strong LLM judge (confirmation for stopping)
  - Escalate only when the fast judge says “complete” with confidence ≥ T1 or when approaching the cap (e.g., at turns 10, 20, or at 25).
  - Use a stronger reasoning model (e.g., o3-mini or Claude 3.5 Sonnet via OpenRouter) with the same schema and stricter evidence demands.
  - Require either: (a) one strong “complete” at high confidence OR (b) two consecutive “complete” results across steps with medium-high confidence.

- Stage 3: Fallback heuristics
  - Time-based caps and plateau detection (no new evidence for K turns).
  - If the agent claims “final answer” but evidence is missing, force a “not_yet” and possibly inject a “missing requirements” reminder (if your orchestration allows).
  - If conflicting judge results occur, default to “not complete” unless deterministic validators pass.

- Stage 4: Human-in-the-loop (optional)
  - For Scale testing, sample a subset for human audit to improve calibration curves and thresholds.

Structured judge prompt template and JSON schema
Use the same schema across fast and strong judges. Prefer model-native schema constraints when available (OpenAI response_format json_schema or tool/function calls). Otherwise, enforce robust JSON parsing.

Judgment JSON schema (TypeScript and JSON)
type JudgeStatus = 'complete' | 'partial' | 'not_yet' | 'refusal' | 'unknown';

type CriterionAssessment = {
  id: string;              // Stable ID (e.g., 'C1')
  name: string;            // Human-readable
  satisfied: boolean;      
  evidence: { 
    messageIndex: number;  // Index in conversation array
    quote: string;         // Verbatim snippet
  }[];                     // Empty if no evidence
  notes?: string;
};

type JudgeDecision = {
  status: JudgeStatus;
  confidence: number;     // 0..1
  criteria: CriterionAssessment[];
  missingRequirements?: string[];  // Derived from unsatisfied criteria
  evidenceSummary?: string; // 1–3 sentences
  caveats?: string[];
  judgeVersion: string;    // e.g., 'v1.1'
};

Example judge system prompt
System:
You are a strict task-completion judge for multi-turn conversations. Your job is to determine whether the user’s goal has been achieved based only on the conversation content. Do not infer unstated facts. If evidence is missing, mark unsatisfied. Quote exact snippets and specify message indices. If unsure, output status 'unknown' with low confidence, never guess.

User:
Goal (natural language):
{goal_text}

Derived criteria (JSON):
{criteria_json}  // A checklist derived from the goal, see below

Conversation:
- Message[0] role=system: {…}
- Message[1] role=user: {…}
- Message[2] role=assistant: {…}
...
Only judge based on the conversation text above. Return a JSON object strictly following this schema:
{json_schema_text_or_tool_signature}

Notes:
- If the assistant refused or the goal is unsafe/out of scope, use status 'refusal'.
- Use 'partial' if some criteria are satisfied but others are not.
- Use 'not_yet' if progress is made but essential criteria are unsatisfied.
- Use 'complete' only if all essential criteria are satisfied with quoted evidence.
- confidence must reflect your uncertainty in [0,1]. If any essential criterion lacks evidence, status cannot be 'complete'.

Checklist derivation
- Convert goal to explicit criteria. Implement a small helper that either:
  - Uses PromptBro (Task 7) to build evaluation criteria from the goal, or
  - Uses a light LLM call to produce a deterministic list of criteria with stable IDs and types (required vs optional).
- Store criteria with the conversation (DB) so all judges operate on the same list.

Example criteria JSON for a coding task
[
  { "id": "C1", "name": "Returns Python function named 'count_users'", "required": true },
  { "id": "C2", "name": "Handles input list of dicts with key 'id'", "required": true },
  { "id": "C3", "name": "Unit test with sample data passes", "required": true },
  { "id": "C4", "name": "Time complexity O(n)", "required": false }
]

Provider integration (Task 2)
- Extend your provider abstraction to support:
  - Response schemas where available: OpenAI json_schema or function tools. For OpenRouter, prefer tool calls if model supports; else set response_format: 'json_object' and validate.
  - A robust JSON parsing strategy with double delimiters and retry on invalid JSON.
  - Tool/function call signature for “record_judgment” to return the JudgeDecision structure.
- Add standard options in ChatOptions for response_format and tool_choice to support schema-bound outputs. Example:

type JsonSchema = Record<string, any>;
type ChatOptionsExt = ChatOptions & {
  responseFormat?: 
    | { type: 'json_object' } 
    | { type: 'json_schema'; json_schema: JsonSchema };
  tools?: Array<{ type: 'function'; function: { name: string; parameters: JsonSchema } }>;
  toolChoice?: 'auto' | { type: 'function'; function: { name: string } };
};

Deterministic validators library
Create a small validators registry keyed by “goal type” or declared constraints. This unlocks high-precision completion detection without the judge for many tasks.

Examples:
- Text include/format: regexMatches(text, pattern), containsAll(text, [required substrings])
- JSON: validateJsonSchema(outputJson, schema)
- Code: compileAndRun(code, tests), runPyTest, runNodeTests
- SQL: runQueryAndCheckShape(sql, expectedColumns, rowCount>=n)
- URL: fetchAndVerify(url, status=200, includes='Success')
- Math: verifyNumericAnswer(solution, expected, tolerance)
- File artifact: presence of code block between ``` tags for specified language

Each validator returns { pass: boolean, confidence: number, reason: string }. If any “hard-pass” validators succeed, immediately mark complete.

Judge orchestration function (TypeScript)
import { chat } from '@/lib/providers'; // Task 2
import { runValidators } from './validators';
import { buildJudgePrompt } from './prompts/judge';
import { parseDecision } from './parseDecision';

type JudgeModels = { fast: { provider: string; model: string }, strong: { provider: string; model: string }};

export async function judgeGoal(opts: {
  conversation: { messages: { role: 'system'|'user'|'assistant'|'tool', content: string }[] };
  goal: string;
  criteria: { id: string; name: string; required?: boolean }[];
  models: JudgeModels;
  thresholdFast?: number;   // e.g., 0.75
  thresholdStrong?: number; // e.g., 0.85
  forceStrong?: boolean;    // confirm at cap or before stopping
}) {
  // Stage 0: deterministic validators
  const v = await runValidators(opts.conversation, opts.goal, opts.criteria);
  if (v.hardPass) {
    return { status: 'complete', confidence: 0.98, criteria: v.criteriaAssessments, source: 'validators' };
  }
  if (v.hardFail) {
    return { status: 'not_yet', confidence: 0.95, criteria: v.criteriaAssessments, source: 'validators' };
  }

  // Stage 1: fast judge
  const prompt = buildJudgePrompt(opts.goal, opts.criteria, opts.conversation.messages);
  const fastResp = await chat(prompt.messages, {
    provider: opts.models.fast.provider,
    model: opts.models.fast.model,
    maxTokens: 400,
    temperature: 0,
    responseFormat: { type: 'json_object' } // or json_schema
  });
  const fastDecision = parseDecision(fastResp);
  if (!opts.forceStrong && fastDecision.status === 'complete' && fastDecision.confidence >= (opts.thresholdFast ?? 0.75)) {
    return { ...fastDecision, source: 'fast' as const };
  }

  // Stage 2: strong judge (confirmation or cap)
  const strongResp = await chat(prompt.messages, {
    provider: opts.models.strong.provider,
    model: opts.models.strong.model,
    maxTokens: 500,
    temperature: 0,
    responseFormat: { type: 'json_object' }
  });
  const strongDecision = parseDecision(strongResp);
  return { ...strongDecision, source: 'strong' as const };
}

Calibration strategy and thresholds
- Dataset creation:
  - Use Scale Testing (Task 6) to generate conversation batches with diverse goals. Manually label at least 100–300 samples as complete/incomplete/partial/refusal.
  - Include edge cases (near-miss, verbose but wrong, partial completions).

- Calibration runs:
  - Run your judge pipeline on the labeled set and collect:
    - Predicted status
    - Confidence
    - Which stage decided (validators/fast/strong)
  - Compute precision/recall for “complete” vs “not complete” and “partial.” Optimize for high precision on “complete” to avoid premature stopping in Agent Wars.
  - Select thresholds:
    - fast threshold T1 ~ 0.75–0.8 (useful for gating strong confirm)
    - strong threshold T2 ~ 0.85–0.9 for final stop
  - Consider an abstain band: if 0.4 < confidence < T1, default to not_yet and continue.
  - Build per-task or per-goal-type thresholds if performance varies significantly (e.g., coding vs summarization).

- Continuous calibration:
  - After each Scale run, sample 10–20 judgments for human audit; recompute metrics; update thresholds monthly.
  - Track drift: if your agent or prompts change, redo calibration on a fresh sample.

Fallback heuristics for Agent Wars Hub (Task 5)
- Stop conditions:
  - Immediate stop if any hard-pass validator succeeds.
  - Otherwise, stop when:
    - fast says complete ≥ T1 AND strong says complete ≥ T2, OR
    - two consecutive fast completes ≥ 0.85 within last 3 turns, OR
    - hard cap at 25 messages.

- Plateau detection:
  - If last 5 assistant turns repeat patterns (n-gram overlap > 0.8) or no new criteria are flipped to satisfied, increase probing or stop at cap sooner.

- Defensive logic:
  - If the agent claims “final” or “done” without evidence for required criteria, force “not_yet.”
  - If the judge returns conflicting results across turns, prefer “not_yet” unless a validator passes.

- Safety/refusal:
  - If status is 'refusal' with high confidence, mark endedReason='error' or 'manual' depending on policy and stop early.

Database extensions (Task 1)
Augment your schema to store judge artifacts and criteria:

- Conversation:
  - fields: goal (text), goalCriteria (json), goalReached (bool), endedReason (enum), judgeVersion (string), judgeModelFast (string), judgeModelStrong (string)
- Message:
  - Add computed fields optional: satisfiedCriteria (string[]), progressScore (float) for analytics
- New table JudgeDecision:
  - id (cuid)
  - conversationId (FK)
  - messageIndexAtDecision (int)
  - status (enum: 'complete'|'partial'|'not_yet'|'refusal'|'unknown')
  - confidence (float)
  - criteria (json)
  - source (enum: 'validators'|'fast'|'strong')
  - model (string), provider (string)
  - createdAt
- RunReport:
  - Add fields: judgeStats json (precision/recall estimates, threshold used), falsePositive/falseNegative counts (from labeled subset), distribution by source stage

Integration into Task 5 (Hub) and Task 6 (Scale)
- Task 5 Hub orchestration:
  - After each assistant turn, call judgeGoal with fast model.
  - If fastComplete ≥ T1, immediately call strong for confirmation.
  - Persist JudgeDecision with messageIndex and display in UI: status badge, criteria checklist with green/red indicators, and quotes.
  - Stop at goalReached or after 25 messages.

- Task 6 Scale:
  - On each run, persist all JudgeDecisions.
  - When complete, aggregate:
    - % completed, avg turns-to-completion
    - Failure modes: top unsatisfied criteria
    - Draft a “revised system prompt” (use LLM) focusing on unsatisfied criteria patterns.
  - For calibration: randomly sample 10–20% of runs for manual labels; compute metrics and propose new thresholds.

- Task 7 PromptBro:
  - Add a “Derive Evaluation Criteria” step that outputs the criteria JSON and marks which are required vs optional.
  - Save PromptTemplate with embedded criteria to drive deterministic validators and judges.

Judge prompt examples
1) Simple factual question
- Goal: “Provide the capital of France and one supporting source link.”
- Criteria:
  - C1: Capital of France named correctly (“Paris”).
  - C2: Includes at least one URL link.
  - C3: Link is plausible (http/https; domain resolved if validators enabled).
- Deterministic validators:
  - Regex for “Paris” (case-insensitive) and presence of http(s)://
  - Optional: HEAD request to ensure link resolves (non-200 ⇒ not satisfied).

2) SQL task
- Goal: “Write a SQL query to return daily unique user counts from table events(user_id, ts).”
- Criteria:
  - C1: SELECT with COUNT(DISTINCT user_id)
  - C2: GROUP BY day date_trunc/day(ts)
  - C3: FROM events
  - C4: Query runs in test DB and returns non-empty result
- Validators:
  - Parse SQL and check presence patterns.
  - Execute in sandbox with seed data.

3) Code task
- Goal: “Write a Python function add(a,b) and a test that passes for (2,3) => 5.”
- Validators:
  - Extract code block; run ephemeral python process; verify test passes.
- Judge is fallback if code missing.

Ensembles and cross-checking
- Self-consistency: Ask the judge twice with paraphrased criteria or permuted order. If both say “complete” with high confidence, promote to stop.
- Model ensemble: Fast model + different-family confirm (e.g., OpenAI + Anthropic via OpenRouter). Weight votes; require at least one strong confirm for stop.
- Adversarial mitigation: Randomize criteria order and wording slightly for each judgment to reduce pattern exploitation, but keep IDs stable.

Heuristics library (fallbacks)
- Final-answer heuristic: If assistant includes “Final answer:” or “Summary:” block, still require evidence; don’t stop solely on phrasing.
- No-progress heuristic: If the delta of satisfied criteria across last 3 checks is 0 and turns > 15, consider early stop with 'limit' to save tokens.
- Refusal detection: If top-3 refusal patterns detected (e.g., “I cannot assist with that request”), classify 'refusal' and stop.

Cost and performance considerations
- Check cadence: Run fast judge every assistant turn; run strong judge only on fast-complete or at fixed checkpoints (e.g., turns 10, 20, 25).
- Context pruning: Pass only the last K messages plus a running “facts/outputs” summary to the judge to save tokens; ensure evidence can be quoted by including message indices from the unpruned list.
- Caching: For identical goal+criteria+conversation snippets, cache judge decisions (hash-based) to avoid duplicate calls.

Testing and evaluation plan
- Unit tests:
  - Validators: positive/negative cases and edge conditions.
  - Prompt builder: deterministic schema and content.
  - Parser: robust JSON parsing, retry on invalid JSON, schema validation.

- Integration tests:
  - Simulate conversations with known outcomes; verify the judge stops at the right time.
  - Mock provider returning conflicting or malformed judge outputs; ensure fallback to not_yet.

- E2E:
  - Agent Wars Hub with fake provider: run multiple sessions; verify stop conditions and UI displays of criteria evidence.
  - Scale runs: verify RunReport aggregates and revised prompt generation.

- Metrics:
  - Precision of “complete” ≥ 0.95 preferred for stopping.
  - False positive rate under 5% on holdout.
  - Average tokens per run; judge calls count; time-to-stop.

Suggested schema and code additions
1) Prisma additions (pseudo)
model Conversation {
  id             String   @id @default(cuid())
  // ...
  goal           String
  goalCriteria   Json?
  goalReached    Boolean  @default(false)
  endedReason    EndedReason?
  judgeVersion   String?
  judgeModelFast String?
  judgeModelStrong String?
  // ...
}

model JudgeDecision {
  id             String   @id @default(cuid())
  conversationId String
  messageIndex   Int
  status         String   // enum in app layer
  confidence     Float
  criteria       Json
  source         String
  model          String
  provider       String
  createdAt      DateTime @default(now())
  Conversation   Conversation @relation(fields: [conversationId], references: [id])
}

2) Provider layer (Task 2)
- Add responseFormat, tools, toolChoice options.
- Add a jsonSafeParse helper with retry and guardrails.

3) UI
- Agent Wars Hub: show criteria with green/red icons and quoted evidence; show latest judge status and confidence.
- Scale: include judge distribution chart and top unsatisfied criteria list; show revised prompt suggestions.

Operational tips and edge cases
- Non-deterministic artifacts: If the agent provides file names or URLs to non-existent assets, validators should treat as unsatisfied unless verified.
- Tool outputs: Include tool messages in the judged “conversation” and index them; many completions reside in tool results rather than assistant prose.
- Multi-turn clarifications: A “partial” state with high confidence can be used to prompt the agent to address missing criteria (if you implement adaptive prompting).
- Safety/PII: The judge should never log full content beyond secure storage; hash long content in logs for telemetry.

Rollout plan
- Phase 1: Implement validators + fast judge with structured prompt and abstain logic. No early stopping unless fast ≥ 0.8 and validators pass.
- Phase 2: Add strong confirm and update stop policy to require strong ≥ 0.85 OR two consecutive fast ≥ 0.85.
- Phase 3: Calibrate thresholds using Scale runs with 150+ labeled samples. Target precision ≥ 0.95 for “complete.”
- Phase 4: Add ensembles and parity checks; add goal-type-specific validators and thresholds.
- Phase 5: Automate monthly calibration with sampled human audits and dashboarding.

By combining deterministic checks, structured judging with evidence, conservative thresholds, and calibration via your Scale Testing pipeline, you’ll achieve reliable, interpretable goal-completion detection for Agent Wars and batch evaluations. This design fits your provider abstraction, extends your schema minimally, and provides actionable heuristics and code you can implement incrementally.


---

*Generated by Task Master Research Command*  
*Timestamp: 2025-08-11T15:34:01.315Z*
