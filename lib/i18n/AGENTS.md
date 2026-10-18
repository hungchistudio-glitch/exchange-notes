# lib/i18n: interface copy in five languages

- **Five dictionaries:** `en.ts`, `zh-TW.ts`, `es.ts`, `fr.ts`, `it.ts`. Each
  is typed by `TranslationDictionary` in `types.ts`.
  - To add a string, add the key to `types.ts` first. `npx tsc --noEmit` then
    lists every dictionary still missing it, so write all five; don't leave
    English in the others.
  - `tests/i18n.test.ts` also requires identical keys, every placeholder the
    English string has, and no empty strings.
- **The About, Privacy and Terms copy** lives in `info/`, which has the same
  five files plus its own `types.ts`. The main dictionaries import it.
- **Two ways languages are named.** Interface languages are keyed by name
  (`"english"`, `"traditional-chinese"`, …; see `LOADERS` in `index.ts`).
  Learning languages use codes (`"en" | "zh-TW" | "es" | "fr" | "it"`; see
  `LanguageCode` in `lib/languages.ts`). Don't mix them up.
- **Placeholders, not concatenation.** Use `fill()` and `plural()` from
  `format.ts`, because word order differs between languages.
- **One dictionary per reader.** `index.ts` loads them with dynamic imports,
  and `useTranslation()` is synchronous. Never import a dictionary statically
  from app code: that ships all five on every page. Tests get all five from
  `tests/setup.ts`.
- **The language table** (endonyms, badges, speech tags, names in every
  interface language) is `lib/languages.ts`.
  - A hand-kept Swift copy lives in
    `native/apple/ExchangeNotesApple/Shared/YumiWidgetLanguage.swift`, and
    `tests/yumiWidgetLanguages.test.ts` compares the two. Change both, then
    run `npm run test:native-personal`.
  - Never write a list of languages by hand; use `learningLanguageList()`.
