---
title: Research Session
query: "Chatbot Arena (LMSYS) head-to-head LLM comparison UI/UX patterns, open-source references, how battles are structured and evaluated (2024-2025)."
date: 8/11/2025
time: 6:12:06 PM
timestamp: 2025-08-11T15:12:06.617Z
exchanges: 1
---

# Research Session

## Initial Query

**Question:** Chatbot Arena (LMSYS) head-to-head LLM comparison UI/UX patterns, open-source references, how battles are structured and evaluated (2024-2025).

**Response:**

Below is a deep dive into how LMSYS’s Chatbot Arena structures head-to-head “battles,” the UI/UX patterns that make it work, open-source references you can reuse, and how to adapt the patterns to your Agent Wars Hub (Task 5) and related tasks (Tasks 1, 2, 6, 7). I’ll cover: (1) Arena interaction model and battle lifecycle, (2) UI/UX patterns to minimize bias and maximize signal, (3) evaluation methods (human votes, LLM-as-judge, Elo/BTL/TrueSkill), (4) open-source references and code locations, (5) concrete implementation guidance for your Hub (API, data model, orchestration), (6) fairness and anti-bias controls, (7) testing strategies, and (8) extensions for Scale Testing and PromptBro.

1) What Chatbot Arena is optimizing for (2024–2025)
- Core idea: Evaluate LLMs without ground-truth labels by collecting pairwise human preferences in blind A/B chats. This sidesteps the difficulty of constructing exhaustive labeled datasets and captures holistic “helpfulness” across diverse tasks.
- Interaction loop: Users see two anonymous assistants (“A” and “B”), send the same messages to both, observe replies, iterate as desired, and vote for the better assistant (or tie). Votes are converted into pairwise preferences used to update leaderboard ratings.
- 2024–2025 update trends:
  - Scale: More models, more categories, anti-abuse and standardization improvements.
  - LLM-as-judge augmentations: To expand volume, LMSYS and others (e.g., MT-Bench, AlpacaEval) have popularized “AI judge” methods to supplement human votes. Judging prompts/rubrics are becoming more structured.
  - “Hard” curated prompts: LMSYS released “Arena Hard”-style datasets—challenging, diverse, adversarial prompts—to get sharper model separations than generic chit-chat.
  - Bias controls: Strong emphasis on blinding, randomization, and length/repetition controls to reduce verbosity bias and positional bias.

2) How battles are structured in Arena (mechanics you can adopt)
- A/B blinding and randomization:
  - Models are anonymized as “A” and “B.”
  - Side assignment is randomized each session to control positional bias.
  - Users are encouraged to interact freely; both sides receive exactly the same user inputs with the same system prompt and temperature-like settings.
- Multi-turn or single-turn:
  - Arena supports multi-turn (user can send multiple messages) to reflect realistic dialogue.
  - However, many quantitative evaluations (e.g., MT-Bench) use either single-turn or fixed multi-turn with standardized prompts.
- End conditions:
  - Human sessions end when the user votes (A wins/B wins/Tie), abandons, or times out.
  - Technical safeguards include max turn limits, max generation tokens, max wall-clock per turn.
- Logging and metadata:
  - Each “battle” stores both transcripts, timing, model metadata (hidden from the voter), and the vote outcome. These logs feed the Elo/Bradley–Terry pipeline.
- Quality filters:
  - Arena applies heuristics to filter spam/low-quality votes and mitigate gaming (IP/device patterns, too-fast votes, extreme lengths, suspicious repetition, etc.).
- Ratings aggregation:
  - Ratings are computed from pairwise outcomes (A beats B, tie) periodically to produce a leaderboard with confidence bounds.

3) UI/UX patterns used in Chatbot Arena (and recommended for your Agent Wars Hub)
- Blinded A/B interface:
  - Expose two assistants labeled “A” and “B” only. Hide all model/provider details until after a vote or until the run finishes. Only then allow “Reveal Participants.”
  - Strong, persistent CTA for “Select Winner” (A / Tie / B), ideally fixed-position at the bottom once both responses are available.
