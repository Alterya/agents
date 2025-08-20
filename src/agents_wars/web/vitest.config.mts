import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      app: path.resolve(__dirname, "./app"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["node_modules/**", "**/e2e/**", ".next/**"],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
    },
    globals: true,
  },
});


