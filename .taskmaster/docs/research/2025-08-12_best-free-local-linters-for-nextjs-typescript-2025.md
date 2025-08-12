---
title: Research Session
query: "Best free local linters for Next.js + TypeScript (2025): ESLint (next/core-web-vitals), @typescript-eslint, eslint-plugin-import, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-jsx-a11y; alternatives Biome and Oxlint. Pros/cons and ecosystem health."
date: 8/12/2025
time: 11:15:03 AM
timestamp: 2025-08-12T08:15:03.498Z
exchanges: 1
---

# Research Session

## Initial Query

**Question:** Best free local linters for Next.js + TypeScript (2025): ESLint (next/core-web-vitals), @typescript-eslint, eslint-plugin-import, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-jsx-a11y; alternatives Biome and Oxlint. Pros/cons and ecosystem health.

**Response:**

Below is a practical, 2025-ready overview of the best free local linting options for a Next.js + TypeScript codebase, with concrete, copy-pasteable configs and guidance tailored to this project. It covers the mainstream ESLint stack, plus high-performance alternatives Biome and Oxlint, including how to combine them effectively. I also include recommendations specific to our project tasks (Scale Testing, Agent Wars Hub, PromptBro, and shared providers/DB layer) so linting supports reliability, accessibility, and maintainability in our Next.js app.

Executive summary (what to choose)
- Most compatible, feature-complete baseline: ESLint with next/core-web-vitals, @typescript-eslint, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-jsx-a11y, and eslint-plugin-import (or the faster import-x fork). Add eslint-config-prettier to avoid stylistic conflicts with Prettier. This remains the most comprehensive option for Next.js in 2025.
- Fast, modern formatter: Prettier or Biome. If you mainly want a blazingly fast formatter and some basic lint rules, Biome is great. If you need full framework and type-aware linting, keep ESLint; if you want the fastest dev ergonomics, use Biome for formatting and ESLint for lint only.
- Fast linter adjunct: Oxlint can augment or partially replace ESLint for speed on large codebases; it’s excellent for pre-commit. Keep ESLint for Next.js- and type-aware rules.
- Recommendation for this project: Use ESLint baseline + Prettier. Optionally add Oxlint as a pre-commit linter for speed. Consider Biome only as a formatter if the team prefers it over Prettier, but do not replace ESLint unless you accept reduced Next.js and type-aware rule coverage.

What a Next.js + TypeScript project needs from linting
- Framework rules: Next.js-specific best practices (e.g., preventing <img> misuse, Link usage, font/loading and legacy pitfalls). Provided by eslint-config-next’s next/core-web-vitals.
- React correctness: react-hooks and exhaustive-deps, as well as react rules for common pitfalls.
- Accessibility: jsx-a11y to catch a11y regressions in UI (important for /hub and /scale pages).
- TypeScript safety: @typescript-eslint to enforce strictness alongside the TS compiler (e.g., no-floating-promises, restrict-template-expressions, consistent-type-imports).
- Imports hygiene: Enforce resolved paths, sorting, and banned patterns; handle TS path aliases. eslint-plugin-import (or import-x) + eslint-import-resolver-typescript.
- Performance and maintainability: Avoid heavy type-aware lint everywhere; enable typed rules only where needed. Use caching and prettier-integration to prevent duplicate responsibilities.

Option A (recommended baseline): ESLint stack
Packages to install
- Core:
  - eslint
  - eslint-config-next (provides next/core-web-vitals)
- TypeScript:
  - @typescript-eslint/eslint-plugin
  - @typescript-eslint/parser
- React + a11y:
  - eslint-plugin-react
  - eslint-plugin-react-hooks
  - eslint-plugin-jsx-a11y
- Imports:
  - eslint-plugin-import
  - eslint-import-resolver-typescript
  - Optional faster/fresher fork: eslint-plugin-import-x (replace plugin-import)
- Prettier coordination:
  - eslint-config-prettier (turns off stylistic rules in ESLint so Prettier owns formatting)