- Same prompt broadcast:
  - Use a single input box; send the same user message to both sides automatically. Display a subtle “broadcast to both” indicator to set expectations.
- Side-by-side or toggle view:
  - Arena often uses tabbed or side-by-side layouts. Side-by-side is great on widescreens; tabs work better on smaller screens. For your Hub, consider:
    - Desktop: Two columns with synchronized scroll.
    - Mobile: Tabs with sticky tab headers and a “diff” toggle to highlight differences.
- Progress and interactivity:
  - Display generation spinners independently per side.
  - Show token/time counters for transparency (“A: 1.3s, 180 tokens; B: 1.5s, 240 tokens”).
  - Allow “Regenerate both” (rarely used in Arena, but useful in development).
- Bias guards built into UI:
  - Randomize which participant is “A” vs “B” per session.
  - Uniform styling: same avatar, same bubble style, no color-coding implying quality.
  - Optional: length normalization indicator (e.g., warn if one side exceeds a verbosity threshold).
- Post-vote reveal and share:
  - After voting, optionally reveal who A/B were, with a “copy link to transcript” and anonymized share links. In your Hub, only reveal to authorized users or in dev mode.
- Session management:
  - Multi-session cards with jobId, brief status (e.g., “turn 7/25,” “goal reached,” “timeout”), and quick actions (pause/stop/reveal/download).
  - Make it easy to launch multiple concurrent sessions with identical configs except for model or agent to facilitate head-to-head experiments.

4) Open-source references (LMSYS and related)
- FastChat (lmsys-org/FastChat) — the backbone for Arena:
  - Web UI and server for Chatbot Arena and an OpenAI-compatible API.
  - Includes Arena-related code (matching clients to models, collecting votes, normalizing inputs, and UI flows). Look for server components that implement A/B chat, arena queues, and vote logging. Historically, Arena UI lived alongside the Gradio/Starlette server; newer revisions may have a separate frontend.
  - Includes MT-Bench and AI-judge utilities (rubrics, prompts, code to compare responses and produce structured judgments).
  - Contains scripts for Elo/BT-type aggregation from vote logs (e.g., Python scripts to compute ratings and confidence intervals from pairwise data with draws). Look for “arena,” “elo,” or “bt” scripts.
- Arena Hard dataset and Auto-Judge pipelines:
  - The LMSYS ecosystem references “Arena Hard” collections and LLM-as-judge scripts. While details evolve, you’ll find judging prompts, scoring dimensions (helpfulness, correctness, reasoning, safety), and aggregation methods in FastChat’s evaluation subdirectories and LMSYS blog/docs.
- MT-Bench (in FastChat):
  - Multi-turn prompt sets and GPT-4-based judging framework; you can adapt the rubric for your LLM-judge mode.
- AlpacaEval (Stanford CRFM):
  - Another well-known pairwise evaluation framework with “length-controlled” win-rate. Helpful for addressing verbosity bias.
- Other frameworks (for cross-reference):
  - OpenCompass (Shanghai AI Lab) and lighteval (HF) include scoring and some pairwise or rubric-based evaluation pipelines, but Arena-specific UI patterns are best sourced from FastChat.

5) Applying Arena patterns to your Agent Wars Hub (Task 5)
A. Battle orchestration model (backend)
- Participants:
  - Participant A: your selected LLM model + system prompt (from provider abstraction).
  - Participant B: a prebuilt Agent from DB (Agent table).
- Turn loop:
  - Initialize two synchronized conversations (Conversation rows) with identical systemPrompt and goal context. Randomize A/B assignment per battle.
  - For each turn:
    - Send the user/input message to both sides (or auto-generated turn if your workflow is bot-to-bot).
    - Await both responses with timeouts (e.g., 30–60s per response) and token caps.
    - Append both Message rows.
    - Check “goal achieved” function; if true, end with endedReason='goal'. Otherwise continue.
  - Termination:
    - Stop at 25 messages (as per requirement) or earlier on goal, timeout, error, or manual stop.
