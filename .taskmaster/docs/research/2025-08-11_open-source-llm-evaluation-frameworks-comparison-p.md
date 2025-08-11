---
title: Research Session
query: "Open-source LLM evaluation frameworks comparison (Promptfoo, LangSmith, TruLens, DeepEval): capabilities for conversation testing, metrics, failure mode tagging (2025)."
date: 8/11/2025
time: 6:14:56 PM
timestamp: 2025-08-11T15:14:56.660Z
exchanges: 1
---

# Research Session

## Initial Query

**Question:** Open-source LLM evaluation frameworks comparison (Promptfoo, LangSmith, TruLens, DeepEval): capabilities for conversation testing, metrics, failure mode tagging (2025).

**Response:**

Executive summary
- Promptfoo is the most practical open-source choice for this project’s TypeScript/Next.js stack. It supports multi-turn conversation testing, LLM-as-judge criteria, safety/red-team checks, output formats you can ingest, and it runs entirely locally/CI. It also has a simple tagging model (test tags + assertion names) you can map to failure modes.
- TruLens and DeepEval are strong, open-source, Python-first evaluators with richer, programmable “feedback/metric” APIs. They’re excellent if you’re willing to run a small Python worker service. TruLens shines for tracing and feedback on complex, multi-call apps; DeepEval shines for off-the-shelf QA/RAG/quality metrics and pytest-style workflows.
- LangSmith has the most polished dataset/eval UX and labeling workflows for failure modes, but the platform is hosted/SaaS. You can integrate via the JS SDK if you accept that. It is not fully open-source (only the client libraries are).
- For Task 6 (Scale Testing) and Task 5 (Agent Wars), you can implement a unified Evaluation Adapter in Node (Promptfoo primary; optional adapters to Python worker for TruLens/DeepEval and to LangSmith) and persist per-conversation metrics and failure-mode tags into your RunReport and Conversation tables. This keeps you provider-agnostic and aligns with your Prisma schema and provider abstraction.

What “conversation testing,” “metrics,” and “failure mode tagging” mean here
- Conversation testing: Multi-turn inputs/outputs with system prompts/personas, goal conditions, and limits. The evaluator should consume a transcript (system + user/assistant messages) and optionally metadata (model, tokens, timing, tool calls) and produce scores and reasons.
- Metrics: Quantitative or categorical judgments per turn or per conversation, e.g., goal adherence, correctness, hallucination/faithfulness, contextuality, toxicity, jailbreak susceptibility, refusal rate, verbosity, latency, and token/cost. Some metrics are rule-based (regex, includes), some are model-judged (LLM rubric), and some are learned detectors (toxicity).
- Failure mode tagging: Assigning labels to a failing turn/conversation, such as “hallucination,” “off-goal,” “safety violation,” “prompt injection success,” “refusal,” “tool misuse,” “formatting error,” “timeout,” “rate-limit,” “truncation.” These tags should be queryable and summarized in RunReport.

Framework-by-framework comparison (2025)

1) Promptfoo (open-source; Node-first; local/CLI, optional cloud)
- Conversation testing:
  - Supports multi-turn via messages sequences. Tests can define a chat sequence with role/content messages. Variables can inject dynamic user inputs or system prompts.
  - Good fit for your Node/TS project. Can be run programmatically via CLI from Next.js API routes/background jobs and produce JSON/JUnit/CSV outputs.
- Metrics:
  - Built-in assertions: string includes/equals, regex, JSON validity, JavaScript custom assertions, similarity (embedding cosine), distance-based, and LLM-rubric (LLM-as-judge with a provided rubric).
  - Safety/red teaming: ships with attack packs (e.g., jailbreak prompts) and safety assertions (toxicity, prompt injection success heuristics) via plugins; can run “red-team” suites against your prompts.
  - Performance: captures latency and can log tokens/cost if you pass provider usage info.
- Failure mode tagging:
  - Test- and assertion-level tags: You can add tags to tests and name assertions descriptively (e.g., “failure:hallucination”) and export them. For automatic tagging, define one LLM-rubric per failure mode; the result name becomes your tag.
  - Metadata: You can attach metadata to tests to carry agent/model IDs and conversation IDs, which is handy for your Prisma linking.
