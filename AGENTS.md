<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Exchange Notes: where to start

A language-learning PWA built on Next.js 16 (App Router, Turbopack), React 19,
Supabase (auth and Postgres) and Vercel. The app teaches five languages
everywhere: `en`, `zh-TW`, `es`, `fr`, `it`. Production is
https://exchange-notes-app.vercel.app, and **merging to `main` deploys it**.
There is no staging.

The comments in this codebase explain *why* at length. The header of the file
you land in usually answers the question you came with, so read it before
searching further.

| Area | Start at |
| --- | --- |
| Signed-in app | `app/(protected)/layout.tsx`: the only auth gate (`requireUser`), the onboarding redirect, and every provider |
| Public pages | `app/(public)/`: landing `/` and `/login` |
| Session refresh, legacy-host redirect | `proxy.ts` → `lib/supabase/proxy.ts`. This is Next 16's middleware; it refreshes sessions and never authorizes. |
| Sign-in (Google) | `components/auth/GoogleIdentityButton.tsx`, `app/auth/{callback,google}/route.ts`, `lib/auth/`. Their header comments explain the popup and redirect flows. |
| Supabase clients | `lib/supabase/{client,server,proxy,service}.ts` |
| Translations, language table | `lib/i18n/`, `lib/languages.ts` (see `lib/i18n/AGENTS.md`) |
| Device preferences (language, mode, font size) | Cookies read on the server: `lib/appPreferences.ts`, `lib/preferences/` |
| Yumi in 3D, the shop | `lib/yumi3d/`, `lib/shop/` (each has an `AGENTS.md`) |
| Hangyumi (Hangman with Yumi) | `lib/hangyumi/` (rules, server calls, studio), `supabase/hangyumi/` (the drafted word bank, which no page may import), `scripts/hangyumi-seed.mjs` |
| Yumi Wordvault (Hangyumi's twin), the games hub | `components/hangyumi/HangyumiGame.tsx` plays both (`game="wordvault"`); `lib/wordvault/` (the walk-to-the-chest timeline, its studio), `components/wordvault/`, `components/games/` (`/games`, the one way in from Home). Same server functions, so the 333 a day is shared. Its streak chests (4th word medium, 7th premium) are decided in `private.hangyumi_guess` (`*_wordvault_chests_and_mythic_pieces.sql`), never in the page. |
| Database | `supabase/migrations/`. Read its `README.md` before writing a migration. |
| Service worker | `public/sw.js`. It never caches pages or `/api`. |
| iOS wrapper and widget | `native/apple/` (see below) |
| Development-only review screens | `app/*-review/`, guarded by `lib/reviewRoutes.ts` |
| Tests | `tests/`: flat, vitest with jsdom. `tests/setup.ts` primes the dictionaries and IndexedDB. |

## Next 16 docs this repo leans on

All are under `node_modules/next/dist/docs/01-app/`:

- `03-api-reference/03-file-conventions/proxy.md`: `proxy.ts` replaces `middleware.ts`.
- `03-api-reference/03-file-conventions/route.md`: route handlers.
- `01-getting-started/05-server-and-client-components.md`: the server/client boundary. Constants exported from a `"use client"` file reach a server component as client references, not values.
- `02-guides/preventing-flash-before-hydration.md`: why theme and mode are rendered from cookies on the server.
- `02-guides/upgrading/version-16.md`: async `params`, `searchParams` and `cookies()`, and `data-scroll-behavior`.

## Verifying a change

Follow the `verify` skill: `.claude/skills/verify/SKILL.md` (Codex finds it
through `.agents/skills/verify/`). At minimum, before pushing:
`npx tsc --noEmit`, `npx eslint .`, `npx vitest run` and `npx next build`.
CI does not run the build, and only the build type-checks `tests/`.

## Notes that apply to one directory

Read these before working there. Claude Code loads each automatically through
the `CLAUDE.md` next to it; Codex does not, so open them yourself.

- `lib/i18n/AGENTS.md`: five dictionaries, the language table and its Swift twin
- `lib/yumi3d/AGENTS.md`: outfit builders, disposal while compiling, thumbnails, measuring jank
- `lib/shop/AGENTS.md`: the database enforces prices, which are multiples of three
- `supabase/migrations/README.md`: filename versions, `apply_migration` drift, two-phase changes

## Working in this checkout

- Other agents may be editing the same checkout on your branch. Stage files by
  name, never `git add -A`, and expect rows in `git status` that are not yours.
- Never merge to `main` or run `vercel --prod` without the user's explicit
  go-ahead.

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