- Results:
  - Determine winner:
    - If your primary criterion is “goal reached,” then:
      - If only one side reached the goal => that side wins.
      - If both reached: tie or use tie-breaker (shortest turns, fewer tokens, lower latency, or LLM-judge rubric).
      - If neither reached: tie or LLM-judge to pick a “closer” conversation.
    - Store result: A win / B win / Tie / Error / Timeout, plus endedReason and evaluation rationale.
- Concurrency:
  - Queue/pool to run N battles in parallel with rate limiting (cap concurrency by provider and model).
  - Backoff/retry on transient failures (429/5xx).

B. Endpoints (aligned with Task 5 details)
- POST /api/battles/start
  - Input: provider, model (whitelist), agentId, systemPrompt, goal, options {maxTurns, latencyBudgetPerTurn, temperature, maxTokens, judgeMode?}
  - Output: jobId, conversationIdA, conversationIdB (Store with a Battle row; see schema below.)
- GET /api/battles/:jobId/status
  - Output: { state: 'queued'|'running'|'done'|'error', progress: 0-100, currentTurn, endedReason, winner, errorMessage? }
- GET /api/battles/:conversationId/messages
  - Paginated list of messages with roles and timestamps.
- Optional human-vote route:
  - POST /api/battles/:jobId/vote { winner: 'A'|'B'|'tie' } (if you add crowd/HIT workflows).

C. UI (shadcn/ui)
- /hub layout:
  - Left column: Battle Form
    - Select: provider, model (whitelist), agent.
    - Textareas: system prompt, goal.
    - Start Battle button (spawns a Battle Card).
    - Tips: Show fairness defaults (temperature, max tokens).
  - Right column: Sessions list (Cards grid)
    - Each Card: jobId, A/B tabs or a dual-pane preview of the latest messages, progress bar, spinner per side.
    - Actions: Pause, Stop, Reveal Participants (after done), Open Full Transcript.
- Full transcript view:
  - Two columns (A vs B) with synchronized scrolling.
  - Sticky “Declare Winner” (if you do manual votes) or display computed outcome and rationale (if auto-judge).
- Live polling:
  - Poll /status every 1–2s.
  - When status changes to running, start polling both conversations’ messages.
  - Disable the vote/declare-winner until both sides have produced at least one response.

D. Fairness defaults (mirror Arena practice)
- Same temperature, top_p, max_tokens for both.
- Same system prompt framing (unless agent differs by design).
- Randomize A/B assignment and prevent reveal until outcome is recorded.
- Optionally enforce length controls (e.g., target token parity; show a warning if one side exceeds +2x tokens to reduce verbosity bias).

6) Data model additions (Task 1 alignment)
Your current Task 1 models are Agent, Conversation, Message, RunReport, PromptTemplate. For battles and pairwise aggregation, add:

- Battle
  - id (cuid, PK)
  - conversationAId (FK -> Conversation)
  - conversationBId (FK -> Conversation)
  - participantA (json: { provider, model, agentId? })
  - participantB (json: { provider, model, agentId? })
  - goal (text)
  - startedAt, endedAt
  - endedReason (enum: 'goal'|'limit'|'error'|'manual'|'timeout')
  - winner (enum: 'A'|'B'|'tie'|'none')
  - judgeMode (enum: 'goal'|'human'|'llm')
  - judgeRationale (text)
  - metrics (json: { tokensA, tokensB, latencyA, latencyB, turns, costA, costB })
  - isBlind (bool, default true)
- Optional: Vote (if you invite humans beyond the orchestrator)
  - id, battleId, voterId/anonId, winner, createdAt, qualitySignals (json), tieReason?
- Optional: Rating (for Elo/BTL/TrueSkill snapshots)
  - id, model or agent identifier, rating, ratingSigma, games, lastUpdated
  - You can compute ratings offline and store a snapshot per run or per day.

7) Evaluation methods (2024–2025 best practices)
A. Elo (Arena-style)
- Converts pairwise wins/ties into rating updates.
- Simple online update after each match, or batch recompute. Arena historically uses robust aggregation and tie handling. A standard Elo works fine for your project as a start:

