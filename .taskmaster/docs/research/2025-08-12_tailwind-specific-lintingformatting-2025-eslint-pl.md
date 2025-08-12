---
title: Research Session
query: "Tailwind-specific linting/formatting (2025): eslint-plugin-tailwindcss, stylelint-config-tailwindcss, Prettier Tailwind class sorter plugin. Pros/cons."
date: 8/12/2025
time: 11:28:50 AM
timestamp: 2025-08-12T08:28:50.063Z
exchanges: 1
---

# Research Session

## Initial Query

**Question:** Tailwind-specific linting/formatting (2025): eslint-plugin-tailwindcss, stylelint-config-tailwindcss, Prettier Tailwind class sorter plugin. Pros/cons.

**Response:**

Below is an up‑to‑date (2025) guide to Tailwind-specific linting and formatting across three widely used tools: eslint-plugin-tailwindcss, stylelint-config-tailwindcss, and prettier-plugin-tailwindcss (Tailwind class sorter). It covers what each does, how they overlap, recommended settings for a Next.js + Tailwind + shadcn/ui stack like this project, and the pros/cons you should weigh. I’ve included concrete config snippets you can paste into this repo, and notes on pitfalls that commonly affect components, CVA, clsx/cn helpers, and dynamic class names used across your Landing, Hub, Scale, and PromptBro pages.

Executive summary and recommendations
- Use prettier-plugin-tailwindcss as the canonical class orderer. Let Prettier handle ordering everywhere it can (string literals, template literals, clsx/cn/cva, MDX).
- Use eslint-plugin-tailwindcss for correctness and hygiene (typos, contradictions, invalid arbitrary values). Disable its class-order rule to avoid conflict with Prettier.
- Use stylelint-config-tailwindcss only if you have non-trivial CSS files (global.css, tokens, component layers). If the project is utility-heavy with minimal CSS (typical shadcn/ui + Tailwind), you can skip Stylelint or keep a minimal config.
- Add tailwind-merge (twMerge) at runtime for deduplication in dynamic class composition (especially with CVA and conditional clsx), because neither Prettier nor ESLint remove duplicates at runtime.
- Editor/CI: run Prettier on save and in CI; ESLint for TypeScript + Tailwind rules in CI; optionally Stylelint for CSS only.

What each tool does (and does not do)
1) prettier-plugin-tailwindcss (official Tailwind Labs)
- What it does: Sorts Tailwind classes into Tailwind’s recommended canonical order. Works in:
  - className attributes in JSX/TSX
  - template literals backticks
  - strings inside functions like clsx, classnames, cva (configurable via tailwindFunctions)
  - MDX and many other languages Prettier supports
- What it doesn’t: It does not remove duplicates, detect typos, or validate whether a class exists. It won’t reconcile contradictory classes (p-2 vs p-4).
- Why you want it: Stable, readable diffs; team consistency; automatic correction on save and in pre-commit. This is the single best UX win for Tailwind projects.
- Edge notes: In Prettier v3+, you must explicitly list the plugin in your Prettier config. If you use multiple Prettier plugins, list Tailwind’s last to ensure it runs after others.

2) eslint-plugin-tailwindcss
- What it does: Lints Tailwind usage inside JS/TS/TSX/MDX:
  - no-contradicting-classname: flags mutually exclusive classes (e.g., p-2 with p-4, flex with inline-flex) in the same spot
  - no-custom-classname: optionally flags classes not present in your Tailwind config (often too strict for mixed ecosystems)
  - no-arbitrary-value and arbitrary variants validation: flags malformed arbitrary values like bg-[#12G] or bracket errors
  - enforces-shorthand: recommends shorthand classes (mx-2 instead of ml-2 mr-2)
  - migration rules and general sanity checks
- What it doesn’t: Format or reorder classes. This should be offloaded to Prettier.
- Why you want it: It catches real bugs and future production glitches caused by typos or contradictory utilities—especially valuable in fast-moving UI work like your landing page graph and 3D sections where classes get iterated quickly.
- Edge notes: Configure callees so it recognizes custom utility wrappers (cn) and cva. Disable class order rules if using Prettier to avoid churn.

3) stylelint-config-tailwindcss
- What it does: Makes Stylelint Tailwind-aware for CSS files that use @tailwind, @apply, theme(), screen(), and arbitrary variants. Prevents false positives (unknown at-rules) and provides a sane baseline when you have real CSS layers.
- What it doesn’t: Touch class names inside JS/TS/TSX, or reorder Tailwind utilities. This is for .css/.pcss files only.
- Why you might want it: If you customize shadcn/ui tokens, or use @layer components/utilities, or keep typography prose tweaks, stylelint helps maintain CSS quality. If your CSS is near-zero and you stick to utilities, it might be overkill.
- Tailwind v4 note: Works with both v3 and v4; verify the version pairing if/when you move to v4 (since v4 changed internal pipeline) but the config has kept pace and primarily relaxes rules around Tailwind directives/functions.