- Integrations/UX:
  - Outputs: JSON, JSONL, JUnit, CSV; “promptfoo view” launches a local viewer. Easy to parse into your RunReport.
  - Providers: Works with OpenAI and custom HTTP providers; can reuse your provider abstraction by writing a provider shim or using the generic HTTP provider.
  - Licensing and ops: MIT-style; runs local; easy CI integration with GitHub Action.
- Gaps/pitfalls:
  - No hosted dataset labeling queues or persistent web dashboard out of the box (unless using Promptfoo Cloud).
  - Advanced learned metrics require either LLM-judge rubrics or JS custom assertions; not as many prebuilt analytical metrics as DeepEval.

2) TruLens (open-source; Python-first; “feedback functions” + trace-aware eval)
- Conversation testing:
  - Strong for tracing LLM apps (LangChain/LlamaIndex) and evaluating end-to-end runs and sub-calls. You can evaluate per message or per session.
  - Stores traces and evaluation “feedback” linked to spans; can run a local dashboard for drill-down.
- Metrics:
  - Feedback functions: LLM-based criteria (relevance, groundedness/faithfulness), classical similarity, toxicity via Detoxify, and custom feedback functions. Good RAG-centric metrics.
  - Aggregation: Can compute feedback per turn and summarize across runs.
- Failure mode tagging:
  - Each feedback function produces scores and explanations under a named key; you can define feedback names to match your failure taxonomy and threshold them into tags.
  - You can store structured metadata with each record/run; easy to export to Postgres.
- Integrations/UX:
  - Local DB (SQLite) by default; can configure Postgres backend or export. Local dashboard via Streamlit.
  - Best integrated as a Python microservice that your Node app calls with a transcript to score.
- Gaps/pitfalls:
  - Python-only; adds a service boundary for a TS project. Dashboard is less CI-oriented than Promptfoo’s CLI.

3) DeepEval (open-source; Python-first; pytest-like evaluator)
- Conversation testing:
  - Originally focused on QA/RAG single-turn, but supports evaluating lists of test cases and can handle multi-turn by iterating turns or scoring the full transcript (you define how). Recent versions include conversation examples and “run suite” with datasets.
- Metrics:
  - Off-the-shelf: AnswerRelevancy, Faithfulness, Hallucination, Toxicity, Readability/Fluency, SummarizationQuality, and others. Many are LLM-judged or hybrid with embeddings.
  - CI-friendly: pytest integration and CLI; exports detailed JSON with reasons.
- Failure mode tagging:
  - Metric outputs include score, pass/fail, and reason; you can map metric names and reasons to your failure taxonomy. You can also define custom metrics to emit specific failure categories.
- Integrations/UX:
  - Good for batch runs and test suites; simple to dockerize as a worker. Can export JSON for Prisma ingestion.
- Gaps/pitfalls:
  - Python-only; less conversation-native than LangSmith/TruLens tracing. Some metrics depend on OpenAI judges, so costs can add up.

4) LangSmith (SaaS platform by LangChain; JS/Python SDKs are open-source; platform is not)
- Conversation testing:
  - First-class datasets with multi-turn examples; run evaluators that compare predictions vs references or LLM-judge on criteria. Excellent for inspecting runs and traces, especially if built with LangChain, but works with generic apps via the SDK.
- Metrics:
  - Built-in evaluators: string match, semantic similarity, LLM-as-judge CriteriaScore (custom rubric), toxicity, and more; plus custom evaluators hosted in your code. Tracks latency, token usage, costs, and model metadata automatically.
- Failure mode tagging:
  - Robust labeling: “Feedback” API supports categorical labels, numeric scores, and free-text reasons; labeling queues and dashboards for human review. You can create a controlled vocabulary of failure modes and apply them per run/message.
- Integrations/UX:
  - Excellent dashboards, filtering, dataset management, comparisons across models/prompts. JS SDK fits your stack well.
- Gaps/pitfalls:
  - Hosted; data egress and privacy considerations. Not fully open-source. Adds a dependency outside your stack.

What this means for your project (Tasks 1, 2, 5, 6, 7)

Recommended approach
- Primary evaluator: Promptfoo CLI embedded into your Node job runners for open-source, conversation-native, CI-friendly evaluation. Use it to score batch runs (Task 6) and Agent Wars sessions (Task 5) with both rule-based assertions and LLM-rubric criteria.
- Optional Python evaluator: For richer quality and RAG metrics, run a small Python worker container exposing /evaluate that wraps DeepEval and/or TruLens feedbacks. Call it when needed, merge results into the same schema. This provides faithfulness/relevancy/toxicity without committing to SaaS.
- Optional hosted layer: If you want a powerful labeling UI and organizational dashboards later, integrate LangSmith behind a feature flag and sync anonymized transcripts. Use it for human-in-the-loop failure mode tagging and audit.

