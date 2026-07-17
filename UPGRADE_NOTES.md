# Exchange Notes Upgrade

## Updated
- Restored `/vocabulary` as the vocabulary library instead of the camera page.
- Added compact SSENSE-inspired Sort By and Filters controls.
- New Words sorts newest saved vocabulary first.
- For You uses interaction history plus Gemini ranking with a local fallback.
- Trending uses current Daily News context plus Gemini ranking with a local fallback.
- Filters provide A-Z search and direct word selection.
- Duplicate vocabulary entries are hidden and duplicate saves are blocked.
- Vocabulary cards retain pronunciation, quiz, sharing, partner sending, status controls, and text-selection saving.
- Messages consume pending vocabulary shares and persist/render them as vocabulary cards.

## Validation
- Targeted ESLint passed for vocabulary, messages, and vocabulary-rank API.
- `npm run build` passed with Next.js 16.2.10.

## Environment
Copy your existing `.env.local` into this project. It should contain your Supabase variables and `GEMINI_API_KEY`.
