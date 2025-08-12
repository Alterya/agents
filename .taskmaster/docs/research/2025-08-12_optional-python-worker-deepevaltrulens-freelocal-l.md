---
title: Research Session
query: "Optional Python worker (DeepEval/TruLens): free/local linters, formatters, test frameworks in 2025: Ruff (linter), Black (formatter), isort, Pytest, coverage.py. Current best practices."
date: 8/12/2025
time: 11:33:43 AM
timestamp: 2025-08-12T08:33:43.473Z
exchanges: 1
---

# Research Session

## Initial Query

**Question:** Optional Python worker (DeepEval/TruLens): free/local linters, formatters, test frameworks in 2025: Ruff (linter), Black (formatter), isort, Pytest, coverage.py. Current best practices.

**Response:**

Below is a pragmatic, 2025-ready Python tooling stack for an optional local worker (e.g., for DeepEval/TruLens evaluations) that stays fully free/local, fast, and low-maintenance. It presents two viable setups—“Ruff-only” (simplest) and “Ruff + Black + isort” (classic)—and shows how to wire everything into a monorepo with your Next.js app, including pre-commit, CI, and test/coverage best practices. I also include concrete config files you can drop into a /workers/python-eval directory and map it back to your project’s Task 3 (background execution) and Task 6 (scale testing) needs.

1) Objectives and scope
- Keep it local and free: no SaaS dependencies. All tools run offline.
- Fast developer feedback: tools that run in <1–2 seconds on typical diffs.
- Unambiguous formatting: zero-style-debate formatting and imports.
- Strong lint coverage with minimal overlap: avoid dueling rules between tools.
- Practical testing and coverage for LLM-heavy flows: mocking, VCR, flaky-guarding, and thresholds that prevent quality regressions.
- Easy monorepo integration: pre-commit hooks, GitHub Actions, and simple commands invoked from the JS app if needed.

2) Recommended stack (2025)
You have two strong choices depending on your team’s preferences:

Option A — Single-tool formatting and import sorting (simplest; my top recommendation)
- Ruff (linter + formatter + import sorter)
  - Why: fastest in class, one binary, fewer configs, actively maintained, replaces isort. As of 2025, Ruff’s formatter is stable for common workflows.
- pytest (+ pytest-cov)
- coverage.py
- mypy (type checking) or pyright (if your repo already has Node and VS Code usage is standard)
  - Mypy still has the best ecosystem integration when you want zero Node dependency. Enable gradually with strictness escalations.
- pre-commit for local enforcement
- nbqa (optional) if you’ll have Jupyter notebooks
- Optional: hypothesis (property-based tests), respx or responses (HTTP mocking), vcrpy (record/replay), pytest-xdist (parallel), pytest-randomly, pytest-timeout

Option B — Classic pairings (conservative, widely known)
- Black (formatter) + isort (imports) + Ruff (linter)
  - Why: Many teams trust Black’s long-stable formatting. If you prefer Black, make isort use profile = "black" and disable Ruff’s E501 to avoid conflicts. Use Ruff for all other rules.

Given your goals and that this is an auxiliary worker, Option A (Ruff-only for formatting/sorting) keeps cognitive load low and CI fast. Below I provide configs for both.

3) Directory structure for an optional Python worker
Place the worker in its own folder to keep Python deps isolated and make CI/API integration straightforward. Example:

- workers/
  - python-eval/
    - pyproject.toml
    - requirements.txt (or uv.lock if using uv)
    - noxfile.py (optional)
    - .pre-commit-config.yaml
    - src/
      - worker/
        - __init__.py
        - main.py
        - evaluation/
          - deval_adapter.py
          - trulens_adapter.py
          - metrics.py
          - summarizer.py
        - providers/
          - llm_stub.py
    - tests/
      - test_metrics.py
      - test_summarizer.py
      - conftest.py
    - .coveragerc (if not using pyproject for coverage)
    - .editorconfig

Integrations to project tasks:
- Task 3: Run Python evaluations in the background from your Next.js routes by invoking the worker via a child process or HTTP. Persist results in your Postgres via the existing APIs (or expose a tiny local HTTP server in the worker).
- Task 6: Use the worker to score/aggregate run outputs across N conversations, then return a structured RunReport and revised prompt text. Unit-test the summarizer prompt builder with pytest to guarantee deterministic structure.

4) Option A configs — Ruff-only (formatter + imports) + pytest + coverage + mypy
Use a single pyproject.toml for nearly everything. Then wire it to pre-commit and CI.

pyproject.toml
[build-system]
requires = ["setuptools", "wheel"]