Flat config (ESLint 9+; preferred)
Create eslint.config.mjs in repo root. This works great with Next.js 13/14 app router and TypeScript.

import next from 'eslint-config-next';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import'; // or 'eslint-plugin-import-x'
import path from 'node:path';
import prettier from 'eslint-config-prettier';

const TS_GLOBS = ['**/*.ts', '**/*.tsx'];
const JS_GLOBS = ['**/*.js', '**/*.jsx', '**/*.cjs', '**/*.mjs'];
const NEXT_SPECIFIC = ['app/**/*.{ts,tsx}', 'pages/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'];

export default [
  // Ignore build artifacts
  {
    ignores: [
      '.next',
      'node_modules',
      'dist',
      'build',
      'coverage',
      'out',
      '.turbo',
      'prisma/generated',
    ],
  },

  // Next.js base + Core Web Vitals
  next.coreWebVitals(),

  // TypeScript + React + A11y + Import rules
  ...tseslint.config({
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        // Enable type-aware rules in specific sub-sets for speed; see overrides below
        projectService: true,
        tsconfigRootDir: path.resolve('.'),
      },
    },
    plugins: {
      react: pluginReact,
      'react-hooks': pluginReactHooks,
      'jsx-a11y': jsxA11y,
      import: importPlugin, // or 'import-x'
    },
    settings: {
      react: { version: 'detect' },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
      'import/resolver': {
        // Support TS path aliases
        typescript: {
          alwaysTryTypes: true,
          project: ['tsconfig.json', 'tsconfig.*.json'],
        },
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
      },
    },
    rules: {
      // General TS
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      // React and Hooks
      'react/jsx-uses-react': 'off', // Next.js automatic runtime
      'react/react-in-jsx-scope': 'off',
      'react/self-closing-comp': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // A11y
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/anchor-is-valid': 'warn',

      // Imports hygiene
      'import/first': 'error',
      'import/no-duplicates': 'error',
      'import/no-mutable-exports': 'error',
      'import/no-unresolved': 'error', // relies on resolver
      'import/no-extraneous-dependencies': [
        'error',
        { devDependencies: ['**/*.test.*', '**/*.spec.*', '**/playwright/**', '**/scripts/**'] },
      ],
      'import/order': [
        'warn',
        {
          'newlines-between': 'always',
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
          alphabetize: { order: 'asc', caseInsensitive: true },
          pathGroups: [
            { pattern: '@/components/**', group: 'internal', position: 'after' },
            { pattern: '@/lib/**', group: 'internal', position: 'after' },
            { pattern: '@/app/**', group: 'internal', position: 'after' },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
        },
      ],

      // Prefer Prettier for style
      // Ensure this is last via eslint-config-prettier in the final export
    },
  }),

  // Type-aware rules only where needed for performance
  {
    files: TS_GLOBS,
    rules: {
      // Enable some stricter type-aware rules (adjust as needed)
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/restrict-template-expressions': [
        'warn',
        { allowNumber: true, allowBoolean: true, allowNullish: true },
      ],
    },
  },

  // Areas where Next rules matter most
  {
    files: NEXT_SPECIFIC,
    rules: {
      // Examples of Next.js rules you likely want enforced:
      // Note: Provided via eslint-config-next; here we nudge severity
      '@next/next/no-img-element': 'error',
      '@next/next/no-sync-scripts': 'warn',
      '@next/next/google-font-display': 'warn',
      '@next/next/no-document-import-in-page': 'error',
      // For app router specifics, Next’s config already accounts for modern APIs.
    },
  },

  // Turn off stylistic rules that conflict with Prettier
  prettier,
];

Legacy .eslintrc (if you cannot adopt flat config)
If your stack still uses .eslintrc.js, here is a compact base:

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: true, // uses tsconfig.json
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'jsx-a11y', 'import'],
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'prettier',
  ],
  settings: {
    react: { version: 'detect' },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: ['tsconfig.json'],
      },
      node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
    },
  },
  rules: {
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    '@typescript-eslint/no-floating-promises': 'error',
    'react/react-in-jsx-scope': 'off',
    'react-hooks/exhaustive-deps': 'warn',
    'import/order': ['warn', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }],
  },
  ignorePatterns: ['.next', 'node_modules', 'dist', 'coverage', 'build', 'prisma/generated'],
};

