# Cosmic core gestures — local preview only

User selected hold 180ms → slide → release to enter, return/outside to cancel;
quiet press feedback and supported-device haptics; real navigation pending light.
User requires preview before merge. Do not deploy this branch without approval.

Branch: codex/cosmic-core-gestures. Built on the shipped PR #221 implementation.

- useCosmicCoreGesture.ts owns pointer capture, 180ms hold, 12px early-move
  cancellation, visual hit testing, synthetic core-click suppression, and cleanup.
- Existing real links/actions are activated synchronously on pointer release.
- Escape, pointer cancellation, lost capture, window blur and hidden document cancel.
- A single 8ms vibration is attempted when entering another target, only where
  supported, and omitted for reduced motion. iPhone PWA haptics are not promised.
- Link-local useLinkStatus reports actual pending navigation to the core. No
  cosmetic timer delays navigation or makes instant cached routes appear slow.
- The preview now uses real Next navigation between view query values, while
  search remains an explicitly labelled demonstration. Five-language help updated.

Checks: 33 targeted tests passed (gesture, integration, disclosure, font size).
Touch hardware gesture fidelity and haptic behavior still need user device testing.

Final local verification: touched-file ESLint passed; production webpack build
and its TypeScript check passed. Browser verified tap expansion, held-core release
cancellation, and real Next navigation with rail collapse. Continuous hold-slide
is covered by simulated pointer tests, not yet a physical iPhone test.
Preview: http://127.0.0.1:3057/cosmic-dock-review (preview-mode production server).
No merge or deployment performed for this iteration.

## Reading fade (user approved, still local preview only)
Collapsed core fades with downward scrolling over 120px to 35% opacity.
Upward scroll, pointer contact/hover or keyboard focus restores it; idle restores
it after 700ms. Open/dragging/pending states stay fully visible. Uses the actual
[data-app-scroll-viewport] in the protected app and window in review; unrelated
panel scrolls are ignored. No per-scroll React state updates. Reduced motion
removes the opacity transition. Review page has extra scroll room.
Typecheck and changed-file lint passed; 38 tests across 5 targeted files passed.
Reading-fade production webpack build passed. Browser observed intermediate
opacity during downward scroll, full opacity after idle and on expansion;
console error list empty. Local preview server restarted on port 3057.

## Precision obsidian comparison (preview only)
User selected thin metal rim, recessed lens, one ice-cyan arc; horizontal rail
with moving label/selection light; reading fade also dims the light without
changing the 54px core/hit target. Review has five-language Original / Precision
comparison buttons. `design="precision"` is opt-in: production callers still
use `original`. No change to ProtectedNav or Standard mode. Await visual approval
before making the precision design the production default.
Precision iteration verified: 39 tests / 5 files passed, touched-file ESLint,
TypeScript and production webpack build passed. Browser confirmed original/new
switch, expanded label and core rendering; no console errors. Screenshot:
cosmic-precision-preview.png. Local server uses the refreshed build on 3057.

## Release authorization
User approved debugging, merging and production release after reviewing the
precision comparison. Precision is now the Cosmic component default; the review
retains an explicit original comparison. Standard navigation is unchanged.

## Rewrite and release (Claude, 2026-10-30)
Chi asked for the precision core to be finished "以更高級的程式", and for the
ice-cyan arc to turn toward the key in reach. Codex's uncommitted work above
was the design and behaviour; the code was rewritten on branch
`cosmic-core-precision`. Codex's checkout was left untouched. Do not merge
`codex/cosmic-core-gestures` over this.

- `CosmicCoreNavigation.tsx`: readable, documented; one `CoreKey` per key
  (fixes React's missing-key warning from the Link's children); the name
  label is `aria-hidden` (it was `role="status"`, so VoiceOver read every
  key the finger crossed); the arc's bearing is measured from the laid-out
  rail and written to `--arc-turn` (rest 180deg, swung back on the side it
  came from).
- `CosmicCoreNavigation.module.css`: precision first, with its geometry as
  custom properties; the original design is overrides for the review only;
  one reduced-motion block.
- `useCosmicCoreGesture.ts`: one `stop()` for every way a gesture ends;
  named thresholds (`HOLD_MS`, slop, haptic).
- `useCosmicCoreScrollFade.ts`: paints `--core-opacity` at most once a
  frame (it wrote on every scroll event).
- Tests rewritten readably, with new cases for the arc, the silent label,
  one paint per frame and no React warnings.
- Filmed with real mouse input in headless Chrome: bearings -26 (Home),
  -66 (Vocabulary), 66 (Settings), rest 180/-180; hold-slide-lift navigates;
  reading rests at 0.35; no console errors.
- Still unverified: hold-and-slide and haptics on a physical iPhone.
