# Liquid glass orbit navigation · 2026-09-27

The eight outer navigation options now share one captured-pointer gesture. Drag around the circle to change the selected destination; release within the orbit to rebound and activate it. Pull into the centre or away from the ring to cancel. The central Yumi model is unchanged by this upgrade.

The glass surface is clear and untinted, in the app's black-and-white palette: transparent white gradient layers, a 5px backdrop blur on each key, white inset highlights, black shading and perspective tilt, over a black scrim that deepens towards the edge. The scrim itself has no backdrop blur — at its opacity the effect was barely visible, and it was a ninth live blur layer over a canvas that repaints every frame. Tangential movement stretches the surface while the icon remains legible. A magnetic attraction draws it toward each destination, with angular hysteresis to prevent oscillation at the boundary. Navigation follows a 260 ms release response (150 ms for a tap). Reduced motion retains selection and activation without deformation or delay.

Pointer cancellation, lost capture, a second pointer, window blur, resizing, closing the menu and unmounting are covered. Pending navigation is cancelled when the menu closes. Geometry comes from stationary button hit areas, so a new gesture remains accurate during the previous rebound. Keyboard and assistive activation continue to use native buttons.

## Preview

Run `npm run dev -- --hostname 127.0.0.1 --port 3017`, then open `/standard-home-review`. Tap Yumi to open the ring. The preview displays the selected destination so the gesture can be tried repeatedly without authentication or opening the live search sheet. This uses the optional `onChooseDestination` callback; the production home uses the existing router and search-sheet actions.

## Verification

- TypeScript: `npx tsc --noEmit`.
- ESLint: the changed ring, preview and test components.
- Interaction/integration tests: 33 passing tests across `liquidRingButton.test.tsx`, `yumiCookieOrbit.test.tsx` and `standardNavigation.test.tsx`.
- Browser: glass material and layout checked at 390 px and 375 px; dragged Speech to Search and confirmed the selected destination; dragging to the centre left the menu open without navigation; reverse dragging from Vocabulary to Settings correctly crossed the orbit boundary.
- Physical iPhone touch latency and GPU performance still require device verification. The browser preview is not an iOS device measurement.
- Full regression suite: `npm test -- --maxWorkers=2 --reporter=verbose` passed all 154 test files and all 1,236 tests (257.62 seconds). The 33 focused gesture/navigation tests also passed separately.
- Next.js generated route types were regenerated before the final type-check after the development server left stale generated content.
