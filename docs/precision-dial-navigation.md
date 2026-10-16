# Precision dial navigation · 2026-10-16

Replaces the liquid glass orbit (2026-09-27, `LiquidRingButton`), which is removed.

Pulling Yumi open shows her eight destinations on a dial around her, with a tick track and a gold index at the top. Chosen with Chi on 2026-10-16:

1. **Layout:** Yumi stays in the centre; all eight keys turn on the outer ring.
2. **Entering:** a drag only turns the dial. On release it snaps to the nearest detent and the key at the index is highlighted, and nothing opens. A tap on a key enters it, and a tap on the background closes the dial.
3. **Yumi:** stays put, looks at the key at the index (`setGaze`), and leans a few degrees toward it (`setNavigationLean`, at most 0.04 rad).
4. **Feel:** light detents, silent by default. `navigator.vibrate(5)` on each detent, at most every 65 ms. That only works on Android, because iOS Safari has no vibration API.

Implementation: `components/home/yumi/PrecisionDial.tsx`. Angles and transforms are written straight to the DOM inside `requestAnimationFrame`, so turning the dial never re-renders React. Geometry is sampled once, when a gesture starts. The pointer is captured on the key it went down on, so an ordinary tap keeps its click target. The wheel turns the dial too and snaps 100 ms after it stops. Arrow keys and Home/End move one detent at a time while a key has focus. From anywhere else, the first arrow focuses the key at the index. Enter and Space activate that key. Pointer cancel, lost capture, blur, resize, a hidden tab and closing mid-drag all release capture and snap without choosing. While a drag is in progress the dial carries `data-dragging`, so a second finger on the canvas cannot close it.

Text sizes are in `rem`, so the keys follow the app's text-size setting.

## Preview

`/standard-home-review` (a dev-only review route). Tap Yumi to open the dial. The page shows the chosen destination instead of navigating.

## Tests

`tests/precisionDial.test.tsx` covers the component on its own. `tests/yumiDialNavigation.test.tsx` covers the integration with the home overlay.