[project]
name = "python-eval-worker"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
  "pytest>=8.2",
  "pytest-cov>=5.0.0",
  "coverage[toml]>=7.5",
  "mypy>=1.10",
  "types-requests",  # if requests used
  "httpx>=0.27",
  "respx>=0.21.1",   # or responses for requests
  "hypothesis>=6.100.0",  # optional
  "freezegun>=1.5.0",     # optional
  "vcrpy>=6.0.1",         # optional
  "deeval>=0.21.0",       # if using DeepEval (check name)
  "trulens-eval>=0.28.0", # if using TruLens
]

[tool.ruff]
# If using ruff as the formatter+import sorter, do NOT use black or isort.
line-length = 100
target-version = "py311"
select = [
  "F",  # pyflakes
  "E", "W",  # pycodestyle
  "I",  # import sorting (replaces isort)
  "UP", # pyupgrade
  "B",  # flake8-bugbear
  "SIM",# flake8-simplify
  "S",  # flake8-bandit (security)
  "ARG",# flake8-unused-arguments
  "RUF",# ruff-specific
  "PL", # pylint-inspired checks
  "TID",# tidy imports
  "C4", # flake8-comprehensions
  "PIE" # flake8-pie
]
ignore = [
  "S101",  # allow assert in tests
]
# Per-file ignores for tests (e.g., allow prints)
[tool.ruff.per-file-ignores]
"tests/**.py" = ["S", "PLR2004"]  # magic values are okay in tests

[tool.ruff.lint]
# For ruff>=0.5 this may be merged with [tool.ruff]; retain compatibility
preview = true

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
line-ending = "auto"
docstring-code-format = true

[tool.pytest.ini_options]
minversion = "8.0"
addopts = "-q --strict-markers --strict-config --cov=src --cov-report=term-missing --cov-report=xml:coverage.xml --no-header"
testpaths = ["tests"]
xfail_strict = true
filterwarnings = [
  "error::DeprecationWarning",
  "ignore::UserWarning:pkg_resources",
]
markers = [
  "slow: marks tests as slow (deselect with '-m \"not slow\"')",
  "integration: integration tests that may use network or DB",
]

[tool.coverage.run]
branch = true
source = ["src"]
parallel = true
omit = [
  "*/__init__.py",
  "*/_vendor/*",
  "tests/*",
]
[tool.coverage.report]
show_missing = true
skip_covered = true
fail_under = 85
exclude_lines = [
  "if TYPE_CHECKING:",
  "pragma: no cover",
  "if __name__ == .__main__.:",
]
[tool.coverage.xml]
output = "coverage.xml"

[tool.mypy]
python_version = "3.11"
warn_unused_configs = true
warn_redundant_casts = true
warn_return_any = true
warn_unused_ignores = true
disallow_untyped_defs = true
disallow_any_generics = true
no_implicit_optional = true
strict_equality = true
# Gradual adoption: relax tests first
[[tool.mypy.overrides]]
module = "tests.*"
disallow_untyped_defs = false
check_untyped_defs = false

.pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.5.7
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: end-of-file-fixer
      - id: trailing-whitespace
      - id: check-yaml
      - id: check-json

noxfile.py (optional, but useful in CI and locally)
import nox

@nox.session(python=["3.11", "3.12", "3.13"])
def tests(session):
    session.install("-e", ".[dev]") if False else session.install(".")
    session.install("pytest", "pytest-cov")
    session.run("pytest", "-m", "not slow", *session.posargs)

@nox.session()
def lint(session):
    session.install("ruff")
    session.run("ruff", "check", "--fix", ".")
    session.run("ruff", "format", ".")

Quickstart commands
- pre-commit install
- ruff check --fix .
- ruff format .
- pytest
- coverage combine && coverage report

CI notes
- GitHub Actions: cache pip/uv, run ruff (check+format in CI should be check only), run pytest with coverage, upload coverage.xml to CI artifact and/or a coverage gate.

5) Option B configs — Black + isort + Ruff + pytest + coverage + mypy
If you prefer Black’s mature formatter, keep Ruff from fighting it by disabling E501 and letting Black handle line length. Also configure isort to profile = "black".

pyproject.toml
[build-system]
requires = ["setuptools", "wheel"]

[project]
name = "python-eval-worker"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
  "black>=24.8.0",
  "isort>=5.13.2",
  "ruff>=0.5.7",
  "pytest>=8.2",
  "pytest-cov>=5.0.0",
  "coverage[toml]>=7.5",
  "mypy>=1.10",
  "httpx>=0.27",
  "respx>=0.21.1",
  "vcrpy>=6.0.1",
  "freezegun>=1.5.0",
  "hypothesis>=6.100.0",
  "deeval>=0.21.0",
  "trulens-eval>=0.28.0",
]

[tool.black]
line-length = 88
target-version = ["py311"]