Schema and data model suggestions (extend Task 1)
- Conversation: keep messages and metadata (model, provider, timing, token usage).
- EvaluationRun: id (cuid), conversationId (FK), framework ('promptfoo'|'trulens'|'deepeval'|'langsmith'), config (json), startedAt, completedAt, costs (json), status.
- EvaluationMetric: id, evaluationRunId (FK), name (string, e.g., 'goal_adherence', 'toxicity'), scope ('conversation'|'turn'), turnIndex (int|null), score (float|null), passed (bool|null), reason (text), raw (json).
- FailureTag: id, evaluationRunId (FK), conversationId (FK), turnIndex (int|null), tag (enum or string), sourceMetric (string), explanation (text).
- RunReport: keep summary aggregates (json) and proposed prompt revisions. Populate from EvaluationMetric + FailureTag aggregations.

Implementing Promptfoo for conversation evals

A) Represent a conversation test (multi-turn) with assertions
- Example promptfooconfig.yaml generated per Scale run:

  name: "Scale run for agent {{agentName}}"
  providers:
    - id: openai:gpt-4o-mini
      config:
        apiKey: ${OPENAI_API_KEY}
  tests:
    - description: "Goal adherence and safety for conversation {{conversationId}}"
      vars:
        conversationId: "cuid123"
      messages:
        - role: system
          content: "{{systemPrompt}}"
        - role: user
          content: "{{turn1}}"
        - role: assistant
          content: "{{turn1_expected_or_prev_assistant}}"  # optional: seed previous assistant if replaying
        - role: user
          content: "{{turn2}}"
      assert:
        - type: llm-rubric
          provider: openai:gpt-4o-mini
          rubric: |
            You are grading whether the assistant's last message advanced the user toward the stated goal: "{{goal}}".
            Grade on a 0-1 scale. Provide a short reason.
          threshold: 0.7
          label: goal_adherence
        - type: toxicity
          threshold: 0.2
          label: safety_toxicity
        - type: javascript
          value: |
            // Fail if response contains secrets or API keys-like patterns
            const leaked = /sk-[A-Za-z0-9]{20,}/.test(output);
            return { pass: !leaked, score: leaked ? 0 : 1, reason: leaked ? "Key-like token found" : "" , label: "leak_check" };

Notes:
- messages: You can supply the entire transcript you ran in Task 5/6 or subset by turn. If you already executed the conversation, set providers: none and use “post-hoc” assertions with output = your assistant message.
- Assert labels: choose descriptive names so you can map to FailureTag.

B) Run from Node and ingest results
- Generate config and call the CLI. Example:

  import { execa } from 'execa';
  import fs from 'node:fs/promises';
  import path from 'node:path';

  export async function runPromptfooEval(config: object, workDir: string) {
    const cfgPath = path.join(workDir, 'promptfooconfig.yaml');
    await fs.writeFile(cfgPath, yamlStringify(config));
    const { stdout } = await execa('npx', ['promptfoo', 'test', '--config', cfgPath, '--output', 'json'], { cwd: workDir });
    const results = JSON.parse(stdout);
    // results.tests[].assertions[] contain name/label/score/pass/reason
    return results;
  }

- Map results into EvaluationRun, EvaluationMetric, and FailureTag. Assertion failures with label starting with "failure:" can be auto-mapped to FailureTag.tag.

C) Failure mode taxonomy and mappings
- Suggested tags for this app:
  - hallucination, off_goal, refusal, safety_violation, jailbreak_success, formatting_error, tool_misuse, truncation, repetition, latency_spike, rate_limited, timeout
- Mapping ideas:
  - hallucination: llm-rubric(hallucination) < 0.7 OR DeepEval.Faithfulness < 0.7
  - off_goal: llm-rubric(goal_adherence) < 0.7
  - safety_violation: toxicity > 0.2 OR red-team jailbreak assertion pass == true
  - refusal: regex includes “I cannot” OR LLM rubric “helpfulness” low
  - formatting_error: is-json assertion fail for tool responses
  - truncation: detect “…(truncated)” or token cap exceeded from provider usage
  - latency_spike: 95th percentile latency > threshold from provider logs

