-- Impact Coaching: stage 1 foundations
-- People, sign-up answers, consent records and gyms.
-- Every table has row level security: a client sees only their own rows,
-- the coach sees everything.

create extension if not exists "pgcrypto";

-- ---------- people ----------
create type public.user_role as enum ('coach', 'client');
create type public.client_status as enum ('signing_up', 'pending', 'active', 'paused', 'ended');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'client',
  full_name text,
  status public.client_status not null default 'signing_up',
  country text,
  time_zone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- New sign-ins always start as a client. The coach account is promoted by hand
-- (see README: "Make yourself the coach").
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_coach() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'coach');
$$;

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- A client may not change their own role or status. Changes made outside the
-- app (the Supabase SQL editor, where there is no signed-in user) are allowed.
create function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_coach() and (new.role <> old.role or (new.status <> old.status and not (old.status = 'signing_up' and new.status = 'pending'))) then
    raise exception 'Not allowed';
  end if;
  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

alter table public.profiles enable row level security;
create policy "profiles: read own or coach" on public.profiles for select using (id = auth.uid() or public.is_coach());
create policy "profiles: update own or coach" on public.profiles for update using (id = auth.uid() or public.is_coach());

-- ---------- sign-up answers ----------
create table public.client_intake (
  client_id uuid primary key references public.profiles (id) on delete cascade,
  date_of_birth date,
  phone text,
  -- goal
  goal text not null,
  goal_detail text,
  goal_date date,
  competes boolean not null default false,
  federation text,
  division text,
  -- body
  height_cm numeric(5,1),
  start_weight_kg numeric(5,1),
  units text not null default 'metric',
  -- training
  days_per_week int,
  session_minutes int,
  experience text,
  injuries text,
  -- nutrition
  nutrition_style text,
  dietary_needs text,
  -- options that are never assumed from sex
  cycle_tracking boolean not null default false,
  -- health screening (yes/no answers, plus details)
  screening jsonb not null default '{}'::jsonb,
  screening_flag boolean not null default false,
  screening_details text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger intake_touch before update on public.client_intake
  for each row execute function public.touch_updated_at();

alter table public.client_intake enable row level security;
create policy "intake: read own or coach" on public.client_intake for select using (client_id = auth.uid() or public.is_coach());
create policy "intake: insert own" on public.client_intake for insert with check (client_id = auth.uid());
create policy "intake: update own or coach" on public.client_intake for update using (client_id = auth.uid() or public.is_coach());

-- ---------- consent records ----------
-- One row per consent given or withdrawn, never edited, so there is a history.
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('privacy_policy', 'health_data', 'progress_photos', 'marketing_photos', 'cycle_data')),
  granted boolean not null,
  policy_version text not null,
  created_at timestamptz not null default now()
);

create index consents_client on public.consents (client_id, kind, created_at desc);

alter table public.consents enable row level security;
create policy "consents: read own or coach" on public.consents for select using (client_id = auth.uid() or public.is_coach());
create policy "consents: insert own" on public.consents for insert with check (client_id = auth.uid());

-- ---------- gyms ----------
create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  preset text check (preset in ('big', 'small', 'home', 'none')),
  equipment text[] not null default '{}',
  is_main boolean not null default false,
  created_at timestamptz not null default now()
);

create index gyms_client on public.gyms (client_id);

alter table public.gyms enable row level security;
create policy "gyms: read own or coach" on public.gyms for select using (client_id = auth.uid() or public.is_coach());
create policy "gyms: write own" on public.gyms for insert with check (client_id = auth.uid());
create policy "gyms: update own" on public.gyms for update using (client_id = auth.uid());
create policy "gyms: delete own" on public.gyms for delete using (client_id = auth.uid());

-- Kit a client adds that isn't on the standard list.
create table public.custom_equipment (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  works_like text,
  coach_match text,
  photo_path text,
  created_at timestamptz not null default now()
);

alter table public.custom_equipment enable row level security;
create policy "custom kit: read own or coach" on public.custom_equipment for select using (client_id = auth.uid() or public.is_coach());
create policy "custom kit: insert own" on public.custom_equipment for insert with check (client_id = auth.uid());
create policy "custom kit: update own or coach" on public.custom_equipment for update using (client_id = auth.uid() or public.is_coach());
create policy "custom kit: delete own" on public.custom_equipment for delete using (client_id = auth.uid());
