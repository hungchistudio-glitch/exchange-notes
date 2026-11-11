-- The games hub's progress row (Chi, 2026-11-12: "你的收藏進度"): one read
-- for the three cards on /games, so each shows how far the reader is
-- towards its next piece.
--
--  hangyumi    Nightscale: the three wins to the next piece, pieces held of 24.
--  starweaver  The seven voyages to the next relic, relics held of 17.
--  wordvault   The streak towards the chests (the 4th word medium, the 7th
--              premium), which the seventh word starts again.
--
-- Read only. Nightscale and Starweaver answer exactly what their own game
-- screens are told (private.nightscale_state, private.starweaver_state);
-- the streak is the row private.hangyumi_guess keeps. Nothing here pays,
-- awards or writes.

create or replace function private.games_progress() returns jsonb
 language plpgsql stable security definer set search_path = '' as $$
declare
 v_user uuid := auth.uid();
begin
 if v_user is null then
  raise exception using errcode = '42501', message = 'Authentication is required to play.';
 end if;
 return jsonb_build_object(
  'hangyumi', private.nightscale_state(v_user),
  'starweaver', private.starweaver_state(v_user),
  'wordvault', jsonb_build_object(
   'streak', coalesce((select s.streak from public.wordvault_streaks s where s.user_id = v_user), 0),
   'streakLength', 7));
end;
$$;

create or replace function public.games_progress() returns jsonb
 language sql stable security invoker set search_path = '' as $$
 select private.games_progress();
$$;

revoke all on function private.games_progress(), public.games_progress()
from public, anon, authenticated;

grant execute on function private.games_progress(), public.games_progress()
to authenticated;