Implementing DeepEval/TruLens via a Python worker (optional)

- Why: If you want richer “faithfulness/relevancy” metrics without building your own LLM-judge prompts, DeepEval is productive. TruLens is great if you want to keep traces and compute feedbacks on sub-steps.

- Minimal FastAPI service exposing an evaluate endpoint (DeepEval example):

  from fastapi import FastAPI
  from pydantic import BaseModel
  from deepeval.metrics import FaithfulnessMetric, ToxicityMetric

  app = FastAPI()
  faith = FaithfulnessMetric(model="gpt-4o-mini")
  tox = ToxicityMetric()

  class Turn(BaseModel):
      role: str
      content: str

  class EvalRequest(BaseModel):
      transcript: list[Turn]
      context: list[str] | None = None

  @app.post("/evaluate")
  def evaluate(req: EvalRequest):
      # last assistant message
      last = next((t.content for t in reversed(req.transcript) if t.role == "assistant"), "")
      # Combine system+user turns for context
      prompt_text = "\n".join([f"{t.role}: {t.content}" for t in req.transcript if t.role != "assistant"])
      f_score = faith.score(output=last, input=prompt_text, context=req.context or [])
      t_score = tox.score(output=last)
      return {
          "metrics": [
              {"name": "faithfulness", "score": f_score.score, "reason": f_score.reason},
              {"name": "toxicity", "score": t_score.score, "reason": t_score.reason},
          ]
      }

- Deploy alongside your Next.js API; call it from your Scale job, store metrics in EvaluationMetric, and derive FailureTag thresholds.

LangSmith integration (optional, SaaS)
- Use the JS SDK to log runs and attach automated evaluators:

  import { Client, RunTree, Evaluator } from "langsmith";

  const client = new Client({ apiKey: process.env.LANGSMITH_API_KEY });
  const projectName = "Agent Wars";

  // Log a conversation run
  const run = new RunTree({ name: "conversation", project_name: projectName, inputs: { messages }, outputs: { final: lastAssistant }, tags: ["model:gpt-4o-mini"] });
  await run.postRun();
  await run.end();

  // Attach feedback (failure modes)
  await client.createFeedback(run.id, {
    key: "failure_mode",
    value: "off_goal",
    comment: "Goal adherence below threshold",
  });

- Benefit: retained dashboards, labeling queues, and filtering. Caveat: data hosted; use redaction (hash content) if sensitive.

Coverage of requested capabilities

- Conversation testing:
  - Promptfoo: native through message sequences in tests; great for CI and batch; programmatic in Node via CLI.
  - LangSmith: native datasets and evaluators; best-in-class hosted UX; JS SDK available.
  - TruLens: native if you instrument the app; captures per-turn spans and evaluates them.
  - DeepEval: workable—evaluate per turn or transcript; not trace-native but supports batch datasets.

- Metrics:
  - Promptfoo: assertions (regex/includes/json/similarity), LLM-rubric, JS assertions, safety/red-team packs, latency capture.
  - LangSmith: criteria evaluators (LLM-judge), toxicity, semantic similarity, custom; automatic token/latency.
  - TruLens: feedback functions (faithfulness/groundedness/relevance/toxicity) + custom, trace-aware aggregation.
  - DeepEval: many off-the-shelf quality metrics (faithfulness, toxicity, summarization, hallucination), pytest/CLI.

- Failure mode tagging:
  - Promptfoo: via assertion labels and tags; can implement auto-tagging with LLM-rubric per failure; export JSON for Prisma.
  - LangSmith: full labeling + feedback API; structured categorical labels; queues; search/filtering.
  - TruLens: name feedbacks by failure category; explanations attached; easy to threshold to tags.
  - DeepEval: metric -> pass/fail + reason; map to tags in your app.

How to apply in Tasks 5, 6, 7

- Task 5 (Agent Wars Hub):
  - After a session ends (goal reached or 25 messages), run a Promptfoo eval against the final turn and optionally the full transcript for:
    - goal_adherence (LLM-rubric), safety_toxicity, refusal_detection, formatting checks, latency stats (from your provider logs).
  - Persist EvaluationRun + metrics + FailureTags; display per-session summary badges in the Hub (e.g., “Hallucination risk,” “Safe,” “Off-goal”).
  - Offer a “View Eval” link that surfaces the reasons.