Pros and cons at a glance
- prettier-plugin-tailwindcss
  - Pros: Deterministic class ordering; no behavior changes; ubiquitous editor support; lowest friction. Big reduction in diff noise.
  - Cons: Can’t dedupe or validate; if string equality tests rely on manual class order (rare), your tests may need updating. Sorting across complex template literals is best-effort: it won’t cross variable boundaries.
- eslint-plugin-tailwindcss
  - Pros: Catches typos and contradictions that would ship broken UI; helps with arbitrary value correctness; integrates cleanly with your existing ESLint flow.
  - Cons: Adds lint time; can false-positive when classes are dynamic, computed, or from third-party libs. no-custom-classname is often too strict with shadcn/ui or library classes—keep it off or scoped.
- stylelint-config-tailwindcss
  - Pros: If you have meaningful CSS layers, this prevents annoying Stylelint errors around @tailwind/@apply and lets you keep normal CSS hygiene.
  - Cons: Extra tool and config. Many Tailwind apps can do without it. If used, focus it only on .css files to keep it fast.

Recommended setup for this project (Next.js App Router + Tailwind + shadcn/ui)
- Summary:
  - Prettier: Install prettier and prettier-plugin-tailwindcss; make Tailwind plugin last; add tailwindFunctions for cn/clsx/cva used by shadcn/ui.
  - ESLint: Use Next.js/TypeScript ESLint config plus eslint-plugin-tailwindcss. Disable its class order rules; enable contradictions/typos; teach it about cn/clsx/cva.
  - Stylelint: Optional—only if you maintain non-trivial CSS layers (global.css, tokens). If you do, add stylelint-config-tailwindcss with minimal rules.

Install
- pnpm add -D prettier prettier-plugin-tailwindcss eslint eslint-plugin-tailwindcss
- Optional (CSS-heavy codebases): pnpm add -D stylelint stylelint-config-standard stylelint-config-tailwindcss
- Optional runtime class deduper: pnpm add tailwind-merge

Prettier config (prettier.config.mjs)
Note: Prettier v3+, plugin listed explicitly and last. Add tailwindFunctions to catch cn/clsx/cva strings.
export default {
  semi: true,
  singleQuote: true,
  printWidth: 100,
  trailingComma: 'all',
  plugins: [
    // other prettier plugins here (if any)
    'prettier-plugin-tailwindcss',
  ],
  tailwindFunctions: ['clsx', 'classnames', 'cn', 'cva'],
};

ESLint (flat config; eslint.config.mjs)
This assumes Next.js + TypeScript. If you still use .eslintrc, translate accordingly. Disable class order in ESLint to avoid conflict with Prettier.
import js from '@eslint/js';
import next from 'eslint-config-next';
import ts from 'typescript-eslint';
import tailwind from 'eslint-plugin-tailwindcss';

export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  next,
  {
    plugins: {
      tailwindcss: tailwind,
    },
    settings: {
      tailwindcss: {
        // Point to your Tailwind config file; works for v3 or v4 config filenames
        config: 'tailwind.config.ts',
        // Recognize our class composing helpers:
        callees: ['clsx', 'classnames', 'cn', 'cva'],
        // Detect class attributes in JSX and other frameworks
        classRegex: '^(class(Name)?|tw)$',
      },
    },
    rules: {
      // Let Prettier sort classes
      'tailwindcss/classnames-order': 'off',
      // Quality rules worth keeping
      'tailwindcss/no-custom-classname': 'off', // noisy with shadcn/ui or third-party
      'tailwindcss/no-contradicting-classname': 'warn',
      'tailwindcss/enforces-shorthand': 'warn',
      'tailwindcss/no-arbitrary-value': 'off', // often used legitimately; turn on if you want stricter control
      // General ESLint best practices as you already have
    },
    ignores: [
      'node_modules',
      '.next',
      'dist',
      // generated scripts or artifacts if any
    ],
  },
];

Optional: Stylelint (stylelint.config.mjs)
Use only if you write enough CSS to justify it (e.g., global layers, theme tokens, prose tune-ups).
export default {
  extends: [
    'stylelint-config-standard',
    'stylelint-config-tailwindcss',
  ],
  rules: {
    // keep minimal—Prettier formats; Stylelint lints
  },
  ignoreFiles: [
    '**/*.js',
    '**/*.ts',
    '**/*.tsx',
    '**/*.jsx',
    '**/*.mdx',
    '.next/**',
    'node_modules/**',
  ],
};
Run with "stylelint \"**/*.{css,pcss,scss}\"" to scope to CSS only.

Runtime duplicate and conflict handling (twMerge)
- Why: Formatting and linting won’t remove logical conflicts at runtime, especially with conditional classes. Adding tailwind-merge helps deduplicate and resolve conflicts correctly when composing classes programmatically (e.g., CVA variants).
- Usage:
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
export const cn = (...inputs) => twMerge(clsx(inputs));

