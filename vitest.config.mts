import { fileURLToPath } from "node:url";

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
    alias: {
      /*
       * `server-only` exists to make the *bundler* fail when a server module
       * is pulled into a client one. There is no bundler here and no client
       * boundary to protect, so it resolves to nothing — without this, any
       * test that touches a server module fails on the import rather than on
       * anything it was trying to check.
       */
      /*
       * fileURLToPath, not `.pathname`. A file: URL percent-encodes, and this
       * checkout lives under "Desktop/exchange notes" — so `.pathname` handed
       * Vite ".../exchange%20notes/..." and the alias silently resolved to a
       * file that does not exist. Nothing noticed, because until now no test
       * imported a module marked server-only; the first one to try failed on
       * "Failed to resolve import server-only" rather than on anything it was
       * checking.
       */
      "server-only": fileURLToPath(
        new URL("./tests/serverOnlyStub.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
    globals: true,
    restoreMocks: true,
  },
});
