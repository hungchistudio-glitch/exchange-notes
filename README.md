# Exchange Notes

A language-learning PWA for seven languages (English, 繁體中文, Español,
Français, Italiano, 日本語, 한국어), with Yumi, a companion built in three.js.
Any of the seven can be the interface, the language you learn, or the one
you already speak, and you can switch at any time. Words come with their
readings: IPA, zhuyin and pinyin, furigana and romaji, and Korean
romanization or IPA. Settings → Readings chooses which ones show. Next.js 16,
React 19, Supabase and Vercel.

Production: https://exchange-notes-app.vercel.app. Merging to `main` deploys
it.

```bash
npm install
npm run dev        # http://localhost:3000 (needs .env.local)
npx vitest run     # tests
```

- [`AGENTS.md`](AGENTS.md): where things live, and the rules for working here.
- [`.claude/skills/verify/SKILL.md`](.claude/skills/verify/SKILL.md): how to
  check a change before pushing it.
- [`supabase/migrations/README.md`](supabase/migrations/README.md): how to
  write a migration.
- [`native/apple/README.md`](native/apple/README.md): the iOS app and widget.
