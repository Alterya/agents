---
title: Research Session
query: "Formatters for JS/TS/JSON/MD/CSS/Tailwind (2025): Prettier + prettier-plugin-tailwindcss, vs Biome formatter; stylelint for CSS with Tailwind plugin. Recommendations for Next.js projects."
date: 8/12/2025
time: 11:18:11 AM
timestamp: 2025-08-12T08:18:11.703Z
exchanges: 1
---

# Research Session

## Initial Query

**Question:** Formatters for JS/TS/JSON/MD/CSS/Tailwind (2025): Prettier + prettier-plugin-tailwindcss, vs Biome formatter; stylelint for CSS with Tailwind plugin. Recommendations for Next.js projects.

**Response:**

Executive summary (2025-ready)
- If you use Tailwind classes in JSX/TSX/MDX, prefer Prettier + prettier-plugin-tailwindcss for formatting. It’s the most reliable way to auto-sort Tailwind classes across all file types you’ll touch in a Next.js app.
- Keep a linter. For Next.js specifically, the safest linter stack remains ESLint with eslint-config-next, plus eslint-plugin-tailwindcss for extra Tailwind checks. You can keep this lightweight and non-overlapping with Prettier.
- Use Stylelint for CSS/SCSS with stylelint-config-tailwindcss to understand Tailwind at-rules (@tailwind, @apply) and avoid false positives. Let Prettier format CSS; let Stylelint lint it.
- Biome is excellent for speed and a unified binary, but as of late 2024 it can’t replace Prettier+prettier-plugin-tailwindcss for sorting Tailwind classes in JSX/TSX/MDX; and it doesn’t provide Next-specific ESLint rules. Consider Biome only if you’re willing to:
  - a) give up automatic Tailwind class sorting in components, or
  - b) run both Biome and ESLint (Next rules only), or
  - c) keep Prettier to format just where you need Tailwind sorting (MDX/HTML) and let Biome format JS/TS only (adds complexity).

Why this matters for your Next.js + Tailwind project
- Your codebase (API routes, pages, shadcn/ui components, Prisma models) will have Tailwind classes embedded in JSX/TSX and possibly MDX. The only stable, battle‑tested auto-sorting solution across JSX/TSX/MDX/HTML is prettier-plugin-tailwindcss.
- You’ll likely also write some CSS (utilities, overrides, or component-level styles). Prettier formats CSS consistently; Stylelint catches real CSS issues, enforces conventions, and understands Tailwind’s @apply and @layer when using stylelint-config-tailwindcss.
- Next.js ships with strong ESLint rules via eslint-config-next that catch framework-specific pitfalls (e.g., usage of next/image vs img, next/link usage patterns). Biome does not replicate these rules today. If you drop ESLint entirely, you’ll lose those guardrails.

Decision matrix: Prettier + plugin vs Biome formatter
- Language coverage
  - Prettier 3: JS/TS/JSX/TSX, JSON/JSONC, CSS/SCSS, HTML, Markdown, MDX. First-class Tailwind class sorting with prettier-plugin-tailwindcss across JSX/TSX/HTML/MDX.
  - Biome (as of late 2024): JS/TS/JSX/TSX and JSON/JSONC formatting is production-ready and very fast. CSS/Markdown support has lagged or been limited/experimental; MDX/Tailwind class sorting is not provided. Confirm current status before adopting as formatter for those file types.
- Tailwind class sorting in components
  - Prettier + prettier-plugin-tailwindcss: best-in-class, widely adopted, works in JSX/TSX and MDX.
  - Biome: no equivalent class sorter; mixing formatters on the same file types is risky (format “tug of war”).
- Framework-aware rules
  - ESLint + eslint-config-next provides Next-specific linting that saves real bugs and enforces best practices.
  - Biome does not (yet) provide Next-specific plugin parity.
- Speed and simplicity
  - Biome’s single-binary speed is excellent for large monorepos; for a typical Next app, the difference is less critical. Prettier’s performance is normally acceptable with on-save formatting and lint-staged.

Recommended setups for this project
Preset A (most stable for Next.js + Tailwind)
- Formatting: Prettier 3 + prettier-plugin-tailwindcss for JS/TS/JSX/TSX/MD/MDX/JSON/CSS/HTML.
- Linting: ESLint with eslint-config-next and eslint-plugin-tailwindcss. Keep rules modest and non-formatting; let Prettier own formatting.
- CSS linting: Stylelint with stylelint-config-standard and stylelint-config-tailwindcss.
- Type safety: tsc --noEmit in CI for type-checking. ESLint/Biome are not replacements for type checks.

