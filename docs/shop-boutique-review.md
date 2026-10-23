# Station 33 boutique — local review

## Approved direction

The existing three series become Earth Keepsakes / Orbital Atelier / Deep Space Treasures (繁中：地球拾光／軌道工坊／深空珍藏). Their stable IDs, membership, prices and ownership are unchanged. Counts are separate from names: 127 / 36 / 57.

Standard uses warm paper, brass and enamel; Cosmic uses dark surfaces and warm gold. The existing shared 3D Yumi and all wearable builders remain in use.

## Interaction

- A working three-stop star chart filters the actual catalogue, while preserving country, body-part and owned-only filters. Selecting the current stop again or choosing “Explore all collections” clears only the series filter.
- Each stop displays its own short story. All new copy is present in the existing five lazy-loaded dictionaries.
- Yumi’s shopkeeper note responds to trial, pending save and saved wear. It only says a look is saved when the saved wardrobe agrees.
- The sign reacts briefly to a series change. Periodic and scroll-triggered sign swings have been removed; its three lights are static.
- The try-on cabinet adds brass edges, glass sheen, engraved orbital circles and a warm metal display rim. These layers are non-interactive and cannot intercept dragging or zooming.
- New effects do not add a canvas, render loop, network request or animation dependency. Reduced-motion preferences disable the new transitions.

The wardrobe persistence and catalogue organization fixes documented in `shop-wardrobe-layout-review.md` remain included. No production account, balance, purchase, schema or deployment is changed by the preview.

## Validation

Final automated and browser results are recorded alongside the preview artifacts. Real iPhone hardware has not been tested; browser checks emulate viewport size and exercise the real review screen with its in-memory wallet.

### Final results (2026-10-21)

- TypeScript passed; production Webpack build passed.
- Full ESLint: 0 errors, 12 pre-existing warnings.
- Full regression: 266 files / 2,149 tests, with 2,147 passing and two failures. One caught a new fixed-pixel font on the decorative seal (corrected to rem); the other was the untouched pronunciation session test. Both affected files were rerun separately: 17/17 passed. This is not reported as a single all-green full-suite run. The shop flow file, including collection navigation and wardrobe persistence, passed in the full run.
- Production-build browser: all five languages × Standard/Cosmic passed at mobile widths (French also at 320px). Real touch dispatch selected the collection, returning exactly 57 items and preserving the existing 3D canvas; trial messages matched the selected item. No runtime exceptions or horizontal overflow.
- Reduced motion: story animation none, route transition 0s, sign animation count 0. Desktop previews verified at 1280px.
- Local preview: http://127.0.0.1:3053/yumi-shop-review?mode=standard (or mode=cosmic). No commit, merge or production deployment in this design round.

## Commemorative coin refinement

The shopkeeper note and collection map now start collapsed. A reeded brass coin (black-gold in Cosmic) has upright, centred 33 numerals on its front and an orbital emblem on its back. A 320ms flip precedes a 280ms disclosure; closing reverses that order. Selecting a collection does not close the panel. Hidden content is inert and aria-hidden; reduced motion removes all new transitions. No timer or extra render loop is used.

Validation: TypeScript, changed-file ESLint and production build passed. The shop flow, i18n and font-size files passed (37 tests); the new disclosure unit passed separately after correcting its accessible-name test query (1 test). Production browser checks passed in both modes: initial panel height 0; panel still hidden during early flip; expansion retains the same canvas and scroll position; selecting Deep Space returns 57 items and remains open; rapid toggles close cleanly without clearing filters. No runtime exceptions or overflow. This refinement is local only.

## Personal wardrobe and release verification (2026-10-22)

The catalogue now has a visible Shop / My wardrobe switch, translated in all five languages. The wardrobe displays the owned count and only purchased items, retaining body-part browsing and the existing auto-save wear behavior. Switching destinations resets country, series and department filters so owned items cannot be hidden by a previous shopping filter. Clearing wardrobe filters keeps the reader in their wardrobe.

The pre-wardrobe release candidate passed all 267 files / 2,150 tests. Final wardrobe checks: production build and full ESLint passed (0 errors, 12 existing warnings); browser checks in Standard and Cosmic showed no overflow or runtime errors, an empty wardrobe for the empty preview wallet, and all 220 products on returning to Shop. The wardrobe regression verifies an owned item remains visible despite a previous series filter and can be worn and persisted from the wardrobe. No real account or balance is changed by these preview checks.

### Compact catalogue adjustment

The coin is now 48px (previously 68px) with a 52px-high button. Intro margins, wardrobe switch spacing, category heading spacing and the wear hint were tightened so products start higher without changing the fitting stage. Both mobile modes were visually checked at 390×844; the coin still opens/closes the story and the browser recorded no errors. TypeScript, production build and 29 focused regression tests passed.

Final compact release suite: 267 files / 2,151 tests; 2,148 passed and three unchanged timing-sensitive tests failed (origin story auto-outfit timing; landing bilingual demo timeout; pronunciation timeline timeout). Each affected file passed independently without code changes: 24, 9 and 4 tests respectively. This is not described as an all-green full-suite run. GitHub CI remains the merge gate.
