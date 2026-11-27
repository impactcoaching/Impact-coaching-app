-- 0013: 14-day free trial (Adam, 27 Nov 2026).
-- Trial clients start straight away with Adam's starter workouts and food logging.
-- After day 14 their account is read-only. Adam deletes it from the Trials list
-- 30 days later if they haven't joined.
-- Safe to run more than once. Run the whole file in one go.

-- ---------- a "trial" status ----------
alter type public.client_status add value if not exists 'trial';

alter table public.profiles add column if not exists trial_started_at timestamptz;
alter table public.profiles add column if not exists trial_ends_at timestamptz;

-- GP check for trial clients whose health screening needs one (they tick it themselves).
alter table public.client_intake add column if not exists gp_confirmed_at timestamptz;

-- Starter workouts: programmes Adam writes once on his own account, copied to each trial client.
alter table public.programmes add column if not exists is_starter boolean not null default false;

-- A separate yes/no for being contacted after the trial (offers, news). Always unticked by default.
alter table public.consents drop constraint if exists consents_kind_check;
alter table public.consents add constraint consents_kind_check
  check (kind in ('privacy_policy', 'health_data', 'progress_photos', 'marketing_photos', 'cycle_data', 'marketing_contact'));

-- ---------- clients may not change their own status or trial dates ----------
-- start_trial() below is the only way in for a client; it sets a flag for this one update.
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_coach()
     and coalesce(current_setting('impact.trial_start', true), '') <> 'on'
     and (new.role <> old.role
          or (new.status <> old.status and not (old.status = 'signing_up' and new.status = 'pending'))
          or new.trial_started_at is distinct from old.trial_started_at
          or new.trial_ends_at is distinct from old.trial_ends_at) then
    raise exception 'Not allowed';
  end if;
  return new;
end;
$$;

-- ---------- is this person able to add new things? ----------
-- False only for a trial client whose 14 days are up.
create or replace function public.can_add() returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.profiles
    where id = auth.uid() and status::text = 'trial' and trial_ends_at is not null and trial_ends_at < now()
  );
$$;

-- Restrictive policies are added on top of the existing ones, so nothing else changes.
-- Messages stay open, so someone whose trial has ended can still tell Adam they want to join.
drop policy if exists "trial over: read only" on public.messages;
do $$
declare t text;
begin
  foreach t in array array['workout_logs', 'set_logs', 'food_logs', 'nutrition_days', 'eating_out', 'checkins', 'progress_photos'] loop
    execute format('drop policy if exists "trial over: read only" on public.%I', t);
    execute format('create policy "trial over: read only" on public.%I as restrictive for insert to authenticated with check (public.can_add())', t);
  end loop;
end $$;

-- A trial client gets one check-in. The second is refused.
create or replace function public.guard_trial_checkin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.profiles where id = new.client_id and status::text = 'trial')
     and exists (select 1 from public.checkins where client_id = new.client_id) then
    raise exception 'Your free trial includes one check-in';
  end if;
  return new;
end;
$$;
drop trigger if exists checkins_trial_guard on public.checkins;
create trigger checkins_trial_guard before insert on public.checkins
  for each row execute function public.guard_trial_checkin();

-- ---------- start a trial ----------
-- Called by the client at the end of sign-up. Returns 'started', or 'full' when 8 trials are already running
-- (they then go on the normal list for Adam to review).
create or replace function public.start_trial() returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  running int;
  p record;
  w record;
  new_prog uuid;
  new_w uuid;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from public.profiles where id = me and role = 'client' and status = 'signing_up') then
    raise exception 'A trial can only start at sign-up';
  end if;
  if not exists (select 1 from public.client_intake where client_id = me) then
    raise exception 'Finish the sign-up questions first';
  end if;

  select count(*) into running from public.profiles where status::text = 'trial' and trial_ends_at > now();
  perform set_config('impact.trial_start', 'on', true);
  if running >= 8 then
    update public.profiles set status = 'pending' where id = me;
    perform set_config('impact.trial_start', '', true);
    return 'full';
  end if;

  update public.profiles
    set status = 'trial', trial_started_at = now(), trial_ends_at = now() + interval '14 days'
    where id = me;
  perform set_config('impact.trial_start', '', true);

  -- Copy Adam's starter workouts into the client's own live programme, so the tracker works as normal
  -- and everything they log carries over if they join.
  for p in select * from public.programmes where is_starter order by created_at limit 1 loop
    insert into public.programmes (client_id, name, notes, is_live)
      values (me, p.name, p.notes, true) returning id into new_prog;
    for w in select * from public.workouts where programme_id = p.id order by position loop
      insert into public.workouts (programme_id, client_id, name, position, notes)
        values (new_prog, me, w.name, w.position, w.notes) returning id into new_w;
      insert into public.workout_exercises (workout_id, client_id, exercise_id, position, linked_to_previous, warmup_sets, work_sets,
          reps_type, reps_min, reps_max, tempo, effort_type, effort_value, rest_seconds, intensifier, intensifier_on, film_set, notes, swap_exercise_id)
        select new_w, me, exercise_id, position, linked_to_previous, warmup_sets, work_sets,
          reps_type, reps_min, reps_max, tempo, effort_type, effort_value, rest_seconds, intensifier, intensifier_on, film_set, notes, swap_exercise_id
        from public.workout_exercises where workout_id = w.id;
    end loop;
  end loop;
  return 'started';
end;
$$;

revoke all on function public.start_trial() from public, anon;
grant execute on function public.start_trial() to authenticated;
grant execute on function public.can_add() to authenticated;