TypeScript Elo update (with tie handling):
function expectedScore(rA: number, rB: number) {
  return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

function eloUpdate(rA: number, rB: number, outcome: 'A'|'B'|'tie', k = 16) {
  const sA = outcome === 'A' ? 1 : outcome === 'B' ? 0 : 0.5;
  const sB = 1 - sA;
  const eA = expectedScore(rA, rB);
  const eB = 1 - eA;
  return {
    rANext: rA + k * (sA - eA),
    rBNext: rB + k * (sB - eB),
  };
}

- K-factor can be adapted based on games played or confidence.
- For ties, sA = sB = 0.5.

B. Bradley–Terry–Luce (BTL) and draws
- Treats pairwise results via a logistic model; can be fit by MLE over all battles, often yielding more stable ratings than incremental Elo. Include a draw parameter or map ties to half-wins.
- Pros: batch stability, confidence intervals via Hessian/Fisher information. Cons: needs batch recompute.
- Use BTL when you have many battles and want robust ranking; store daily snapshots.

C. TrueSkill (or TrueSkill2)
- Maintains mu/sigma per participant; updates provide uncertainty-aware rankings with graceful handling of limited data.
- Useful when you have sparse comparisons and want more conservative leaderboards.

D. Auto-judge (LLM-as-judge)
- To resolve ties or no-goal cases, or to scale beyond available humans:
  - Use a judge prompt with clear rubric: correctness, helpfulness, completeness, safety, concision. Request a strict JSON schema.
  - Provide both A and B transcripts (trimmed) and the original goal. Ask the judge to pick A, B, or tie and give reasons. Keep temperature low (0–0.2), maxTokens small (e.g., 300–600).
  - Guardrails: length normalization, “citation required” style for fact claims, and a “refuse to pick” option that maps to tie.
- Combine: You can compute Elo from auto-judged outcomes, but clearly mark “Auto-Judge” ratings separately from human-vote-derived ratings (as LMSYS does when they publish auto-judge benchmarks distinct from human Arena).

E. Basic goal-based scoring (your immediate need)
- If your battle stops when the goal is reached:
  - Winner = the side that reached goal first (fewer turns) or with fewer tokens/latency if both reached.
  - If neither reached by 25 messages: tie or judge-based decision.

8) Orchestration code sketch (maps to Task 2 provider abstraction)
Assuming your provider.chat interface from Task 2:

// Pseudocode for a single battle
async function runBattle(opts) {
  const { provider, model, agentId, systemPrompt, goal, maxTurns = 25 } = opts;
  // Create two conversations: A (candidate model), B (agent)
  const convA = await createConversation({ agentId: null, model, systemPrompt, goal });
  const convB = await createConversation({ agentId, model: await agentDefaultModel(agentId), systemPrompt, goal });

  const sides = Math.random() < 0.5 ? { A: convA, B: convB } : { A: convB, B: convA };
  const jobId = cuid();

  for (let turn = 1; turn <= maxTurns; turn++) {
    const userMsg = await nextUserOrAutoMessage(jobId, turn); // from UI or a script
    await Promise.all([
      appendMessage(sides.A.id, { role: 'user', content: userMsg }),
      appendMessage(sides.B.id, { role: 'user', content: userMsg }),
    ]);

    const [respA, respB] = await Promise.all([
      chat(await loadMessages(sides.A.id), { provider, model, maxTokens: 512, temperature: 0.7 }),
      runAgentTurn(sides.B.id, agentId), // agent may call tools, then return assistant text
    ]);

    await appendMessage(sides.A.id, { role: 'assistant', content: respA.text, meta: respA.meta });
    await appendMessage(sides.B.id, { role: 'assistant', content: respB.text, meta: respB.meta });

    if (await goalReached(sides.A.id, goal) || await goalReached(sides.B.id, goal)) break;
    await updateProgress(jobId, { turn });
  }

  const outcome = await decideOutcome({ convA: sides.A, convB: sides.B, goal });
  await finalizeBattle(jobId, outcome);
  return { jobId, outcome };
}

