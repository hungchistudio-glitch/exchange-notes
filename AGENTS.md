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
| Hangyumi (Hangman with Yumi) | `lib/hangyumi/` (rules, server calls, studio), `supabase/hangyumi/` (the drafted word bank, which no page may import), `scripts/hangyumi-seed.mjs`. Every third word won unlocks one of 24 Nightscale pieces (`lib/shop/nightscaleCollection.ts`, `reward_pool = 'nightscale'`), decided in `private.hangyumi_guess` (`*_hangyumi_nightscale.sql`; `supabase/tests/nightscale.sql` checks it). They are a tribute told in symbols only: **no name, likeness, quotation, team or brand, in any language** (`tests/yumiNightscale.test.ts` holds that). A piece unlocked in any game is shown whole by one reveal, `components/starweaver/RelicReveal.tsx`, after its stage sends it out (`present`/`onPresented` on Hangyumi's and Wordvault's stages; Starweaver's gate has its own); the page sets `present` only from a guess, so a reload never replays it. In Yumi Cosmic all three studios are at night (each studio's `cosmic` option, read by `hooks/useCosmicMode.ts`; Chi, 2026-11-12); a mode switch builds the studio again where the round stands. |
| Yumi Wordvault (Hangyumi's twin), the games hub | `components/hangyumi/HangyumiGame.tsx` plays both (`game="wordvault"`); `lib/wordvault/` (the walk-to-the-chest timeline, its studio), `components/wordvault/`, `components/games/` (`/games`, the one way in from Home: three cards in one layout and each game's colours, each with its own way in, and a progress row read from `public.games_progress` through `lib/games/progress.ts`, which only reads). Same server functions, so the 333 a day is shared. Its streak chests (4th word medium, 7th premium) are decided in `private.hangyumi_guess` (`*_wordvault_chests_and_mythic_pieces.sql`; since `*_wordvault_chest_full_worth.sql` a chest pays the word's whole worth, paid today or not), never in the page. |
| Yumi Starweaver (the third word game) | Same screen, `game="starweaver"`: `components/starweaver/`, `lib/shop/starweaverCollection.ts` (17 relics). Every seventh word won brings back an unowned relic, decided in `private.hangyumi_guess` (`*_starweaver.sql`), never in the page. Limited pieces carry `yumi_shop_items.reward_pool` (`mythic_vault` or `starweaver`): **draw from one pool by name, never by `limited`**, or one game hands out the other's pieces. `supabase/tests/starweaver.sql` checks it (rolls back). The screen's liquid light for a right or wrong guess, and the one sweep each game comes in on (`lib/starweaver/liquid.ts`, `components/starweaver/LiquidFlow.tsx`), plays in all three games, each in its own colours; each stage marks itself `data-liquid-stage` and calls `onArrived` when the page may lay out its keys. |
| The sea that listens (any microphone) | `components/voice/VoiceSea.tsx`, `lib/voice/sea.ts` (the shader), `lib/voice/signal.ts` (what it hears). While the voice search or the Pronunciation Lab's Speak listens, a liquid sea wells up from the bottom of the screen, its swells moved by the voice's loudness and low band and its ripples by the high band; pearl and honey by day, aurora in Yumi Cosmic (Chi, 2026-11-12). Whoever meters writes `voiceSignal` every frame; the surfaces only pass a phase. The library's dictation meters the microphone only on a computer: on a phone a second listener would silence the recogniser, so each word it hears is a pulse instead (`speechPulse`). Reduced motion or no WebGL: a still glow. |
| Yumi's halo on the vocabulary page, and the way into a feature | `components/vocabulary/pet/YumiOrbitMenu.tsx`, `lib/pet/commandHalo.ts` (stations, and the ignition: two sparks light the keys as they pass). A tapped key flies to its page and lands on `components/features/FeatureMark` beside the title (`lib/motion/featureFlight.ts`; Chi, 2026-11-12: Yumi 領航). While `html[data-feature-flight]` is set, RouteStage brings the page in by fading only. A page Yumi's halo leads to keeps a `FeatureMark` (`data-feature-mark`) on its title, or the key flies into the middle of the screen instead. |
| Yumi Cosmic's material and motion | `app/cosmic.css`: one obsidian palette for every Cosmic page (panel `#101820`, hairline `#34444e`, ink `#e4ecee`, ice `#b8e8e5`; Chi, 2026-11-12). Name a new surface there, never a raw hex in a rule. `.ob-edge` is the liquid-metal bead on a panel's top edge (scroll-driven). `.settings-choice` and `[data-liquid-option]` rows arrive as droplets. A page arrives under a rising liquid (`lib/motion/liquidArrival.ts`, played by RouteStage in Cosmic). A Standard slab drawn `bg-black text-white` turns pale in Cosmic; give it `.ob-slab` (obsidian) and its one action `.ob-key` (ice hairline). |
| Page headings | `components/foundation/layout/PageTitle.tsx`: the one heading every main page wears (Review, the Lab, Messages, Notes, Discover, Settings; Chi, 2026-11-13). `AppHeader` is for screens one level down (a note, Settings' sub-pages). |
| The tour | `components/tutorial/TutorialCoach.tsx` (the steps) and `lib/home/tutorialCoach.ts` (`COACH_EDITION`). A step names one thing on a real screen and lights it by a `data-coach-target`. A new feature worth teaching gets a step with `since` set to the next edition, and the edition goes up: readers who finished an earlier one are shown only the steps newer than theirs. |
| Database | `supabase/migrations/`. Read its `README.md` before writing a migration. |
| Service worker | `public/sw.js`. It never caches `/api`, public pages or RSC payloads; since 2026-11-10 it keeps the signed-in app's pages so the app opens with no signal (refreshed at most daily, cleared on sign-out). A kept copy is marked, and what the server rendered into it (account settings, learning pair) is read again rather than applied: `isKeptPage()` in `hooks/useOnline.ts`. |
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
CI does not run the build. Its `tsc --noEmit` type-checks `tests/` too
(`tsconfig.json` includes every `.ts`), but on a fresh checkout, so only the
build checks Next's generated route types (`.next/types/validator.ts`: each
page's, layout's and route handler's exports).

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
