# Saved-word reward displayed as +0

The Nov 23 report was a rendering regression introduced with the Nov 22
rolling-number animation. The user confirmed that the existing reward remains
**3 capsules per first saved word**, once per account/language/normalized word.

## Evidence

- Read-only production inspection found the reported save credited with amount
  3 at the screenshot's timestamp, then acknowledged by the reward observer.
- All 31 save credits in the preceding two days had amount 3. The three credited
  accounts' wardrobe balances matched their ledger sums.
- The live saved-word trigger still pays 3 after inserting a new durable word
  identity. The identity survives deletion. No database changes or compensation
  credits are needed for this display bug.
- `insertVocabulary` announces successful online saves; the offline synchronizer
  announces successfully sent mutations. `EnergyRewardObserver` queries only
  committed positive credits, acknowledges them and dispatches the landed event.
  The shop reads its wallet again on that event.

## Cause and fix

`EnergyReward.module.css` applied `.text span` to **every descendant span**.
This included RollingNumber's digit strip. Its caption animation ends at
`transform: none` with `fill-mode: both`, which overrides the strip's translated
position indefinitely. A requested 3 therefore visibly remained 0. The same
rule also shrank the amount to the caption's 12px font and muted its colour.

Scope both caption rules to `.text > span`. The direct caption keeps its
entrance animation; the amount inherits its intended 20px bold styling and its
digit strips keep their own transforms. The counting and capsule animations
remain intact in both modes. Reward rules and balances are unchanged.

## Browser regression check

Use a temporary local-only page rendering the real `EnergyReward` with replay
buttons for 3, 6 and 33. Do not commit this harness or use real saves to test it.
At a 390px mobile viewport, after the count settles but before the toast leaves:

1. For each strip (`style` contains `--digit`), read its computed transform's Y
   offset and its first child's height. `round(-offset / height)` must equal the
   intended digit; strip `animation-name` must be `none`.
2. Repeat in Standard and Yumi Cosmic, with and without reduced motion.
3. Verify the amount's inherited font size is 20px, not the caption's 12px.
4. Temporarily restore the old descendant caption rule: a requested 3 must
   reproduce a visible 0. Remove the override and replay: it must display 3.

All 12 corrected combinations passed in local Chrome, and the old rule
reproduced the bug. Screenshots were also visually inspected. This is a CSS
animation bug: jsdom assertions finding `+3` only read the screen-reader text
and cannot prove the visible wheels are positioned correctly. No authenticated
browser save was performed; production credit and balance checks were read-only.

## Motion review (changed rules only)

| Before | After | Why |
| --- | --- | --- |
| Caption entrance also animates every odometer span | Only the direct caption animates | Restores the digit transform and removes redundant blur/opacity animations from nested spans. |
| Reduced-motion override targets all nested spans | Override targets the caption it owns | RollingNumber retains its own reduced-motion handling; both modes passed the browser check. |

Approve this scoped fix: no new timing, curves, layout animation, frame-by-frame
React updates or compositor layers. Existing celebratory motion is preserved.
Validation covers correctness in desktop Chrome at a mobile viewport, not a
real-phone frame-rate measurement.

## Release checks

- `npx tsc --noEmit` and `npx eslint .`: passed.
- Full Vitest run: 350 files / 2,967 tests passed; six additional workers timed
  out before starting. Retried those six files plus `yumiShopEnergy.test.tsx`
  with `--maxWorkers=1`: all 7 files / 57 tests passed, no unhandled errors.
- `npx next build`: passed after removing the deleted temporary harness's stale
  `.next/dev` type cache. No harness is included in the release.
