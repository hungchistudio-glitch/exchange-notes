-- 1. Add attachment columns to messages
alter table messages
  add column if not exists attachment_url text,
  add column if not exists attachment_type text,
  add column if not exists attachment_name text;

-- 2. Create a public storage bucket for message attachments
insert into storage.buckets (id, name, public)
values ('message-attachments', 'message-attachments', true)
on conflict (id) do nothing;

-- 3. Storage RLS: only conversation members can upload/read files for that
-- conversation. Files must be uploaded under a path like
-- "{conversation_id}/{filename}" — the policy checks the first path segment
-- against is_conversation_member().
drop policy if exists "Members can upload attachments" on storage.objects;
create policy "Members can upload attachments"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'message-attachments'
  and is_conversation_member((split_part(name, '/', 1))::uuid)
);

drop policy if exists "Members can view attachments" on storage.objects;
create policy "Members can view attachments"
on storage.objects for select
to authenticated
using (
  bucket_id = 'message-attachments'
  and is_conversation_member((split_part(name, '/', 1))::uuid)
);
