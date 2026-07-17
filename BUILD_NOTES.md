# Exchange Notes — Vocabulary Sprint 1

This build completes the first vocabulary-first data flow:

1. Capture or choose an image.
2. Identify the object with the existing AI route.
3. Upload the image to Supabase Storage.
4. Insert the word into `vocabulary_items`.
5. View, search, filter, and update learning status in `/vocabulary`.

## Supabase setup

Open the Supabase SQL Editor and run:

`supabase/migrations/20260712_vocabulary_items.sql`

The migration creates:

- `public.vocabulary_items`
- Row Level Security policies
- `vocabulary-images` public Storage bucket
- Authenticated upload/update/delete Storage policies

## Environment variables

Keep these only in `.env.local` and Vercel project settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `ANTHROPIC_API_KEY`

## Verification

Run:

```bash
npm install
npm run lint
npm run build
npm run dev
```

Then test the full path:

`/capture` → Identify → Save to Vocabulary → `/vocabulary`