Preset B (performance-lean, still Tailwind-friendly)
- Formatting: Prettier 3 + prettier-plugin-tailwindcss (as above).
- Linting: Biome linter for generic JS/TS rules plus a minimal ESLint run only for Next-specific rules. This reduces ESLint’s surface area but keeps key framework checks. You’ll run two linters, but with minimal overlap.
- CSS linting: Stylelint as above.
- Caveat: Editor/CI wiring is slightly more complex.

Preset C (Biome-only formatting/linting)
- Only consider if you do not need automatic Tailwind class sorting in JSX/TSX/MDX or can live with a separate class sorter. You’ll lose Prettier’s Tailwind class sorting, and you won’t have Next ESLint rules. Not recommended for Tailwind-heavy Next.js apps.

Concrete, ready-to-copy configuration (Preset A)
1) Dependencies
- Prettier + Tailwind plugin
  - npm i -D prettier prettier-plugin-tailwindcss
- ESLint (Next + Tailwind)
  - npm i -D eslint eslint-config-next eslint-plugin-tailwindcss
- Stylelint
  - npm i -D stylelint stylelint-config-standard stylelint-config-tailwindcss stylelint-order

2) Prettier config (prettier.config.cjs)
module.exports = {
  // Keep it minimal; Prettier’s defaults are good in 2025
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  plugins: ['prettier-plugin-tailwindcss'],
  // Optional: ensure MDX formatting consistency
  overrides: [
    { files: '*.mdx', options: { proseWrap: 'preserve' } },
    // Use json-stringify for package.json for stable formatting (no key sorting)
    { files: 'package.json', options: { parser: 'json-stringify' } },
  ],
};

3) .prettierignore
.next
dist
coverage
node_modules
.prisma
prisma/generated
public/**/*.min.{js,css}
**/*.snap
**/*.gen.*
// ensure we don’t format built or vendor files

4) ESLint config (eslint.config.js – flat config, ESLint v9+)
import nextPlugin from 'eslint-plugin-next';
import tailwindPlugin from 'eslint-plugin-tailwindcss';

export default [
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ignores: [
      '.next/**',
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'prisma/generated/**',
    ],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        project: ['./tsconfig.json'],
      },
    },
    plugins: {
      next: nextPlugin,
      tailwindcss: tailwindPlugin,
    },
    settings: {
      next: { rootDir: ['.'] },
      // Tailwind plugin settings to detect classnames inside common helpers:
      tailwindcss: {
        callees: ['clsx', 'cn', 'cva', 'classnames'],
      },
    },
    rules: {
      // Next best practices
      ...nextPlugin.configs['core-web-vitals'].rules,
      // Tailwind linting – rely on Prettier for sorting, leave plugin to catch mistakes
      'tailwindcss/no-custom-classname': 'off', // avoid false positives with shadcn/ui
      'tailwindcss/no-contradicting-classname': 'warn',
      // Avoid style conflicts with Prettier
      'no-mixed-spaces-and-tabs': 'off',
      'no-unexpected-multiline': 'off',
    },
  },
];

Notes:
- If you prefer legacy .eslintrc.cjs, extend 'next/core-web-vitals' and add 'plugin:tailwindcss/recommended', then disable formatting rules.
- Avoid eslint-plugin-prettier to prevent on-the-fly formatting in ESLint; let Prettier run separately.

5) Stylelint config (stylelint.config.cjs)
module.exports = {
  extends: [
    'stylelint-config-standard',
    'stylelint-config-tailwindcss', // enables Tailwind at-rules support
  ],
  plugins: ['stylelint-order'],
  rules: {
    // Delegate formatting to Prettier; keep structural rules here
    'color-hex-length': 'short',
    'order/properties-alphabetical-order': null, // let Prettier handle whitespace; ordering is stylistic
    'no-empty-source': null,
    // Accept Tailwind’s @apply and nested directives
    'at-rule-no-unknown': null,
  },
  ignoreFiles: [
    '**/*.js',
    '**/*.jsx',
    '**/*.ts',
    '**/*.tsx',
    'node_modules/**',
    '.next/**',
    'dist/**',
  ],
};

6) VS Code settings (.vscode/settings.json)
{
  "editor.formatOnSave": true,
  "[javascript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[typescript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[javascriptreact]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[typescriptreact]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[css]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[json]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[markdown]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[mdx]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  // Tailwind IntelliSense
  "tailwindCSS.experimental.classRegex": [
    "clsx\\(([^)]*)\\)",
    "cn\\(([^)]*)\\)",
    "cva\\(([^)]*)\\)"
  ]
}

7) Scripts (package.json)
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint": "next lint",
    "lint:css": "stylelint \"**/*.{css,scss,pcss}\"",
    "lint:css:fix": "stylelint \"**/*.{css,scss,pcss}\" --fix",
    "typecheck": "tsc --noEmit",
    // Prisma files are formatted by Prisma itself
    "db:format": "prisma format"
  }
}