[tool.isort]
profile = "black"
line_length = 88
known_first_party = ["worker"]
combine_as_imports = true

[tool.ruff]
line-length = 88
target-version = "py311"
select = [
  "F","E","W","I","UP","B","SIM","S","ARG","RUF","PL","TID","C4","PIE"
]
# Disable line-length (E501) because Black controls it
ignore = ["E501"]
[tool.ruff.per-file-ignores]
"tests/**.py" = ["S", "PLR2004"]

[tool.pytest.ini_options]
minversion = "8.0"
addopts = "-q --strict-markers --strict-config --cov=src --cov-report=term-missing --cov-report=xml:coverage.xml --no-header"
testpaths = ["tests"]
xfail_strict = true

[tool.coverage.run]
branch = true
source = ["src"]
parallel = true
omit = ["*/__init__.py","*/_vendor/*","tests/*"]
[tool.coverage.report]
show_missing = true
skip_covered = true
fail_under = 85
[tool.coverage.xml]
output = "coverage.xml"

[tool.mypy]
python_version = "3.11"
warn_unused_configs = true
disallow_untyped_defs = true
no_implicit_optional = true
strict_equality = true

.pre-commit-config.yaml
repos:
  - repo: https://github.com/psf/black
    rev: 24.8.0
    hooks:
      - id: black
        args: ["--check"]
  - repo: https://github.com/pycqa/isort
    rev: 5.13.2
    hooks:
      - id: isort
        args: ["--check-only"]
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.5.7
    hooks:
      - id: ruff
        args: [--fix]
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: end-of-file-fixer
      - id: trailing-whitespace

Local commands
- pre-commit install
- black .
- isort .
- ruff check --fix .
- pytest

6) Testing best practices for LLM-oriented workers
- Unit tests first; isolate LLMs: stub or fake providers to keep tests deterministic and offline. For httpx, use respx; for requests, use responses. Avoid actual LLM calls in unit tests.
- Record/replay sparingly: If you must hit a real provider during integration tests, gate with -m integration and use vcrpy to record first run; add cassettes to .gitignore or store scrubbed cassettes in-repo with secrets redacted.
- Deterministic summarizer tests: For Task 6, ensure the summarizer prompt builder returns a stable, schema-validated structure. Define a pydantic model and assert .model_validate on outputs. Include snapshot tests using syrupy if desired.
- Parametrize and property-test: Use pytest.mark.parametrize for coverage across agents/models. Hypothesis can fuzz edge cases in data: empty messages, extremely long prompts, Unicode, and non-ASCII tokens.
- Performance and flakiness:
  - Use pytest-xdist for parallel runs locally and in CI.
  - Use pytest-randomly to catch order dependencies.
  - Apply pytest-timeout to fail fast on hangs (common with network).
- Markers and CI filters:
  - Mark slow or integration tests; default CI should run unit tests only.
  - Provide a nightly CI job that runs integration/slow markers if needed.

7) Coverage configuration tips
- Aim for fail-under: 85% to start; adjust by module if necessary.
- Use branch coverage and omit test and vendor folders.
- Combine parallel coverage when using xdist: coverage combine before report.
- Generate Cobertura or XML for CI code-quality dashboards.
- Exclude lines that are not meaningful to cover, e.g., if __name__ == "__main__": and TYPE_CHECKING guards.

8) Type checking guidance (mypy vs pyright)
- mypy:
  - Fully local; no Node needed.
  - Great gradual typing story; enable disallow_untyped_defs progressively.
  - For Pydantic v2, consider mypy plugins if models are heavy.
- pyright:
  - Excellent speed and VS Code integration; requires Node.
  - If your repo already uses Node (it does), pyright is a reasonable choice. Add a basic pyrightconfig.json and run npx pyright in CI.
- Best practice: pick one. If using mypy, add a pre-commit hook and a CI job. If using pyright, add a package.json script in the worker or run via npx in GitHub Actions.

9) Editor and dev experience
- VS Code extensions:
  - Ruff (official) for on-save lint and format: "ruff.lint.enable": true, "ruff.format.enable": true
  - Python extension (for pytest discovery and debugging)
- .editorconfig: enforce indentation and eol across tools.
- Pre-commit: ensures consistent formatting and linting before code lands.
- If using uv (recommended for speed), add a small README:
  - uv venv && uv pip install -e ".[dev]"
  - uv run pytest

10) GitHub Actions CI examples
Minimal CI for Option A (Ruff-only + pytest + coverage)
name: python-worker
on:
  push:
    paths:
      - "workers/python-eval/**"
  pull_request:
    paths:
      - "workers/python-eval/**"