- Task 6 (Scale Testing):
  - Batch N conversations, then trigger a Promptfoo suite that consumes those saved transcripts and evaluates with a fixed rubric. Export JSON, ingest into EvaluationMetric.
  - Summarization workflow: Build an LLM prompt that reads the aggregated failures/metrics and proposes a revised system prompt. Include failure frequencies and exemplar transcripts.
  - Keep a runCount cap and cost guard: set evaluation model to a small judge (gpt-4o-mini or o3-mini) and batch calls with rate limits.

- Task 7 (PromptBro):
  - Add an inline “quick check” button that runs a tiny Promptfoo/JS assertion set on the draft prompt against a few synthetic adversarial inputs (prompt injection, ambiguity). Surface warnings and incorporate them into improvement suggestions.

Operational considerations and pitfalls
- LLM-judge bias: Calibrate rubrics and set temperature=0 for judge models; perform consistency checks (e.g., self-consistency across K=3 judges or average).
- Cost control: Prefer small-fast judges; cache judgments on identical (prompt, answer) pairs via hash; parallelize but respect provider rate limits.
- Determinism and reproducibility: Fix models and versions; store evaluation config snapshot alongside results; store seeds where applicable.
- Privacy: If you trial LangSmith, redact content or opt-in examples only. For Promptfoo/TruLens/DeepEval, all data stays in your infra.
- Threshold tuning: Start conservative (e.g., faithfulness >= 0.8, toxicity <= 0.2), then refine based on error analysis.

Concrete next steps for this repo

1) Add evaluation schema (if not already planned)
- Add EvaluationRun, EvaluationMetric, FailureTag tables as outlined, or extend RunReport to include metrics and tags JSON with indexes on (conversationId, metric.name) for quick filters.

2) Implement a Node Evaluation Adapter
- Interface:

  type EvalInput = { conversationId: string; messages: { role: 'system'|'user'|'assistant'; content: string }[]; goal?: string; systemPrompt?: string; model?: string; };
  type EvalResult = { metrics: { name: string; score?: number; passed?: boolean; reason?: string; scope?: 'conversation'|'turn'; turnIndex?: number; }[]; tags: { tag: string; reason?: string; turnIndex?: number }[]; raw?: any; };

  interface Evaluator {
    name: 'promptfoo'|'deepeval'|'trulens'|'langsmith';
    evaluate(input: EvalInput): Promise<EvalResult>;
  }

- First implementation: PromptfooEvaluator running the CLI and parsing JSON output into EvalResult.

3) Wire into Task 6 after runs complete
- After all N conversations, call Evaluator on each; aggregate into RunReport: top failure modes, average scores, and suggested prompt revision via your summarizer.

4) Optional: Python worker
- Add a dockerized FastAPI app for DeepEval. Feature-flag usage; merge results with Promptfoo via metric name prefixes (deepeval.faithfulness, deepeval.toxicity).

5) Optional: LangSmith
- Add an env flag ENABLE_LANGSMITH. If enabled, log runs and feedback, and provide links to the hosted dashboard in your UI.

Quick capability matrix (short narrative)
- Promptfoo: Open-source, Node-native, multi-turn, LLM-rubric + assertions, red-team packs, tags via config/assertion names, great for CI and batch; minimal UI; ideal primary for this project.
- TruLens: Open-source, Python, trace-aware feedback, strong for complex apps and RAG; use as a service to compute feedbacks; failure modes via feedback names.
- DeepEval: Open-source, Python, many quality metrics out-of-the-box, pytest/CLI; workable for conversations; failure modes via metric mapping.
- LangSmith: Hosted, JS/Python SDKs, best dashboards/labeling, datasets, evaluators; non-open-source platform; excellent for failure mode tagging workflows if SaaS is acceptable.

If you want, I can provide:
- A ready-to-use Promptfoo config generator for your Scale runs with goal adherence, toxicity, refusal, and formatting checks.
- A Prisma migration for EvaluationRun/EvaluationMetric/FailureTag and sample seed/run-report aggregation queries.
- A minimal DeepEval FastAPI worker and Dockerfile plus a Node client.


---

*Generated by Task Master Research Command*  
*Timestamp: 2025-08-11T15:14:56.660Z*
