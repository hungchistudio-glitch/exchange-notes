-- A new message brings a hidden conversation back.
--
-- Hiding a conversation sets conversation_members.hidden_at, and nothing in
-- the app ever clears it again — there is no unhide anywhere in the codebase.
-- That made "hide" permanent in a way it does not look like from the UI: the
-- conversation is dropped from the message list, get_total_unread_count skips
-- it, and every message the other person sends afterwards is invisible
-- forever, with no notification and no badge. The sender sees a normal thread
-- and gets no indication their messages are going nowhere.
--
-- Hiding reads as "clear this off my list", not "block this person" — mute
-- and unfriend are the tools for those, and both already exist. So a new
-- message unhides the conversation for the people who hid it, the way an
-- archived thread resurfaces.
--
-- This has to be a trigger rather than client code: RLS only lets a user
-- update their own conversation_members row, so the sender cannot clear the
-- recipient's hidden_at, and the recipient is not there to do it.

create or replace function public.unhide_conversation_on_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversation_members
     set hidden_at = null
   where conversation_id = new.conversation_id
     and user_id <> new.sender_id
     and hidden_at is not null;

  return new;
end;
$$;

-- Trigger functions have no business being callable over the REST API.
revoke execute on function public.unhide_conversation_on_new_message() from public;
revoke execute on function public.unhide_conversation_on_new_message() from anon;
revoke execute on function public.unhide_conversation_on_new_message() from authenticated;

drop trigger if exists unhide_conversation_on_new_message on public.messages;

create trigger unhide_conversation_on_new_message
after insert on public.messages
for each row
execute function public.unhide_conversation_on_new_message();