- goalReached can be a rule-based detector plus an optional LLM check:
  - Rule: look for a success marker the agent is instructed to emit (e.g., “GOAL_REACHED: true” in a hidden tool message).
  - LLM check: Ask a small model: “Given the goal and final reply, did the assistant achieve the goal? yes/no + rationale.”
- decideOutcome can apply your priority rules: goal-based > tie-breakers > judge.

9) Practical UI/UX blueprints with shadcn/ui (Task 5)
- Form (left)
  - Select provider (OpenAI/OpenRouter)
  - Model (whitelisted; disable invalid combos)
  - Agent (fetch via GET /api/agents)
  - System Prompt (Textarea)
  - Goal (Textarea)
  - Button “Start Battle”
- Sessions list (right)
  - Card per battle with Tabs: “A” | “B” | “Both”
    - Show scrollable chat for each side; in “Both,” show two columns.
    - Top-right status chip: running/done/error with progress bar.
    - Footer: Turn x/25, Tokens A/B, Elapsed.
    - Buttons: Stop, Reveal, Open Transcript
  - Poll every 1–2s: /api/battles/:jobId/status and message endpoints.
- Full battle modal/page
  - Two columns with sticky “Declare Winner” (disabled unless both have responded).
  - After done: show computed “Winner” with “Reveal Participants” to show model/agent names.

10) Fairness and anti-bias controls (adopted from Arena practice)
- Blinding: Persist “isBlind: true” through the battle; reveal only post-outcome or for admins.
- Random A/B assignment per battle; track in Battle.
- Standardize generation params for both sides (temperature, top_p, max_tokens).
- Length-control options:
  - Soft: instruct models to be concise.
  - Hard: warn or truncate excessively long responses (but truncation can bias against verbose models).
  - Reporting: show length ratio A/B and optionally apply a length-normalized win metric in analytics.
- Rate-limit and timeouts evenly; treat timeouts as a loss or no-contest consistently.
- Deduplicate repeated content from one side (verbosity bias); optionally penalize low-novelty content.

11) Integrations with Task 6 (Scale Testing) and Task 7 (PromptBro)
- Scale Testing (Task 6)
  - Use the same Battle orchestration to run N battles in parallel and summarize in a RunReport:
    - Win rate A vs B; average turns to success; token/latency stats.
    - If Auto-Judge enabled: include judge reasons and aggregated category scores.
    - Produce a “Revised Prompt” by prompting an LLM to analyze failures and propose improved system instructions.
  - The Elo/BTL/TrueSkill update scripts can run post-run to compute deltas and confidence intervals (store in Rating).
- PromptBro (Task 7)
  - Closed loop: Use the Scale run report to surface failure modes and feed them into PromptBro’s guided prompt creator.
  - Offer “Test revised prompt in Arena” one-click action to spin up fresh battles with the revised prompt against the same Agent, showing a before/after win-rate delta.

12) Testing strategies (borrowing from Arena robustness)
- Unit
  - Validate model whitelist and blinding logic (names never leak until reveal).
  - Elo/BT math correctness with known pairwise outcomes.
  - Provider abstraction caps, timeouts, and retry behavior.
- Integration
  - Mock jobs progressing turns and returning messages; ensure progress bars and spinners match states.
  - Simulate tie, A win, B win, both reach goal, and timeout paths.
  - Auto-judge route returns deterministic JSON; validate schema.
- E2E
  - Multiple concurrent battles (e.g., 3–5) with different configurations; ensure no cross-talk in transcripts.
  - Bias tests: Verify A/B randomization, identical generation params, and that “Reveal” is disabled until done.

