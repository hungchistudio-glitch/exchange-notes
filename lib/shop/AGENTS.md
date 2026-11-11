# lib/shop: Yumi's shop

- **The catalogue** is `catalog.ts`; the cultural pieces are in
  `culturalCollection.ts`. `SHOP_ITEMS` is the 333 on the shelves; the 33
  Mythic Vault pieces (`mythicCollection.ts`), Starweaver's 17 relics
  (`starweaverCollection.ts`) and Hangyumi's 24 Nightscale pieces
  (`nightscaleCollection.ts`) are not in it. They are won in the games
  (the vault's from Wordvault's premium chest, the relics by every seventh
  Starweaver word, Nightscale by every third Hangyumi word), each drawn from
  its own `reward_pool` by name, never sold (their database rows are
  `limited` and not `available`), and every lookup by id still knows them so
  they can be worn. Every piece is built in code by `lib/yumi3d/`
  (see `lib/yumi3d/AGENTS.md`).
- **Ids are permanent.** Ownership, the worn outfit and the database's price
  list are all stored by id. Names are display text, never keys.
- **The database charges, not the client.** Prices live in
  `public.yumi_shop_items`, and the purchase function
  (`private.buy_yumi_item`) reads them from there. Adding a piece or changing
  a price therefore needs a migration that upserts rows, as well as the
  catalogue change. Follow `supabase/migrations/README.md`.
- **`tests/yumiShopCatalog.test.ts` checks the two agree.**
  - It only reads migrations whose filename matches `*_yumi_shop*.sql`.
  - It only parses rows written as `('<id>', '<slot>', <price>)`.
  - A migration that doesn't follow both is invisible to it, and the test
    then reports a mismatch that looks like the catalogue's fault.
- **Every price is a multiple of three**, because Yumi counts on three fingers
  a hand (Chi, 2026-10-17). The same test enforces it.
- **The same test also requires:**
  - a picture for every piece in `public/shop-thumbs/`;
  - a builder for every piece (`buildableIds()`);
  - a name in all five interface languages, with the Chinese one in
    Traditional characters.
- **The way in** (Chi, 2026-11-12; made smoother the same day):
  - `components/shop/HoloEntrance.tsx` is a soft-light holographic scan, about 1.2 s.
    - The veil slides down while the blueprint inside it slides up by the same amount. Only the soft edge sweeps; the outlines (one SVG of the parts marked `data-holo-frame`) stand still.
    - It is rendered with the page, and the sweep waits for hydration (`data-go`).
  - `ShopStage` builds Yumi's scene only after the scan (`holdScene`), then beams her down; `StationDock`'s `landing` prop pulses the pad.
  - A tap, a scroll or a key ends the scan. It never shows under reduced motion; `?entrance=0` on the review screen leaves it out.
  - Keep it to transforms and opacity on a few layers, with no filter, backdrop-filter or blur.
  - Don't bring back the old rise: when it came back on at the scan's end, it played a second time (the flash).
