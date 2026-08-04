-- Allow authenticated users to delete only messages they sent themselves.

alter table public.messages enable row level security;
drop policy if exists "Users can delete own messages"
on public.messages;
create policy "Users can delete own messages"
on public.messages
for delete
to authenticated
using (
  auth.uid() = sender_id
);
