# lib/shop: Yumi's shop

- **The catalogue** is `catalog.ts`; the cultural pieces are in
  `culturalCollection.ts`. `SHOP_ITEMS` is the 333 on the shelves; the 33
  Mythic Vault pieces (`mythicCollection.ts`) are not in it. They are won
  from Wordvault's premium chest, never sold (their database rows are
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
