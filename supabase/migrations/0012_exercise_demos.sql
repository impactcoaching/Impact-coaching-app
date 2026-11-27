-- 0012: exercise demos and the coach Library (Adam, 27 Nov 2026).
-- Each exercise can have, in this order of priority:
--   demo_path  the coach's own video, in the private exercise-demos bucket
--   wx_female / wx_male  WorkoutX stock clip ids (we store ids only; WorkoutX links expire daily, so the app asks for fresh ones)
--   demo_url   any other link, e.g. YouTube
alter table public.exercises
  add column if not exists wx_female text,
  add column if not exists wx_male text,
  add column if not exists wx_auto boolean not null default false,  -- matched automatically, coach hasn't checked it yet
  add column if not exists demo_path text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.exercises drop constraint if exists exercises_demo_url_web;
alter table public.exercises add constraint exercises_demo_url_web check (demo_url is null or demo_url ~* '^https://');
alter table public.exercises drop constraint if exists exercises_wx_ids;
alter table public.exercises add constraint exercises_wx_ids check (
  (wx_female is null or wx_female ~ '^ex_[A-Za-z0-9]{3,20}$') and (wx_male is null or wx_male ~ '^ex_[A-Za-z0-9]{3,20}$'));

drop trigger if exists exercises_touch on public.exercises;
create trigger exercises_touch before update on public.exercises for each row execute function public.touch_updated_at();

-- Pendulum squat (Adam, 27 Nov 2026)
insert into public.exercises (name, muscle, equipment) values ('Pendulum squat', 'Quads', '{pendulum}')
on conflict (name) do nothing;

-- ---------- coach's own demo videos ----------
-- exercise-demos/coach/<file>: the coach uploads; anyone signed in can watch.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('exercise-demos', 'exercise-demos', false, 104857600, array['video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do nothing;

drop policy if exists "exercise demos: coach uploads" on storage.objects;
create policy "exercise demos: coach uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'exercise-demos' and public.is_coach());
drop policy if exists "exercise demos: signed in reads" on storage.objects;
create policy "exercise demos: signed in reads" on storage.objects for select to authenticated
  using (bucket_id = 'exercise-demos');
drop policy if exists "exercise demos: coach deletes" on storage.objects;
create policy "exercise demos: coach deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'exercise-demos' and public.is_coach());
