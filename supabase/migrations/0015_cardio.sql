-- Cardio, in the Train tab. Adam sets a weekly minutes target, a daily steps target and
-- the sessions for the week. Clients tick off sessions, log extra cardio and their steps.
-- Outdoor walk route tracking comes later with the App Store version, so no location is stored here.

-- ---------- the coach's targets for each client ----------
create table public.cardio_plans (
  client_id uuid primary key references public.profiles (id) on delete cascade,
  weekly_minutes int not null default 0 check (weekly_minutes between 0 and 3000),
  daily_steps int check (daily_steps between 0 and 60000),
  extra_counts boolean not null default true, -- extra cardio they log counts toward the target
  updated_at timestamptz not null default now()
);
create trigger cardio_plans_touch before update on public.cardio_plans for each row execute function public.touch_updated_at();

-- ---------- sessions Adam sets for the week ----------
create table public.cardio_sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  day smallint check (day between 1 and 7), -- 1 Monday .. 7 Sunday; null = any day
  kind text not null check (char_length(kind) between 1 and 60),
  minutes int not null default 30 check (minutes between 1 and 600),
  mode text not null default 'rpe' check (mode in ('hr', 'rpe', 'speed', 'intervals')),
  target text check (char_length(target) <= 80), -- "Zone 2", "6", "5.5 km/h, 10%"
  iv_work int check (iv_work between 1 and 3600),
  iv_rest int check (iv_rest between 0 and 3600),
  iv_rounds int check (iv_rounds between 1 and 100),
  timing text check (char_length(timing) <= 40),
  notes text check (char_length(notes) <= 500),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index cardio_sessions_client on public.cardio_sessions (client_id, position);

-- ---------- what clients log ----------
create table public.cardio_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid references public.cardio_sessions (id) on delete set null, -- null = extra cardio
  log_date date not null,
  kind text not null check (char_length(kind) between 1 and 60),
  minutes int not null check (minutes between 1 and 600),
  avg_hr int check (avg_hr between 30 and 230),
  distance_km numeric(6, 2) check (distance_km between 0 and 500),
  effort smallint check (effort between 1 and 10),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index cardio_logs_client_date on public.cardio_logs (client_id, log_date desc);

create table public.step_logs (
  client_id uuid not null references public.profiles (id) on delete cascade,
  log_date date not null,
  steps int not null check (steps between 0 and 150000),
  updated_at timestamptz not null default now(),
  primary key (client_id, log_date)
);
create trigger step_logs_touch before update on public.step_logs for each row execute function public.touch_updated_at();

-- ---------- row level security: client sees own rows, coach sees all ----------
alter table public.cardio_plans enable row level security;
create policy "cardio plans: read own or coach" on public.cardio_plans for select using (client_id = auth.uid() or public.is_coach());
create policy "cardio plans: coach writes" on public.cardio_plans for insert with check (public.is_coach());
create policy "cardio plans: coach updates" on public.cardio_plans for update using (public.is_coach());
create policy "cardio plans: coach deletes" on public.cardio_plans for delete using (public.is_coach());

alter table public.cardio_sessions enable row level security;
create policy "cardio sessions: read own or coach" on public.cardio_sessions for select using (client_id = auth.uid() or public.is_coach());
create policy "cardio sessions: coach writes" on public.cardio_sessions for insert with check (public.is_coach());
create policy "cardio sessions: coach updates" on public.cardio_sessions for update using (public.is_coach());
create policy "cardio sessions: coach deletes" on public.cardio_sessions for delete using (public.is_coach());

alter table public.cardio_logs enable row level security;
create policy "cardio logs: read own or coach" on public.cardio_logs for select using (client_id = auth.uid() or public.is_coach());
create policy "cardio logs: client inserts own" on public.cardio_logs for insert with check (client_id = auth.uid());
create policy "cardio logs: client updates own" on public.cardio_logs for update using (client_id = auth.uid());
create policy "cardio logs: client or coach deletes" on public.cardio_logs for delete using (client_id = auth.uid() or public.is_coach());

alter table public.step_logs enable row level security;
create policy "step logs: read own or coach" on public.step_logs for select using (client_id = auth.uid() or public.is_coach());
create policy "step logs: client inserts own" on public.step_logs for insert with check (client_id = auth.uid());
create policy "step logs: client updates own" on public.step_logs for update using (client_id = auth.uid());

-- Once a free trial has ended, clients can look back but not add anything new (as in 0013).
create policy "trial over: read only" on public.cardio_logs as restrictive for insert to authenticated with check (public.can_add());
create policy "trial over: read only" on public.step_logs as restrictive for insert to authenticated with check (public.can_add());

grant select, insert, update, delete on public.cardio_plans, public.cardio_sessions, public.cardio_logs, public.step_logs to authenticated;
