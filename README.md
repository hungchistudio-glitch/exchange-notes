# Exchange Notes

A language-learning PWA for five languages (English, 繁體中文, Español,
Français, Italiano), with Yumi, a companion built in three.js. Next.js 16,
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
