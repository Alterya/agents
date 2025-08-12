/* eslint-env node */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: [
    "@typescript-eslint",
    "react",
    "react-hooks",
    "jsx-a11y",
    "import-x",
    "tailwindcss"
  ],
  extends: [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:import-x/recommended",
    "plugin:tailwindcss/recommended",
    "eslint-config-prettier"
  ],
  settings: {
    react: { version: "detect" },
    "import-x/resolver": {
      typescript: { project: ["./tsconfig.json"] }
    }
  },
  rules: {
    "tailwindcss/no-contradicting-classname": "error"
  },
  ignorePatterns: [".next", "dist", "coverage", "prisma/generated"]
};


