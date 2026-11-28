-- Workouts on set days. Adam can put each workout in a programme on one or more weekdays,
-- so the client's Train page shows "Today: Lower A" and their week at a glance.
-- Optional: a workout with no days works as before (the client picks it when they like).
-- No new table, so the existing workouts policies (client reads own live, coach all) still apply.

alter table public.workouts
  add column if not exists weekdays smallint[] not null default '{}';

alter table public.workouts
  drop constraint if exists workouts_weekdays_valid;
alter table public.workouts
  add constraint workouts_weekdays_valid check (weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]); -- 1 Monday .. 7 Sunday
