-- Close the vocabulary image bucket.
--
-- APPLY THIS AFTER the app code that reads images through
-- /api/vocabulary-image is deployed, and not before. That is the whole
-- operational content of this file being separate from 20260831022419.
--
-- NOT YET APPLIED. 20260831022419 is on production; this one is deliberately
-- held back, because production is still serving the code that reads images
-- by public URL. Applying it now blanks every existing vocabulary image.
--
-- Every vocabulary image ever saved is currently readable by anyone holding
-- its URL: the bucket is public, the capture screen stored
-- `getPublicUrl(...)` on the row, and those URLs travel inside message
-- bodies when a word card is shared. The paths are a user id plus a uuid,
-- so they are not enumerable in practice — but "hard to guess" is not the
-- same as "not readable", and these are photographs of where readers live
-- and eat.
--
-- Nothing breaks on the way through, provided the order is kept. Legacy
-- rows still hold public URLs; lib/media/imageUrl.ts pulls the path back
-- out of them and serves them through the same signed route as new ones, so
-- a word saved three months ago renders exactly as it did. Rows are never
-- rewritten.
--
-- To roll back: `update storage.buckets set public = true where id =
-- 'vocabulary-images';`. The policies below are harmless on a public bucket
-- and can stay.

update storage.buckets
  set public = false
  where id = 'vocabulary-images';

-- Owner-only access, by the path convention the app writes: the first
-- segment of every object name is the owner's user id. Both the legacy
-- `{uid}/{uuid}.jpg` and the new `{uid}/{group}/source.webp` satisfy it.
drop policy if exists "Users read own vocabulary images" on storage.objects;
create policy "Users read own vocabulary images"
  on storage.objects for select
  using (
    bucket_id = 'vocabulary-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users write own vocabulary images" on storage.objects;
create policy "Users write own vocabulary images"
  on storage.objects for insert
  with check (
    bucket_id = 'vocabulary-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users delete own vocabulary images" on storage.objects;
create policy "Users delete own vocabulary images"
  on storage.objects for delete
  using (
    bucket_id = 'vocabulary-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- Sharing is not covered by these policies and deliberately so. A friend
-- reading a word card in a conversation has no row in this bucket to match
-- against; they are served by /api/vocabulary-image, which verifies shared
-- conversation membership on the server and signs the object with the
-- service role. Widening the RLS policy to "any friend" instead would make
-- every image in a reader's library readable by every friend, rather than
-- the one image they were actually sent.
