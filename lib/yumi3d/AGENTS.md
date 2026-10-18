# lib/yumi3d: Yumi in three.js

Every piece Yumi can wear is built in code. There are no model files.

- **Where things are**
  - `scene.ts`: renderer, studio lighting, `setOutfit`.
  - `sceneCache.ts`: keeps her alive between screens instead of rebuilding
    her.
  - `outfit.ts`: slots, mount points, and `buildForSlot`, which dispatches to
    each collection.
  - `outfitKit.ts`: shared materials and geometry helpers. Reuse them; don't
    copy them.
  - Collections: `culturalOutfit.ts`, `station33Outfit.ts`.
  - `prepareWhenIdle.ts`: the landing page builds its scenes one at a time,
    after load, during idle time.
- **Disposal while compiling.** `setOutfit` compiles with `compileAsync`. A
  piece removed before its compile settles must not be disposed yet: its
  disposal waits on `settling` (see `remove()` in `outfit.ts`). Disposing
  early makes three.js throw from `checkMaterialsReady` on rapid try-ons.
- **What the tests enforce** (`tests/yumiStation33.test.ts` and the other
  `tests/yumi*` files):
  - Each piece stays under 20,000 triangles.
  - Hanging pieces have their top ring at the origin.
  - Earrings are single-sided, on her left.
  - A full outfit goes on and comes off cleanly.
- **Shop pictures**
  - Every piece ships as `public/shop-thumbs/<id>.webp`. They are rendered by
    `scripts/render-shop-thumbnails.mjs` (run `npm run dev` and a headless
    Chrome first; the script's header has the commands). Use
    `--collection <name>` to redo only one collection, and check the results
    at `/yumi-shop-thumbnails-review`.
  - `thumbnails.ts` renders on the device only as a fallback. Bump
    `THUMBNAIL_VERSION` whenever a builder or the thumbnail pose changes.
- **Measuring jank**
  - The Browser pane cannot time anything. Measure a production build in a
    separate headless Chrome over CDP, A/B against production.
  - A stall without a long task is GPU raster.
  - Starting a Web Animation rasterises its layer at its *largest* animated
    scale, even at opacity 0. `visibility: hidden` prevents that;
    `will-change` does not.