8) Pre-commit with lint-staged (optional)
- npm i -D lint-staged husky
- npx husky init
- .husky/pre-commit:
npx lint-staged
- package.json:
"lint-staged": {
  "*.{js,jsx,ts,tsx,md,mdx,css,scss,json}": "prettier --write",
  "*.{js,jsx,ts,tsx}": "eslint --fix",
  "*.{css,scss}": "stylelint --fix"
}

Alternate wiring with Biome (Preset B)
- Keep Prettier as above for formatting (to retain Tailwind class sorting).
- Add Biome for fast linting of JS/TS only:
  - npm i -D @biomejs/biome
- .biome.jsonc
{
  "$schema": "https://biomejs.dev/schemas/1.7.0.json",
  "files": {
    "ignore": [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "prisma/generated/**"
    ]
  },
  "linter": {
    "rules": {
      "recommended": true,
      // Avoid conflicts with Next and Tailwind plugin (handled by ESLint)
      "style": { "useSingleQuotes": "off" },
      "complexity": { "noUselessFragments": "warn" }
    }
  },
  "formatter": {
    "enabled": false // let Prettier do all formatting
  }
}
- Scripts
{
  "scripts": {
    "lint:biome": "biome lint --apply .",
    "lint:next": "next lint",
    "lint": "pnpm lint:biome && pnpm lint:next"
  }
}
- In lint-staged:
"*.{js,jsx,ts,tsx}": ["biome lint --apply --unsafe", "eslint --fix"]

Notes:
- Disable Biome’s formatter to avoid fighting Prettier; set editors to use Prettier for format-on-save.
- Restrict ESLint to only Next’s config to minimize overlaps. You can also filter ESLint to only run on app/, pages/, and src/app components if desired.

Tailwind-specific tips and pitfalls
- Sorting vs merging: prettier-plugin-tailwindcss sorts classes; it doesn’t “merge” duplicates or conflicting utilities. Keep eslint-plugin-tailwindcss/no-contradicting-classname enabled to detect conflicts like p-2 plus p-4.
- Dynamic classes: For expressions like cn("px-2", isActive && "bg-blue-500"), the Prettier plugin still sorts within static strings; it won’t evaluate runtime branches (expected). Rely on lint rules to catch contradictions; ensure your Tailwind plugin settings include callees like cn, clsx, cva.
- MDX: Prettier will sort class names inside MDX elements, which you’ll likely use in docs or content-driven pages.
- Stylelint and Tailwind: stylelint-config-tailwindcss allows @tailwind and @apply, reducing false positives. If you use CSS Modules, Stylelint works fine; no special casing needed beyond ignoreFiles patterns. If you use SCSS, switch to stylelint-config-standard-scss and keep stylelint-config-tailwindcss in the extends list.
- Prisma formatting: Prisma has its own formatter (prisma format). Keep schema.prisma out of Prettier and run prisma format in CI and pre-commit for consistency.

How this supports your tasks
- Task 1 (DB schema + Prisma): Add "db:format": "prisma format" and ignore prisma/generated in all linters/formatters. Prettier will handle TS repository helpers and seed scripts; ESLint catches basic issues; tsc ensures type safety.
- Task 2 (LLM provider abstraction): With strong formatting and linting, your provider adapters (OpenAI/OpenRouter) remain consistent, and MDX/Markdown docs are formatted. Prettier sorts Tailwind classes in any minimal UI you build for provider testing.
- Task 5/6/7 (Next.js pages: Hub, Scale, PromptBro): Heavy use of Tailwind in JSX/TSX benefits from automatic, consistent class sorting and conflict detection. Stylelint helps when you add custom CSS for shadcn/ui overrides. ESLint with next/core-web-vitals keeps you on the happy path (next/image, next/link, etc.). Pre-commit keeps every PR clean with minimal developer overhead.

CI suggestions
- Add a fast check to your CI:
  - pnpm format:check
  - pnpm lint (ESLint or Biome + ESLint)
  - pnpm lint:css
  - pnpm typecheck
- Fail fast on formatting/lint/type errors; these are deterministic and save reviewer time.

Bottom line
- For a production Next.js + Tailwind project in 2025, Prettier + prettier-plugin-tailwindcss remains the most reliable and least surprising formatter solution across JS/TS/JSX/TSX/MDX/HTML/CSS. Keep ESLint for Next-specific rules and optional Tailwind lint rules, and Stylelint for CSS. Consider Biome only as a linter supplement if you want speed, but avoid using Biome as the formatter in a Tailwind-heavy codebase unless you’re comfortable losing automatic class sorting in components.


---

*Generated by Task Master Research Command*  
*Timestamp: 2025-08-12T08:18:11.703Z*
