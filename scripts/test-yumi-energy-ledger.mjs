// The energy ledger against a real Postgres (PGlite, in memory): opening
// balances, +1 per first save, +3 per review round passed in full, spending,
// and that nobody can mint cookies. Run with
//   PGLITE_MODULE=<path to @electric-sql/pglite> node scripts/test-yumi-energy-ledger.mjs
// (PGlite is not a dependency of the app; any local install will do.)
const {PGlite}=await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=process.cwd();
const db=new PGlite();
await db.exec(`create schema auth; create role anon; create role authenticated; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
create table public.vocabulary_items(id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id), word text, word_language text, status text, next_review_at timestamptz,last_reviewed_at timestamptz,review_interval numeric,review_ease numeric,review_count int,correct_count int,review_repetitions int,review_lapses int,retention_score int,updated_at timestamptz);
insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
select set_config('test.uid','00000000-0000-0000-0000-000000000001',false);`);
for(const f of ['20260911190333_atomic_review_save.sql','20261012215524_yumi_shop.sql','20261012223024_yumi_shop_prices.sql'])await db.exec(await fs.readFile(`${root}/supabase/migrations/${f}`,'utf8'));
await db.exec(`insert into vocabulary_items(user_id,word,word_language) select auth.uid(),'old'||g,'en' from generate_series(1,50) g;
select public.buy_yumi_item('monocle');`);
const state=async()=> (await db.query('select public.get_yumi_wardrobe() as s')).rows[0].s;
assert.equal((await state()).balance,20);
await db.exec(await fs.readFile(`${root}/supabase/migrations/20261013160810_yumi_energy_ledger.sql`,'utf8'));
assert.equal((await state()).balance,20);assert.deepEqual((await state()).owned,['monocle']);
await db.exec(`delete from vocabulary_items where word='old1'`);assert.equal((await state()).balance,20);
await db.exec(`insert into vocabulary_items(user_id,word,word_language) values(auth.uid(),' old1 ','en')`);assert.equal((await state()).balance,20);
await db.exec(`insert into vocabulary_items(user_id,word,word_language) values(auth.uid(),'New Word','en')`);assert.equal((await state()).balance,21);
await db.exec(`insert into vocabulary_items(user_id,word,word_language) values(auth.uid(),' new   word ','en')`);assert.equal((await state()).balance,21);
const ids=(await db.query(`select id from vocabulary_items limit 2`)).rows.map(r=>r.id);
const round='00000000-0000-0000-0000-000000000011';
await db.query('select public.begin_yumi_review_round($1,$2)',[round,ids]);
await db.query('select public.grade_yumi_review_round($1,$2,$3)',[round,ids[0],'good']);assert.equal((await state()).balance,21);
await db.query('select public.grade_yumi_review_round($1,$2,$3)',[round,ids[1],'hard']);assert.equal((await state()).balance,24);
await db.query('select public.grade_yumi_review_round($1,$2,$3)',[round,ids[1],'easy']);assert.equal((await state()).balance,24);
const again='00000000-0000-0000-0000-000000000012';
await db.query('select public.begin_yumi_review_round($1,$2)',[again,ids]);
await db.query('select public.grade_yumi_review_round($1,$2,$3)',[again,ids[0],'again']);
await db.query('select public.grade_yumi_review_round($1,$2,$3)',[again,ids[1],'good']);assert.equal((await state()).balance,24);
await db.exec(`select public.buy_yumi_item('star-pupil');`);assert.equal((await state()).balance,9);
await db.exec(`select public.buy_yumi_item('star-pupil');`);assert.equal((await state()).balance,9);
assert.equal((await db.query(`select public.buy_yumi_item('jade') as b`)).rows[0].b.status,'insufficient');
await db.exec(`select set_config('test.uid','00000000-0000-0000-0000-000000000002',false)`);
await assert.rejects(db.query('select public.grade_yumi_review_round($1,$2,$3)',[round,ids[0],'good']));
await db.exec('set role authenticated');
await assert.rejects(db.exec(`insert into public.yumi_energy_ledger(user_id,kind,amount,source_key) values(auth.uid(),'paid',33,'fake')`));
assert.equal((await db.query('select * from public.yumi_energy_ledger')).rows.length,1); // own opening only
await db.exec('reset role');
await db.exec(`select set_config('test.uid','00000000-0000-0000-0000-000000000001',false)`);
const beforeWords=(await db.query('select count(*) as n from vocabulary_items')).rows[0].n;
await db.exec(`insert into yumi_energy_ledger(user_id,kind,amount,source_key) values(auth.uid(),'paid',33,'TEST-ONLY-receipt')`);
assert.equal((await state()).balance,42);
assert.equal((await db.query('select count(*) as n from vocabulary_items')).rows[0].n,beforeWords);
await assert.rejects(db.exec(`insert into yumi_energy_ledger(user_id,kind,amount,source_key) values(auth.uid(),'paid',33,'TEST-ONLY-receipt')`));
assert.equal((await state()).balance,42);
await db.close();
console.log('PASS: opening balance/ownership, delete/readd, normalized duplicates, +1 save, +3 whole round, partial/failed/replayed rounds, spend/owned/insufficient, cross-user access, mint denial, RLS.');
