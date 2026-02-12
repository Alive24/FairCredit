import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "tests/unit/**/*.test.{ts,tsx}",
      "tests/integration/**/*.test.{ts,tsx}",
    ],
    exclude: ["tests/e2e/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