13) Edge cases and pitfalls
- Deadlocks: One side responds, the other times out. Decide if you show partial UI or retry the delayed side once before moving on.
- Cost blow-ups: Cap tokens and turns; show projected cost. Provide “Stop all” to fail fast.
- Provider rate limits: Stagger starts, exponential backoff, and a concurrency pool keyed by provider/model.
- Streaming vs polling: Streaming is nice but complicates concurrency; polling every 1–2s is sufficient initially.
- Judge bias: If using Auto-Judge, use multiple judges (different models or multiple seeds) and require majority to reduce single-judge bias.
- Data privacy: Don’t log raw prompt content beyond what’s necessary (hash sensitive payloads in analytics). Redact secrets in transcripts.

14) Minimal Prisma schema delta (illustrative)
model Battle {
  id               String   @id @default(cuid())
  conversationAId  String
  conversationBId  String
  conversationA    Conversation @relation(fields: [conversationAId], references: [id])
  conversationB    Conversation @relation(fields: [conversationBId], references: [id])
  participantA     Json
  participantB     Json
  goal             String
  startedAt        DateTime @default(now())
  endedAt          DateTime?
  endedReason      BattleEndReason?
  winner           BattleWinner?
  judgeMode        JudgeMode @default(goal)
  judgeRationale   String?
  metrics          Json?
  isBlind          Boolean  @default(true)
}

enum BattleEndReason { goal, limit, error, manual, timeout }
enum BattleWinner { A, B, tie, none }
enum JudgeMode { goal, human, llm }

model Rating {
  id        String  @id @default(cuid())
  subject   String  // model name or agent identifier
  mu        Float   // or rating
  sigma     Float?  // for TrueSkill-like
  games     Int     @default(0)
  updatedAt DateTime @updatedAt
}

15) Rubric prompt for auto-judge (drop-in for Task 2 provider)
System: You are a strict, unbiased judge of two assistant conversations (A and B) toward the same user goal. You must pick the better conversation or tie, following the rubric.
User: 
- Goal: <goal text>
- Conversation A (latest N turns): <transcript A>
- Conversation B (latest N turns): <transcript B>
Scoring dimensions (weights in parentheses):
- Correctness (0.4): factual accuracy, task completion.
- Helpfulness (0.3): usefulness, step-by-step clarity, actionable outcomes.
- Safety (0.1): avoids harmful or policy-violating content.
- Concision (0.1): avoids unnecessary verbosity while preserving clarity.
- Reasoning (0.1): coherent reasoning when necessary.
Instructions:
- Return strict JSON: {"winner": "A"|"B"|"tie", "scores": {"A": 0-10, "B": 0-10}, "reasons": "<1-3 sentence rationale>"}
- If both are incorrect or incomplete, choose "tie".
- Do not include any model identity hints; judge only the content.
- Be conservative; avoid rewarding verbosity.

16) How to use ratings in your UI
- Per-battle: Show local outcome and metrics.
- Per-run (Scale): Show win-rate and a small “Elo delta” (if enabled) with 95% CI bands.
- Global: Keep a Ratings page for models and agents, showing mu/sigma or Elo rating with filters by domain (coding, math, writing), prompt type, and date range—similar to Arena leaderboards but scoped to your datasets.

Summary
- Chatbot Arena’s success hinges on a blind, randomized A/B chat UI, standardized generation settings, and pairwise preference aggregation (Elo/BTL). In 2024–2025, LMSYS has leaned further into auto-judge augmentation and “hard” prompt sets to scale high-signal comparisons.
- For your Agent Wars Hub (Task 5), implement the same UX patterns: blind A/B panes, synchronized input, goal-based termination, clear session management, and optional human/LLM judges. Store battles explicitly and aggregate outcomes into ratings. Reuse your provider abstraction (Task 2) for fairness and cost controls, and extend your schema (Task 1) with a Battle table and optional Rating snapshots.
- Leverage open-source references from lmsys-org/FastChat for Arena UI flows, AI-judge prompts, and Elo/BT aggregation scripts. Start with simple goal-based outcomes; add LLM-as-judge to reduce ties. Use Scale Testing (Task 6) to produce summary reports and feed failures into PromptBro (Task 7) for iterative prompt improvement.


---

*Generated by Task Master Research Command*  
*Timestamp: 2025-08-11T15:12:06.617Z*