Prettier integration
- Install: prettier and eslint-config-prettier.
- Use Prettier as a separate formatter (CLI or editor) and let eslint-config-prettier disable conflicting ESLint rules. Avoid eslint-plugin-prettier for performance.
- Example package.json scripts:

{
  "scripts": {
    "lint": "eslint . --cache",
    "lint:fix": "eslint . --fix --cache",
    "format": "prettier . --write",
    "format:check": "prettier . --check"
  }
}

- .prettierignore should mirror .eslintignore: .next, dist, coverage, prisma/generated, etc.

Type-aware performance tips
- Use parserOptions.projectService: true (flat config) to reduce full type-program restarts.
- Scope type-aware rules to a subset of globs or critical directories (lib, server, api). Keep UI components mostly non-type-aware if performance is a concern.
- Create a minimal tsconfig.eslint.json that references only source files (exclude .next, tests/build artifacts) to speed up analysis.
- Run ESLint with --cache in local dev and CI.
- For Next.js, prefer running eslint directly instead of next lint if you’re using flat config; if using next lint, it will pick up eslint-config-next automatically.

Imports and path aliases
- Ensure tsconfig.json has baseUrl and paths set (e.g., "@/*": ["src/*"]).
- Configure eslint-import-resolver-typescript to avoid false positives in import/no-unresolved.
- Consider eslint-plugin-import-x for better maintenance/perf; it’s a community fork with more active updates. If you switch, replace 'import' with 'import-x' in plugins and settings.

Option B: Biome (formatter-first, some lint)
What it is
- Blazing-fast Rust-based formatter and linter (successor to Rome).
- Great for formatting and many general-purpose lint rules. However, as of 2024-10, it lacks TypeScript type-aware linting and framework-specific rules for Next.js.

When to use it
- As a drop-in replacement for Prettier for format speed and import organization.
- If you want one tool for formatting and basic/static linting in pre-commit, while keeping ESLint around for framework and type-aware rules.

Pros
- Very fast (formatter + linter). Excellent developer UX.
- Good defaults; import sorting/organizing built-in.
- Single tool for format+lint can simplify tooling when rules suffice.

Cons
- No type-aware TS rules; cannot replace @typescript-eslint for deeper TS correctness.
- No Next.js-specific rules; cannot replace eslint-config-next for framework pitfalls.
- Coverage gaps vs ESLint plugin ecosystem.

Coexistence with ESLint
- Use Biome only for formatting (and optional basic lint), keep ESLint for Next.js + @typescript-eslint.
- Configure so they don’t step on each other: disable stylistic ESLint rules (via eslint-config-prettier), let Biome own style.

Example biome.json (formatter + safe lint)

{
  "$schema": "https://biomejs.dev/schemas/1.8.0/schema.json",
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": { "noUselessCatch": "warn" },
      "correctness": {
        "noUnusedVariables": "off" // Defer to TS or ESLint @typescript-eslint/no-unused-vars
      },
      "style": {
        "useConst": "warn"
      }
    }
  },
  "files": {
    "ignore": ["node_modules", ".next", "dist", "coverage", "prisma/generated"]
  }
}

Package scripts:

{
  "scripts": {
    "format": "biome format . --write && biome check . --apply --unsafe"
  }
}

Option C: Oxlint (ultra-fast linter)
What it is
- Rust-based linter from the oxc project. Implements many ESLint core and community rules, including React and jsx-a11y subsets; very fast.
- Not type-aware; does not include Next.js-specific rules.

When to use it
- As a fast pre-commit linter to catch many issues quickly.
- In CI as a first-pass linter, followed by ESLint (with type-aware + Next rules) less frequently or only on changed packages.