jobs:
  lint-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: workers/python-eval
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"
      - name: Install deps
        run: |
          python -m pip install --upgrade pip
          pip install -e . ruff pytest pytest-cov coverage[toml] mypy
      - name: Lint
        run: |
          ruff check .
          ruff format --check .
      - name: Type check
        run: mypy src
      - name: Test
        run: pytest
      - name: Coverage report
        run: |
          coverage xml
          coverage report
      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: python-worker-coverage
          path: workers/python-eval/coverage.xml

If using Black/isort, add those steps and run their --check variants.

11) Monorepo integration with Next.js tasks
- Running from Node:
  - Add package.json scripts at the repo root to forward to the worker directory:
    - "py:lint": "pnpm --dir workers/python-eval exec ruff check . && pnpm --dir workers/python-eval exec ruff format --check ."
    - "py:test": "pnpm --dir workers/python-eval exec pytest"
  - For Task 3 (background APIs), invoke the worker as a subprocess with a simple CLI:
    - python -m worker.main --input /tmp/job.json --output /tmp/result.json
  - For Task 6 (scale testing), call the worker to compute DeepEval/TruLens metrics across conversations and return aggregated scores and suggested prompt revisions; persist via your existing DB APIs.
- Environment isolation:
  - Use a dedicated virtualenv for the worker. In CI, create it only for the worker path. Avoid polluting the Node build pipeline.
- Data contracts:
  - Define a small JSON schema for inputs/outputs so Next.js routes and the worker agree on fields (e.g., conversations[], metrics[], issues[], revised_prompt).

12) Edge cases and pitfalls to avoid
- Conflicting formatters:
  - If you use Black, do not enable Ruff format or E501; configure isort with profile = "black".
  - If you use Ruff format, do not run Black or isort.
- Line length mismatches:
  - Keep black line-length and ruff line-length the same when using both; or disable E501 in Ruff.
- Import sorting drift:
  - isort can fight with Ruff’s I-rules; use only one of them.
- Flaky tests with LLMs:
  - Never hit real models in unit tests; mark integration tests and run them on-demand or nightly with recorded cassettes.
- Coverage gates that block progress:
  - Start with realistic thresholds (80–85%) and ratchet up; allow lower thresholds on files that wrap I/O-heavy code.
- Type-checking a mixed stack:
  - If using pyright, ensure Node is available in CI. For mypy, install types- packages (e.g., types-requests).

13) Suggested quick-start for your project
- Choose Option A (Ruff-only) unless you have a hard preference for Black.
- Drop the Option A pyproject.toml and pre-commit config into workers/python-eval.
- Run:
  - cd workers/python-eval
  - python -m venv .venv && source .venv/bin/activate
  - pip install -U pip && pip install -e . ruff pytest pytest-cov coverage[toml] mypy pre-commit
  - pre-commit install
  - ruff check --fix . && ruff format .
  - pytest
- Wire CI using the example workflow.
- Add a minimal CLI in worker/main.py for Task 3 and a metrics aggregation entry point for Task 6.

14) Minimal code examples for worker stubs
src/worker/main.py
import json
import sys
from worker.evaluation.summarizer import build_run_report

def main():
    inp = json.load(sys.stdin)
    report = build_run_report(inp["conversations"], inp.get("config", {}))
    json.dump(report, sys.stdout)

if __name__ == "__main__":
    main()

src/worker/evaluation/summarizer.py
from typing import Any, Dict, List

def build_run_report(conversations: List[Dict[str, Any]], config: Dict[str, Any]) -> Dict[str, Any]:
    # summarize failures, issues, and propose a revised prompt
    # deterministic structure for pytest snapshot tests
    return {
        "runs": len(conversations),
        "failures": [],
        "issues": [],
        "revised_prompt": "System: ...",
        "metrics": {},
    }

tests/test_summarizer.py
from worker.evaluation.summarizer import build_run_report

def test_build_run_report_structure():
    out = build_run_report([], {})
    assert set(out.keys()) == {"runs", "failures", "issues", "revised_prompt", "metrics"}
    assert out["runs"] == 0

This scaffolding aligns with Task 6’s “deterministic structure” test strategy and can be extended to integrate DeepEval/TruLens when you need real metrics.

Bottom line
- 2025 best practice for a free/local Python tooling stack is Ruff-centric for speed and simplicity, pytest + coverage.py for tests, and mypy for type safety. If your team prefers Black’s stability, keep Ruff’s E501 off and add isort with profile = "black".
- Enforce via pre-commit locally and GitHub Actions in CI.
- For LLM evaluations, keep tests hermetic, lean on mocks/recordings, and validate deterministic report structures that your Next.js pages (Tasks 3 and 6) will consume.


---

*Generated by Task Master Research Command*  
*Timestamp: 2025-08-12T08:33:43.473Z*
