<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Exchange Notes: where to start

A language-learning PWA built on Next.js 16 (App Router, Turbopack), React 19,
Supabase (auth and Postgres) and Vercel. The app teaches seven languages
everywhere: `en`, `zh-TW`, `es`, `fr`, `it`, `ja`, `ko` (Japanese and Korean
since 2026-11-16, on both axes: interface and learning). Production is
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
| Japanese and Korean readings (Chi, 2026-11-16) | Furigana over kanji only, a romaji line on word cards (`lib/japanese/kana.ts`, `components/speech/Furigana.tsx`); Korean Revised Romanization and IPA by rule, after the sound changes (`lib/korean/romanize.ts`), one line swapped by ⇄. `SpokenText` draws furigana for any Japanese with kanji unless the interface is Japanese; a word's kana comes through `/api/word-pronunciation` (cache, then one background model; a Japanese row's `ipa` column holds kana), running text sentence by sentence. Which readings show is the reader's, per device: 讀音顯示 in Settings (`lib/preferences/readingDisplay.ts`). CJK faces follow `[lang]` (`--cjk-sans`, `--cjk-serif` in `app/globals.css`) so Japanese kanji are never drawn in Taiwanese glyph forms. Shop pieces' Japanese and Korean names live in `lib/shop/jaKoNames.ts`, joined by id. |
| Device preferences (language, mode, font size) | Cookies read on the server: `lib/appPreferences.ts`, `lib/preferences/` |
| Yumi in 3D, the shop | `lib/yumi3d/`, `lib/shop/` (each has an `AGENTS.md`) |
| Hangyumi (Hangman with Yumi) | `lib/hangyumi/` (rules, server calls, studio), `supabase/hangyumi/` (the drafted word bank, which no page may import), `scripts/hangyumi-seed.mjs`. Every third word won unlocks one of 24 Nightscale pieces (`lib/shop/nightscaleCollection.ts`, `reward_pool = 'nightscale'`), decided in `private.hangyumi_guess` (`*_hangyumi_nightscale.sql`; `supabase/tests/nightscale.sql` checks it). They are a tribute told in symbols only: **no name, likeness, quotation, team or brand, in any language** (`tests/yumiNightscale.test.ts` holds that). A piece unlocked in any game is shown whole by one reveal, `components/starweaver/RelicReveal.tsx`, after its stage sends it out (`present`/`onPresented` on Hangyumi's and Wordvault's stages; Starweaver's gate has its own); the page sets `present` only from a guess, so a reload never replays it. In Yumi Cosmic all three studios are at night (each studio's `cosmic` option, read by `hooks/useCosmicMode.ts`; Chi, 2026-11-12); a mode switch builds the studio again where the round stands. |
| Yumi Wordvault (Hangyumi's twin), the games hub | `components/hangyumi/HangyumiGame.tsx` plays both (`game="wordvault"`); `lib/wordvault/` (the walk-to-the-chest timeline, its studio), `components/wordvault/`, `components/games/` (`/games`, the one way in from Home: three cards in one layout and each game's colours, each with its own way in, and a progress row read from `public.games_progress` through `lib/games/progress.ts`, which only reads). Same server functions, so the 333 a day is shared. Its streak chests (4th word medium, 7th premium) are decided in `private.hangyumi_guess` (`*_wordvault_chests_and_mythic_pieces.sql`; since `*_wordvault_chest_full_worth.sql` a chest pays the word's whole worth, paid today or not), never in the page. |
| Yumi Starweaver (the third word game) | Same screen, `game="starweaver"`: `components/starweaver/`, `lib/shop/starweaverCollection.ts` (17 relics). Every seventh word won brings back an unowned relic, decided in `private.hangyumi_guess` (`*_starweaver.sql`), never in the page. Limited pieces carry `yumi_shop_items.reward_pool` (`mythic_vault` or `starweaver`): **draw from one pool by name, never by `limited`**, or one game hands out the other's pieces. `supabase/tests/starweaver.sql` checks it (rolls back). The screen's liquid light for a right or wrong guess, and the one sweep each game comes in on (`lib/starweaver/liquid.ts`, `components/starweaver/LiquidFlow.tsx`), plays in all three games, each in its own colours; each stage marks itself `data-liquid-stage` and calls `onArrived` when the page may lay out its keys. |
| The sea that listens (any microphone) | `components/voice/VoiceSea.tsx`, `lib/voice/sea.ts` (the shader), `lib/voice/signal.ts` (what it hears). While the voice search or the Pronunciation Lab's Speak listens, a liquid sea wells up from the bottom of the screen, its swells moved by the voice's loudness and low band and its ripples by the high band; pearl and honey by day, aurora in Yumi Cosmic (Chi, 2026-11-12). Whoever meters writes `voiceSignal` every frame; the surfaces only pass a phase. The library's dictation meters the microphone only on a computer: on a phone a second listener would silence the recogniser, so each word it hears is a pulse instead (`speechPulse`). Reduced motion or no WebGL: a still glow. |
| Yumi's halo on the vocabulary page, and the way into a feature | `components/vocabulary/pet/YumiOrbitMenu.tsx`, `lib/pet/commandHalo.ts` (stations, and the ignition: two sparks light the keys as they pass). A tapped key flies to its page and lands on `components/features/FeatureMark` beside the title (`lib/motion/featureFlight.ts`; Chi, 2026-11-12: Yumi 領航). While `html[data-feature-flight]` is set, RouteStage brings the page in by fading only. A page Yumi's halo leads to keeps a `FeatureMark` (`data-feature-mark`) on its title, or the key flies into the middle of the screen instead. |
| Yumi Cosmic's material and motion | `app/cosmic.css`: one obsidian palette for every Cosmic page (panel `#101820`, hairline `#34444e`, ink `#e4ecee`, ice `#b8e8e5`; Chi, 2026-11-12). Name a new surface there, never a raw hex in a rule. `.ob-edge` is the liquid-metal bead on a panel's top edge (scroll-driven). `.settings-choice` rows arrive as droplets. A Cosmic page arrives through a warp of starlight and switches on under a scan line, its `[data-liquid-option]` rows sliding in (`lib/motion/warpArrival.ts`, played by RouteStage; Chi, 2026-11-14: 先躍遷再組裝; it was a rising liquid); in Standard it settles under a lamp's light passing down the screen (`playLampArrival` in `lib/motion/pageArrival.ts`; Chi, 2026-11-13). A Standard slab drawn `bg-black text-white` turns pale in Cosmic; give it `.ob-slab` (obsidian) and its one action `.ob-key` (ice hairline). |
| The sci-fi HUD (both modes) | `app/hud.css` (Chi, 2026-11-14: 更科幻風格). `.ob-edge` and `.hud-panel` panels are cut at two corners with ice brackets in Cosmic and carry four fine brackets in Standard; give a new main card `.hud-panel`. `.hud-figure` is for a measured number only (never a sentence), `.hud-led` a status light (`data-state="alert"` blinks amber), `.hud-radar` the home's radar (CommandDeck; a floor pad in YumiHomeStage). A page's title decodes on arrival (`decodeTitle`, from `data-title-text` in PageTitle). Cosmic only: the star field (`body::after`, with `isolation` on body so it shows) and a word card arriving as a hologram (`data-holo`, `data-holo-word`). Interface sounds are `lib/sound/interfaceSounds.ts`, on by default in Cosmic and off in Standard, switched per device in Settings; the games keep their own. |
| Speaker keys and the word they light | `components/speech/Spoken.tsx` (`SpeakKey`, `SpokenText`, `SpokenReading`, `WordByWordSwitch`) over `lib/spokenWords.ts` (Chi, 2026-11-14: 念到哪亮到哪, on every speaker). A new speaker is a `SpeakKey` (▶, ■ while it plays) and its text a `SpokenText` with the same text and speech tag, never a bare `speak()`. A Chinese word on its own lights a character at a time with its zhuyin (`SpokenReading`); a tapped word reads on from there (`tapToStart` only where the text is not inside something tappable); one word-by-word switch serves the whole app. A key that keeps its own state passes `onCancel`, which fires when another key takes over. Quizzes (Minimal pairs, the heteronym quiz) are deliberately not lit: the light would give the answer away. A test that mocks `@/lib/speech` must spread the original (`importOriginal`). |
| Daily news sources | `lib/news/sources.ts` (the twelve slots), `lib/dailyNews.ts`, `lib/news/rss.ts`. Seven slots read the Guardian's API (`GUARDIAN_API_KEY`, a free key the Guardian **deletes at ninety days unless its owner answers its email**); when it refuses the key or none is set, each reads the Guardian's public feed instead (`GUARDIAN_FEEDS`; Chi, 2026-11-15), with shorter excerpts. The owner, `NEWS_OWNER_USER_ID`, sees a line in Settings while that is so (`/api/news/source-health`); nobody else does. A night is several runs of `/api/cron/daily-news` (`catchUpDailyNews`): Supabase's `daily-news-catch-up` every half hour 20:00–23:30 UTC and Vercel's cron at 20:00 as a backstop, each asking only for what the night lacks up to twelve, the missing categories first (Chi, 2026-11-15). A refused batch gives up at once (`secondAsk: false`) for the next run to retry. The Taiwan slot reads Focus Taiwan (CNA's English feed) after the Guardian, which covers Taiwan about once a week or two and had never filled it (2026-11-16). The service client (`lib/supabase/service.ts`) sends a request again when Supabase answers "JWT issued at future", a moment's clock skew between its gateway and the database. |
| Study tools (2026-11-15) | Five pieces Chi chose: **listening mode** `/listen` (`components/listen/ListenMode.tsx`, `lib/listen/playlist.ts`: due words then news, one run each through `playSpoken`, Wake Lock and Media Session); **kept words glowing in the news** (`lib/vocabulary/knownWords.ts`, `hooks/useKnownWords.ts`, SpokenText's `marks` and `onLongPressWord`, which opens the lookup sheet); the **weak-spot radar** on the review page (`lib/review/weakSpots.ts`, `components/review/WeakSpotRadar.tsx`, a `weak` review mode); the **star map** of the library (`lib/vocabulary/starMap.ts`, `components/vocabulary/VocabularyStarMap.tsx`, loaded on demand from the word-count line); the **weekly recap** `/recap` (`lib/recap/weekly.ts`, `components/recap/WeeklyRecap.tsx`; the reader's own 3D Yumi, turnable, the week's word chosen or picked for them, and milestones offered once on the review page, `lib/recap/milestones.ts`). Anything that may render outside the signed-in providers reads `useOptionalVocabulary` / `useOptionalLexiconSearchSheet`. |
| Shared cards (recap, a word sent with Yumi) | One instrument look for both (Chi, 2026-11-15: 儀表 HUD, following the mode): `lib/share/hud.ts` draws it (grid, frame, reticle, cut panels, QR plate; mono only for figures and codes), `lib/recap/shareCard.ts` and `lib/hello/shareImage.ts` lay out each card in 9:16 and 1:1, and `components/share/ShareStudio.tsx` makes the picture ahead of the tap (a phone's share sheet opens only straight from one), shows it, and records a video of Yumi's one full turn (six seconds, even speed, ending at the angle it began, so it loops). Yumi comes from `Yumi3DFigure`'s `cameraRef` (draw, then read her canvas in the same task) and `onLive`. The recap's QR adds the reader as a friend; a hello's opens the hello. The hello page (`components/hello/Hello.module.css`) wears the same look, in the hello's own mode. |
| Page headings | `components/foundation/layout/PageTitle.tsx`: the one heading every page wears, a sub-screen's included (Chi, 2026-11-13; 2026-11-15: 字體及大小統一). `AppHeader` is now PageTitle with a way back. Every title is a `TitleText`, which runs its letters into place each time it mounts (a page change, the first page opened, a title that arrives with its data), so no page can miss it; the themed signs (games, shop) keep their look and use `TitleText clipped`, which gilds the scramble. A new page uses PageTitle; a heading that cannot uses `PAGE_TITLE_CLASS` and `TitleText`. Full-screen tools (camera, chat room, pocket lookup) have none on purpose. |
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