- With shadcn/ui, many templates already recommend this cn helper. Keep Prettier and ESLint pointed at cn to sort/validate within its arguments.

Pitfalls and edge cases to watch
- Dynamic template literals: Prettier sorts only within a given literal segment. It won’t cross boundaries like `bg-${color}-500`. ESLint also can’t validate computed pieces. Prefer enumerating small sets of classes in code branches when practical.
- cva() patterns: The Prettier plugin can sort in cva() if tailwindFunctions includes 'cva'. It will sort base, variants’ class strings, and compoundVariants class strings where they are plain strings. For arrays of strings, sorting is per string element, not across elements. ESLint may struggle to detect contradictions across dynamic variant combinations—twMerge at runtime is the safety net.
- Conflicts between ESLint class order and Prettier: Don’t enable tailwindcss/classnames-order if you use Prettier plugin; it will create noisy diffs.
- no-custom-classname rule: With shadcn/ui, Radix, or react-force-graph, you’ll use non-Tailwind class names and data-state selectors; this rule will flag them. Keep it off, or scope it only to files where you truly want enforcement.
- Performance: eslint-plugin-tailwindcss resolves your Tailwind config and can slow down linting in large repos. Speed tips:
  - Apply the Tailwind plugin only to files that can contain classes (overrides for .tsx/.jsx/.mdx).
  - Use ESLint’s cache in CI and local.
  - Exclude generated files and heavy directories.
- Arbitrary values and variants: Both tools understand modern arbitrary syntax (e.g., [--var:...] or [grid-template-columns:...] and variant groups like group-data-[state=open]:flex). Still, malformed brackets will slip through if they’re computed—prefer explicit strings for complex cases.

CI and editor integration
- VS Code: Enable “Format on Save” and use the Prettier extension. Since Prettier v3 does not auto-load plugins, ensure your prettier.config.mjs is in the repo root and lists the Tailwind plugin.
- Pre-commit with lint-staged (optional):
  - "lint-staged": {
      "*.{js,jsx,ts,tsx,md,mdx}": ["prettier --write"],
      "*.{ts,tsx,js,jsx}": ["eslint --fix"],
      "*.{css,pcss,scss}": ["stylelint --fix"] // only if using stylelint
    }
- CI scripts:
  - "lint": "eslint ."
  - "format:check": "prettier . --check"
  - "stylelint": "stylelint \"**/*.{css,pcss,scss}\"" (optional)

Applying to current tasks
- Task 4 (Landing page with 3D + node graph):
  - You’ll iterate fast on hero and graph UI. Prettier sorting keeps diffs tiny when you reorder utilities for spacing/typography. ESLint will catch contradictions like simultaneous overflow-hidden/auto or conflicting flex utilities that creep in during experimentation.
  - Tooltips and hover states often use peer/group variants; Prettier’s sorter keeps variant chains consistent, improving maintainability.
- Task 5 (Hub), Task 6 (Scale), Task 7 (PromptBro):
  - Forms and wizards with conditional states are fertile ground for conditional classes and CVA. Use cn = twMerge(clsx(...)) to prevent duplicate/conflicting variants at runtime. Prettier sorts and ESLint validates your base/variant strings so they don’t drift.
  - For MDX docs or marketing copy (if added later), Prettier plugin also sorts classes inline.

Version and compatibility notes (2025)
- Prettier v3+ with prettier-plugin-tailwindcss v0.6.x (or latest). Ensure the plugin is explicitly configured.
- eslint-plugin-tailwindcss: Use a 4.x+ version that supports Tailwind v3/v4 arbitrary variants and JIT features. Confirm settings.config path matches your Tailwind config file (ts/js).
- stylelint-config-tailwindcss: Use the latest with Stylelint v16+. If upgrading to Tailwind v4, keep this updated; it mainly disables false-positive rules around Tailwind directives and functions and remains low-maintenance.

Decision guide: do you need Stylelint here?
- Choose Stylelint if:
  - You actively author CSS layers (@layer components/utilities/base), theme tokens, or you apply @apply extensively to consolidate utilities for design system primitives (common in shadcn/ui customization).
  - You want guardrails for CSS best practices beyond formatting.
- Probably skip Stylelint if:
  - You stick to utilities without meaningful CSS files (global.css only with @tailwind base/components/utilities and minimal resets).
  - You want to minimize tooling overhead.

Bottom line
- Mandatory: Prettier + prettier-plugin-tailwindcss, ESLint + eslint-plugin-tailwindcss (with class order rules off).
- Optional: Stylelint with stylelint-config-tailwindcss, if and only if you’re maintaining CSS layers beyond trivial globals.
- Add twMerge in your cn helper to resolve duplicates at runtime in dynamic compositions.

If you want, I can open PR-ready files for this repo: prettier.config.mjs, eslint.config.mjs, optional stylelint.config.mjs, and a utils/cn.ts using twMerge+clsx.


---

*Generated by Task Master Research Command*  
*Timestamp: 2025-08-12T08:28:50.063Z*
