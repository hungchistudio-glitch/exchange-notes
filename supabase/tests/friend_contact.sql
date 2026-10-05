-- Integration assertions use only synthetic rows and roll back everything.
begin;
do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid();
  own_note uuid; private_note uuid; conversation uuid;
begin
  insert into auth.users(id,email,raw_user_meta_data) values
    (a, a::text || '@audit.invalid', '{}'::jsonb),
    (b, b::text || '@audit.invalid', '{}'::jsonb),
    (c, c::text || '@audit.invalid', '{}'::jsonb);
  insert into public.friendships(user_one_id,user_two_id) values(least(a,b),greatest(a,b));
  insert into public.notes(user_id,english,chinese,original_text,original_language)
    values(a,'audit','測試','audit','en') returning id into own_note;
  insert into public.notes(user_id,english,chinese,original_text,original_language)
    values(c,'private audit','私人測試','private audit','en') returning id into private_note;
  insert into public.conversations default values returning id into conversation;
  insert into public.conversation_members(conversation_id,user_id) values(conversation,a),(conversation,b);
  perform set_config('audit.actor',a::text,true);
  perform set_config('audit.peer',b::text,true);
  perform set_config('audit.own_note',own_note::text,true);
  perform set_config('audit.private_note',private_note::text,true);
  perform set_config('audit.conversation',conversation::text,true);
  perform set_config('request.jwt.claim.sub',a::text,true);
end $$;
set local role authenticated;
do $$
declare share_id uuid; rejected boolean := false;
begin
  insert into public.note_shares(note_id,owner_id,recipient_id)
    values(current_setting('audit.own_note')::uuid,auth.uid(),current_setting('audit.peer')::uuid)
    returning id into share_id;
  begin
    update public.note_shares set note_id=current_setting('audit.private_note')::uuid where id=share_id;
  exception when insufficient_privilege then rejected := true;
  end;
  if not rejected then raise exception 'A share update exposed another owner note'; end if;
  insert into public.messages(conversation_id,sender_id,body)
    values(current_setting('audit.conversation')::uuid,auth.uid(),'audit history');
end $$;
select set_config('request.jwt.claim.sub',current_setting('audit.peer'),true);
do $$
begin
  if not exists(select 1 from public.notes where id=current_setting('audit.own_note')::uuid) then
    raise exception 'Friends cannot read their shared note';
  end if;
  if exists(select 1 from public.notes where id=current_setting('audit.private_note')::uuid) then
    raise exception 'An unrelated private note was visible';
  end if;
  if not public.remove_friend(current_setting('audit.actor')::uuid) then raise exception 'Friend removal failed'; end if;
end $$;
-- A new statement/snapshot after removal.
do $$
declare rejected boolean := false;
begin
  if exists(select 1 from public.notes where id=current_setting('audit.own_note')::uuid) then
    raise exception 'Unfriending left shared-note access active';
  end if;
  if not exists(select 1 from public.messages where conversation_id=current_setting('audit.conversation')::uuid) then
    raise exception 'Unfriending removed message history';
  end if;
  begin
    insert into public.messages(conversation_id,sender_id,body)
      values(current_setting('audit.conversation')::uuid,auth.uid(),'must be blocked');
  exception when insufficient_privilege then rejected := true;
  end;
  if not rejected then raise exception 'Former friends can still send'; end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('audit.actor'),true);
do $$
declare rejected boolean := false;
begin
  begin
    update public.note_shares set revoked_at=null where note_id=current_setting('audit.own_note')::uuid;
  exception when insufficient_privilege then rejected := true;
  end;
  if not rejected then raise exception 'Former friends can re-enable sharing'; end if;
end $$;
reset role;
rollback;
select 'PASS: ownership, friend access, unfriend revocation, retained history, blocked new messages and shares; all fixtures rolled back' as result;
