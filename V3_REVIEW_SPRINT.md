# Exchange Notes V3 — Review / Flashcard Sprint

## Included

- Review dashboard at `/vocabulary/review`
- Review session at `/vocabulary/review/session`
- English ↔ Traditional Chinese alternating prompts
- Reveal-answer interaction
- Again / Hard / Good / Easy grading
- Spaced-review scheduling helper
- Same-session repetition for words graded Again
- Review progress and completion summary
- Speech playback for prompt and answer
- Supabase migration for review scheduling fields

## Required database step

Apply:

`supabase/migrations/20260717010000_review_system.sql`

before using the review pages against your hosted Supabase project.

## Verification

`npm run build` completed successfully with 29/29 static pages generated.
