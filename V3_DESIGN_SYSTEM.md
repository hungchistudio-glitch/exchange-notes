# Exchange Notes V3 — Design System Foundation

## Product hierarchy

1. Vocabulary learning
2. Capture and review
3. Messaging and friends
4. Grammar and discovery

## Shared proportions

- Page gutter: 16–24 px responsive
- Content width: 576 px default
- Primary navigation: 72 px
- Button heights: 36 / 44 / 52 px
- Card radius: 26 px
- Inner control radius: 14–20 px
- Standard card padding: 20 px

## Shared primitives

- `components/ui/AppPage.tsx`
- `components/ui/PageHeader.tsx`
- `components/ui/AppCard.tsx`
- `components/ui/AppButton.tsx`

Global tokens and utility classes live in `app/globals.css`.

## Completed in this foundation pass

- Unified global color, spacing, typography, border, shadow, and radius tokens
- Rebuilt the bottom navigation with consistent hit targets and labels
- Unified page shell spacing on Home, Vocabulary, Discover, Grammar, Profile, and Quiz
- Reworked the Home header, daily goal card, and quick capture card
- Preserved all existing Supabase, Gemini, camera, messaging, sharing, and pronunciation behavior
- Verified with a production build on Next.js 16.2.10
