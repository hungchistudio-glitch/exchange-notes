---
name: verify
description: How to verify a change to Exchange Notes before saying it works, committing, pushing or merging. Covers which checks CI skips (next build, Swift), targeted runs, timings, flakes, UI checks without signing in, migrations, and what merging to main does. Use after every edit you intend to keep.
---

# Verifying a change

The instructions live in one place so Claude Code and Codex follow the same
ones. Read and follow `.claude/skills/verify/SKILL.md` at the repository root.

In short, before pushing run:

```bash
npx tsc --noEmit
npx eslint .
npx vitest run
npx next build   # CI does not run it, and only the build type-checks tests/
```

Merging to `main` deploys production.