Pros
- Orders-of-magnitude faster than ESLint on large repos.
- Good coverage of common correctness rules.

Cons
- No Next.js rules; no type-aware TS rules.
- Some rule compatibility gaps vs ESLint; you may still need ESLint.

Example usage
- Install: npm i -D oxlint
- Run: npx oxlint --fix .
- Configure via .oxlintrc.json; keep ignores aligned with ESLint.

Side-by-side strategy (recommended if you want speed)
- Pre-commit: oxlint + prettier/biome for immediate feedback.
- CI: ESLint for full Next/@typescript-eslint rules (can run on changed files or in a nightly workflow to save time).

Ecosystem health and plugin landscape (2024-10 outlook into 2025)
- ESLint: Mature, active. ESLint 9 uses flat config by default; most major plugins have updated exports. Strong ecosystem, best coverage. Safe long-term bet.
- @typescript-eslint: Very active; stable with ESLint 9. Best-in-class for type-aware linting. Continues to invest in performance (projectService, type Checking improvements).
- eslint-config-next: Maintained with Next.js releases; covers app/router-era rules. Critical for framework correctness.
- eslint-plugin-react and react-hooks: Mature. Hooks rules are stable and essential.
- eslint-plugin-jsx-a11y: Actively maintained; critical for accessibility.
- eslint-plugin-import: Still widely used but historically slow to adopt changes; fork eslint-plugin-import-x has been more responsive. Either works; import-x can be a pragmatic improvement.
- Biome: Very active; formatter is production-grade. Linter coverage increases steadily but still not a drop-in replacement for ESLint in framework-heavy TS apps.
- Oxlint: Rapidly improving; rule coverage expanding. Strong for speed-sensitive workflows, but still complementary to ESLint for framework/type-aware needs.

