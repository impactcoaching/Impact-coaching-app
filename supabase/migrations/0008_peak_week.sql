-- Stage 5: peak week. Everything here is typed by Adam. Nothing is calculated or suggested,
-- and the AI features never read or write these tables.

create table public.peak_weeks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  show_date date not null,
  is_live boolean not null default false,   -- the client only sees it once Adam turns it on
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index peak_weeks_client on public.peak_weeks (client_id, show_date desc);
create trigger peak_weeks_touch before update on public.peak_weeks for each row execute function public.touch_updated_at();

-- One row per day. day_offset 0 = show day, -6 = a week before, 1 = the day after.
create table public.peak_days (
  id uuid primary key default gen_random_uuid(),
  peak_week_id uuid not null references public.peak_weeks (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  day_offset int not null check (day_offset between -13 and 1),
  carbs_g int check (carbs_g between 0 and 2000),
  protein_g int check (protein_g between 0 and 1000),
  fat_g int check (fat_g between 0 and 500),
  water_ml int check (water_ml between 0 and 20000),
  sodium_mg int check (sodium_mg between 0 and 20000),
  training text,
  note text,
  unique (peak_week_id, day_offset)
);
create index peak_days_week on public.peak_days (peak_week_id, day_offset);

alter table public.peak_weeks enable row level security;
create policy "peak weeks: client reads own live, coach reads all" on public.peak_weeks for select
  using (public.is_coach() or (client_id = auth.uid() and is_live));
create policy "peak weeks: coach inserts" on public.peak_weeks for insert with check (public.is_coach());
create policy "peak weeks: coach updates" on public.peak_weeks for update using (public.is_coach());
create policy "peak weeks: coach deletes" on public.peak_weeks for delete using (public.is_coach());

alter table public.peak_days enable row level security;
create policy "peak days: client reads own live, coach reads all" on public.peak_days for select
  using (public.is_coach() or (client_id = auth.uid()
    and exists (select 1 from public.peak_weeks w where w.id = peak_week_id and w.is_live and w.client_id = auth.uid())));
create policy "peak days: coach inserts" on public.peak_days for insert with check (public.is_coach());
create policy "peak days: coach updates" on public.peak_days for update using (public.is_coach());
create policy "peak days: coach deletes" on public.peak_days for delete using (public.is_coach());

grant select, insert, update, delete on public.peak_weeks, public.peak_days to authenticated;
