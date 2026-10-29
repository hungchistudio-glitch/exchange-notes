# Cosmic core integration — 2026-10-29

Checkout: `cosmic-core-main`, branch `codex/cosmic-core-main`, base `fb05d88`.
Only Cosmic navigation changes. User approved the integrated design, 280ms fade/down exit, and merge/deployment on 2026-10-29.

## Implementation

- `components/foundation/layout/ProtectedNav.tsx` retains ownership of real
  destinations, unread counts, search-sheet action, and responsive hiding.
- Cosmic renders `CosmicCoreNavigation`; Standard retains `BottomNavigation`.
- The persistent core closes on click, and routeKey also closes on external navigation without remounting. Search executes immediately
  within the click event, preserving keyboard activation on mobile.
- Links remain real Next links with pending feedback and modified-click support.
- Collapse uses inert; Escape restores core focus, outside pointer closes.
- No animation loops or WebGL; CSS transform/opacity transitions respect reduced motion.
- Latest main's hiding for `/games`, `/wordvault`, `/hangyumi`, `/shop` and
  individual conversations is retained.
- `cosmic-dock-review` is a guarded five-language visual harness. Its sample
  search dialog is explicitly a demo, not authenticated lookup.

## Ownership boundary

The old `yumi-main-app` checkout contains unrelated untracked Wordvault drafts
and repository audit documentation. Those remain untouched; none were copied.
Latest main already includes Claude's formal Wordvault changes.

## Verification

Targeted tests: `cosmicCoreNavigation`, `cosmicProtectedNav`,
`bottomNavigationResize` (18 passed). Typecheck and touched-file lint passed.
Full suite, full lint, build and browser status are recorded below when complete.
Physical iPhone PWA behavior must not be claimed from desktop tests.

Latest verification: complete eslint and production webpack build passed.
The first full suite was stopped during heavy machine load (load average 40),
after two Hangyumi timing failures. Its isolated rerun passed all 24 tests.
The earlier retry was interrupted by the session environment reset; its temporary log did not survive.
Final full-suite run: 293 files passed, 1 failed; 2345 tests passed and 2 font-size guards failed.
Both failures identified fixed-pixel typography in the new CSS. Converted all font declarations
to rem, including shorthand and heading clamp limits. Targeted rerun: appFontSize (10),
cosmicCoreNavigation (4), cosmicProtectedNav (8): all 22 passed.
Full suite was not repeated after this CSS-only correction. Complete production build and
touched-file lint passed after the correction. Logs: `cosmic-verification.log`,
`cosmic-build.log`, `cosmic-lint.log` (gitignored).
Production preview runs on port 3056 from this checkout.
Browser: review core opens/closes, search modal opens/closes, French/Traditional
Chinese labels switch, Escape returns focus; console error list empty.
`/home` redirects to login in the current browser. No authenticated end-to-end
navigation or physical iPhone performance claim is made.

## Approved exit animation

Rail fades and sinks 8px over 280ms; central core stays mounted and visible.
No navigation delay. Search opens immediately while the rail closes.
Modified link clicks retain native behavior. Route changes preserve the core DOM
so animations are not cut short. Reduced motion disables transitions.

## Release verification (approved fade behavior)

- Full suite: 294 files, 2349 tests passed.
- Typecheck, complete lint, production webpack build passed.
- Browser confirmed immediate sample destination change and 0.28s rail opacity
  transition; core remains mounted. Authenticated routes and iPhone remain
  outside the browser checks performed here.
- User explicitly authorized merge and production release after debugging.