Project-tailored rules and suggestions
Given our tasks (Scale Testing page, Agent Wars Hub, PromptBro, provider abstraction, Prisma models), I recommend:
- Enforce React hooks correctness: react-hooks/rules-of-hooks: error and exhaustive-deps: warn to prevent flaky async state flows in /hub concurrency and /scale orchestration components.
- Strengthen TypeScript promise safety: @typescript-eslint/no-floating-promises and no-misused-promises to ensure provider calls, background jobs, and fetch/polling are properly awaited/handled.
- Next.js-specific rules: @next/next/no-img-element, @next/next/no-sync-scripts, and others in next/core-web-vitals to protect performance. For summary/report pages, these catch obvious pitfalls.
- Accessibility: jsx-a11y recommended rules to keep /scale and /hub UI accessible (especially for Tabs, Buttons, and lists of sessions). Consider additional rules: jsx-a11y/no-autofocus, jsx-a11y/aria-proptypes.
- Imports and boundaries: import/no-extraneous-dependencies with a curated devDependencies whitelist, and import/order to keep codebase tidy. If we establish src layering (app, components, lib, server), consider eslint-plugin-boundaries or a stricter import/order pathGroups to enforce layering.
- Security (optional): For API routes, consider lightweight checks like no eval, no new Function, and guard dangerouslySetInnerHTML usage. eslint-plugin-security-node exists but can be noisy; we can enable a minimal set or rely on TS + code review.
- Testing-friendly: allow devDependencies in test files; add overrides for **/*.test.ts(x) and e2e to avoid import/no-extraneous-dependencies false positives.

Practical implementation steps (now)
1) Install ESLint baseline:

npm i -D eslint eslint-config-next @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y eslint-plugin-import eslint-import-resolver-typescript eslint-config-prettier

2) Add eslint.config.mjs (flat config above), or .eslintrc.js (legacy) if needed.
3) Add .eslintignore:

.next
node_modules
dist
build
coverage
out
prisma/generated

4) Add Prettier:

npm i -D prettier
echo 'node_modules\n.next\ndist\ncoverage\nprisma/generated' > .prettierignore

5) Scripts in package.json:

{
  "scripts": {
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "eslint . --cache",
    "lint:fix": "eslint . --fix --cache",
    "format": "prettier . --write",
    "format:check": "prettier . --check",
    "validate": "npm run typecheck && npm run lint && npm run format:check"
  }
}

6) Optional speed add-ons:
- Oxlint for pre-commit: npm i -D oxlint
  - Add: "lint:fast": "oxlint ."
- Husky + lint-staged:

npm i -D husky lint-staged
npx husky init
# .husky/pre-commit
npx --no-install lint-staged

# package.json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "oxlint --fix",
      "eslint --cache --fix"
    ],
    "*.{md,css,json}": ["prettier --write"]
  }
}

7) Editor integration:
- VS Code: ESLint extension, Prettier extension (or Biome extension if you choose Biome for formatting).
- Set "editor.formatOnSave": true and pick Prettier or Biome as default formatter.
- Enable ESLint’s Auto Fix on Save if preferred: "editor.codeActionsOnSave": { "source.fixAll.eslint": true }.

Pros/cons comparison
- ESLint stack
  - Pros: Best coverage for Next.js; full TypeScript type-aware rules; mature ecosystem; widely documented.
  - Cons: Slow if you enable type-aware rules everywhere; multiple plugins to maintain; flat config migration can be non-trivial.
- Biome
  - Pros: Lightning-fast; excellent formatter; simple config; good base lint rules; import organization built-in.
  - Cons: No type-aware rules; lacks framework-specific Next.js rules; can’t fully replace ESLint for this project’s needs.
- Oxlint
  - Pros: Extremely fast; covers many common pitfalls and React/a11y rules; great for pre-commit/PR linting.
  - Cons: No Next.js-specific rules; no type-aware rules; still needs ESLint for full coverage.

Common pitfalls and how to avoid them
- Duplicate or conflicting style rules: Always include eslint-config-prettier last in ESLint extends/flat array to disable stylistic rules. Do not use eslint-plugin-prettier unless you must run Prettier via ESLint (it’s slower).
- import/no-unresolved false positives with TS paths: Ensure eslint-import-resolver-typescript is installed and configured; align tsconfig paths with resolver project setting.
- ESLint performance with type-aware rules: Scope typed rules to a subset of files (e.g., lib, server, api). Use --cache and projectService. Consider running full typed lint only in CI to keep dev fast.
- Next.js app router specifics: Use eslint-config-next’s latest to ensure correct rules for app/ directory and new APIs; don’t copy legacy page-router rules.

How this supports our project tasks
- Task 5 (Agent Wars Hub) and Task 6 (Scale Testing): React hooks and TS promise rules reduce race conditions with polling and background jobs; Next.js rules protect against Link/image pitfalls and performance regressions on high-update UIs.
- Task 7 (PromptBro wizard): jsx-a11y helps keep multi-step wizard accessible; import/order and consistent-type-imports keep the growing UI code tidy.
- Task 1 (DB/Prisma) and Task 2 (LLM providers): Type-aware rules catch unsafe calls and unhandled promises around provider retries and Prisma IO; lint ignores keep prisma/generated out of lint.
- Testing: With devDependencies exceptions for tests, we avoid friction in unit/integration/e2e test directories.

Bottom line recommendation
- Adopt ESLint baseline with next/core-web-vitals, @typescript-eslint, react, react-hooks, jsx-a11y, and import (or import-x), coordinated with Prettier via eslint-config-prettier. Use flat config if feasible.
- Add Oxlint for pre-commit speed; keep ESLint as the source of truth in CI.
- Consider Biome only as a faster formatter if the team prefers it over Prettier; do not replace ESLint with Biome unless you accept reduced coverage.

If you want, I can open a PR with:
- eslint.config.mjs and .eslintignore
- Prettier setup
- package.json scripts and an optional Husky + lint-staged config
- A small README section documenting when to run which command and how to interpret common rule failures (e.g., exhaustive-deps, no-floating-promises).


---

*Generated by Task Master Research Command*  
*Timestamp: 2025-08-12T08:15:03.498Z*
