import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Claude Code scaffolding: `.claude/worktrees/**` holds full checkouts of
    // this repo, so linting it re-reports every finding once per worktree.
    ".claude/**",
    // MediaPipe's WebAssembly runtime, copied out of node_modules at build
    // time (scripts/copy-mediapipe-wasm.mjs). Third-party generated code:
    // linting it reported 10 errors and failed every Checks run from 751fca9,
    // where it was committed by mistake.
    "public/mediapipe/**",
  ]),
]);

export default eslintConfig;
