create table if not exists public.ai_lessons (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  title text not null,
  introduction text not null default '',

  selected_words jsonb not null default '[]'::jsonb,

  story text not null,
  story_translation text not null default '',

  dialogue jsonb not null default '[]'::jsonb,
  grammar_notes jsonb not null default '[]'::jsonb,
  quiz jsonb not null default '[]'::jsonb,

  status text not null default 'generated'
    check (
      status in (
        'generated',
        'in_progress',
        'completed'
      )
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists
  ai_lessons_user_created_at_idx
on public.ai_lessons (
  user_id,
  created_at desc
);
alter table public.ai_lessons
enable row level security;
drop policy if exists
  "Users can read their own AI lessons"
on public.ai_lessons;
create policy
  "Users can read their own AI lessons"
on public.ai_lessons
for select
to authenticated
using (
  auth.uid() = user_id
);
drop policy if exists
  "Users can create their own AI lessons"
on public.ai_lessons;
create policy
  "Users can create their own AI lessons"
on public.ai_lessons
for insert
to authenticated
with check (
  auth.uid() = user_id
);
drop policy if exists
  "Users can update their own AI lessons"
on public.ai_lessons;
create policy
  "Users can update their own AI lessons"
on public.ai_lessons
for update
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);
drop policy if exists
  "Users can delete their own AI lessons"
on public.ai_lessons;
create policy
  "Users can delete their own AI lessons"
on public.ai_lessons
for delete
to authenticated
using (
  auth.uid() = user_id
);
