-- A microphone check-up's diagnostic, sent from Settings > Microphone
-- (Chi, 2026-11-27: 診斷碼＋一鍵回報). Widening only: every row the old
-- check allowed is still allowed, so this goes in before the code that
-- sends 'device' (supabase/migrations/README.md, two phases).
alter table public.content_reports drop constraint content_reports_surface_check;
alter table public.content_reports
  add constraint content_reports_surface_check
  check (surface in ('word', 'news', 'game', 'lab', 'device'));
