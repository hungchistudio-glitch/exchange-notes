-- A saved word remembers the picture it came from, not just a link to one.
--
-- vocabulary_items has had `image_url` since the beginning: one public URL,
-- one image, written only by the capture screen. Three other screens read
-- photographs and saved words from them — the menu scanner, the search
-- sheet's image lookup, and a card shared in a conversation — and all three
-- threw the picture away.
--
-- This adds one jsonb column holding everything about the two derivatives a
-- capture now produces: the retained normalised source, the card crop, and
-- the normalised rectangle relating them. One column rather than ten,
-- because none of it is ever queried — it is read whole, with the row, to
-- put a picture on a card.
--
-- Additive and backward-safe. `image_url` is untouched and still read: a row
-- with no `media` renders from it exactly as before, and nothing requires a
-- legacy word to acquire a target image. No backfill, because there is
-- nothing to backfill from — a legacy row's single image was never a crop of
-- anything, and inventing a target rectangle for it would be a guess
-- recorded as a fact.
--
-- Safe to run before the app that writes the column is deployed.

/* =========================================================
   The media record
   ========================================================= */

alter table public.vocabulary_items
  add column if not exists media jsonb;

comment on column public.vocabulary_items.media is
  'Two-asset media record: retained normalised source, generated card crop, '
  'and the normalised target rectangle relating them. Null for rows saved '
  'before this existed, which render from image_url. Shape is versioned — '
  'see lib/media/record.ts.';

-- Only two shapes are legal: absent, or a version this app knows how to
-- read. A malformed record is a rendering decision (lib/media/record.ts
-- falls back to image_url), but a record that is not even an object is a
-- writer bug and should not reach the table.
alter table public.vocabulary_items
  drop constraint if exists vocabulary_items_media_shape_check;

alter table public.vocabulary_items
  add constraint vocabulary_items_media_shape_check
  check (
    media is null
    or (
      jsonb_typeof(media) = 'object'
      and media ? 'version'
      and media ? 'sourcePath'
      and media ? 'cardPath'
    )
  );

-- Finding the rows written under an older compression policy, which is the
-- one question this column will ever be asked at scale. Partial, because the
-- overwhelming majority of rows have no media at all and indexing their
-- nulls buys nothing.
create index if not exists vocabulary_items_media_version_idx
  on public.vocabulary_items ((media ->> 'compressionVersion'))
  where media is not null;

/* =========================================================
   The bucket, written down for the first time

   `vocabulary-images` has existed since the capture screen was built, but
   only in the Supabase dashboard — it appears in no migration, so a database
   built from this directory has no bucket and the capture screen fails on
   upload with an error that names nothing. Same class of drift as
   20260817120000, and recorded the same way.

   Registered here as it currently is — public — because this file has to be
   safe to apply against the running app *before* the code that reads images
   through /api/vocabulary-image is deployed. Making it private is
   20260831023815, which must be applied after that deploy and not before.
   ========================================================= */

insert into storage.buckets (id, name, public)
values ('vocabulary-images', 'vocabulary-images', true)
on conflict (id) do nothing;
