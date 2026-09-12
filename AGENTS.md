<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# CI does not build the iOS app

`.github/workflows/checks.yml` runs `tsc`, `eslint` and `vitest`. None of
them read Swift, so nothing in CI notices that `native/apple` has stopped
compiling.

On 2026-09-11 a merge renamed `AudioLanguageStyle`'s cases and three
`YumiWidgetData` accessors, updated some call sites and missed five. The
widget extension could not build, every check was green, and the PR
description said the iOS build passed.

**If a change touches `native/`, run the build before claiming it works:**

```
npm run test:native-personal
```

It generates the project, verifies the deep-link routes, and builds both the
app and the widget extension for the simulator. It takes a couple of minutes
and it is the only thing that will tell you.
