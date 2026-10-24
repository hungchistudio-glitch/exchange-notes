---
name: verify
description: How to verify a change to Exchange Notes before saying it works, committing, pushing or merging. Covers which checks CI runs and which it skips (next build, Swift), fast targeted runs while iterating, measured timings, telling machine-load flakes from regressions, checking UI without being able to sign in, migrations, and what merging to main does. Use after every edit you intend to keep.
---

# Verifying a change

CI (`.github/workflows/checks.yml`) runs `npx tsc --noEmit`, `npm run lint` and
`npm test`, and nothing else. Vercel builds every push. Some failures show up in
neither, so this file says what to run yourself.

Timings were measured on 2026-10-18 on the development Mac with a light load.
Under heavy load they can double.

## 1. While iterating (seconds)

```bash
npx tsc --noEmit                      # ~8s. Run it first, every time.
npx eslint <changed dirs or files>    # ~6s
npx vitest run tests/<file>.test.ts   # ~4–5s per file
```

- Tests live flat in `tests/` and are named after the feature
  (`yumiStation33`, `googleRedirectSignIn`, `vocabularyLanguageFill`). Find the
  ones that cover your change with `grep -rl "<module path or export>" tests`,
  or `ls tests | grep -i <feature>`.
- After a rebase or merge, run `tsc` before anything else. Conflicts here are
  usually semantic: a signature changed on one side and a new caller arrived on
  the other, with no textual overlap for git to flag.

## 2. Before committing or pushing (all four)

```bash
npx tsc --noEmit
npx eslint .        # ~45s. Must report 0 errors; ~12 old warnings are not yours.
npx vitest run      # ~2.5–3 min, ~250 files, ~2,000 tests
npx next build      # ~20s with a warm cache, longer cold
```

- **Why `next build` matters even though CI skips it:** `tsconfig.json`
  includes `tests/**`, and vitest does not type-check. A type error in a
  *test* passes every CI check and then fails the Vercel deployment.
- `next build` rewrites `next-env.d.ts`. Run `git checkout next-env.d.ts`
  rather than committing that churn.
- `npm run build` also copies MediaPipe's wasm first. `npx next build` is fine
  once `public/mediapipe/` exists.

## 3. Extra gates that apply only to some changes

| You touched | Also run |
| --- | --- |
| `native/apple/**`, or anything the widget reads | `npm run test:native-personal` (~2 min). CI never compiles Swift. |
| `lib/languages.ts` | `tests/yumiWidgetLanguages.test.ts`. It compares the table with its hand-kept Swift twin, `native/apple/ExchangeNotesApple/Shared/YumiWidgetLanguage.swift`. |
| Scriptable widget output | `npm run test:widget` |
| Shop items or prices | `tests/yumiShopCatalog.test.ts` plus a migration. Prices are enforced by the database (see `lib/shop/AGENTS.md`). |
| `supabase/migrations/**` | Follow `supabase/migrations/README.md` (version rename after `apply_migration`, two-phase changes). |
| A new translation key | `tests/i18n.test.ts`. `tsc` already lists every dictionary missing it. |

## 4. Flaky or slow tests

- A `Test timed out in 5000ms` in a full run is usually machine load from other
  agents, not your change. Check `uptime`. Rerun that file alone. If the load
  average is high, rerun the suite with `npx vitest run --maxWorkers=4`.
- `tests/vocabularyListVirtualised.test.tsx` takes ~15s by design and is the
  first to time out under load.
- **"Vitest caught N unhandled errors" fails CI even when every test passed.**
  The usual cause is a timer or listener in a test that fires after the
  test's document was torn down. Clear timers in `afterEach`.
- **A test that fails in some full runs but never alone, and fast (not a
  timeout), is usually reading the screen before React's next update.** Run
  `npm run test:late-react` (~3 min): it makes React's scheduler late on
  purpose, so those fail every time. The fix is to wait for the second
  condition (`waitFor`, `findBy…`, or waiting for a key to be enabled
  before clicking it), not to read it the moment the first one passes.
  Keep it green after writing a component test.

## 5. Checking UI

- **You cannot sign in.** Signing in means Google OAuth. Every page under
  `app/(protected)/` redirects a signed-out visitor to `/login`. To see that
  UI:
  - Use the review screens `app/*-review/`. They are open only in development,
    or on preview deployments, via `lib/reviewRoutes.ts`.
  - Or add a throwaway `app/dev-<thing>/page.tsx` harness and delete it before
    committing.
- **Google sign-in works only on registered origins:** the production alias
  and `http://localhost:3000`. Per-deployment `*.vercel.app` URLs fail with
  `origin_mismatch`. Port 3100 is not registered either.
- **A browser that has opened a signed-in page may run stale code.** The
  service worker (`public/sw.js`) serves `/_next/static/` cache-first, and
  the dev server does not always change those filenames between edits. If
  an edit doesn't show up, unregister the worker and delete the
  `exchange-notes-v5` cache in that browser, then reload:
  `(await navigator.serviceWorker.getRegistrations()).forEach(r => r.unregister())`.
- **To review the tour's cards without signing in,** use
  `/standard-home-review?frame=1`. It mounts the coach as if on `/home`; set
  `yumi-coach-step` (and `yumi-coach-track`) in localStorage and reload.
- **Use a production build for anything about timing.** The dev server's
  first cold paint takes several seconds. Run `npx next build && npx next start`.
  Measure in a separate headless Chrome over CDP with its own `--user-data-dir`:
  `--headless=new --remote-debugging-port=<port> --use-angle=metal --enable-gpu --ignore-gpu-blocklist`.
- **Claude Code desktop only:**
  - The Browser pane reads its dev-server configs from the *workspace's*
    `.claude/launch.json` (`~/Desktop/exchange notes/.claude/launch.json`:
    `dev` :3000, `preview` :3100 = `next start`, and `perf` :3200 =
    `next start` with `VERCEL_ENV=preview`, which opens the review screens).
    The repo's own `.claude/launch.json` is not the one it reads.
  - A hidden pane suspends requestAnimationFrame, scroll, IntersectionObserver,
    ResizeObserver and media playback. Read DOM state there; never time
    anything in it.

## 6. Shipping

- **Merging to `main` deploys production.** The Vercel git integration does
  it; there is no staging. Never merge without the user's explicit go-ahead,
  and never run `vercel --prod`.
- Wait for CI with `gh pr checks <n> --watch --interval 20`.
- Confirm what production is running:
  `curl -s https://exchange-notes-app.vercel.app/api/version`
  returns the deployed commit SHA.
- **Check external configuration yourself before merging code that depends on
  it** (OAuth redirect URIs, Supabase settings, Vercel env vars). For a Google
  redirect URI:
  ```bash
  curl -s -o /dev/null -w "%{redirect_url}" "https://accounts.google.com/o/oauth2/v2/auth?client_id=<id>&redirect_uri=<url-encoded>&response_type=id_token&scope=openid%20email&nonce=x&response_mode=form_post"
  ```
  A redirect to `/signin/oauth/error` means the URI is not registered.
- If a deploy breaks something, `npx vercel rollback <deployment-url> --yes`
  restores the previous production build in seconds.
- Other agents may be editing this checkout on your branch. Stage files by
  name, never `git add -A`, and read `git status --short` before committing.
