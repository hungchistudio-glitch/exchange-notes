import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Set up as described in node_modules/next/dist/docs/01-app/02-guides/
 * testing/vitest.md, with one change: path aliases come from Vite's own
 * `resolve.tsconfigPaths` rather than the vite-tsconfig-paths plugin the
 * guide predates — Vite now resolves tsconfig paths natively and warns when
 * the plugin is present.
 *
 * `include` is narrowed to the tests directory rather than the default
 * whole-project glob, which would otherwise walk .claude/worktrees — full
 * checkouts of this repo — and run every test once per worktree.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
    globals: true,
    restoreMocks: true,
  },
});
