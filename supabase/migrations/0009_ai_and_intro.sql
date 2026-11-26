-- Stage 5: AI and the intro reel. Safe to run more than once.

-- Restaurant dishes logged from a menu photo are estimates with no weight in grams.
alter table public.food_logs alter column grams drop not null;

-- When the client watched (or skipped) the intro reel, so it only plays once.
alter table public.profiles add column if not exists intro_seen_at timestamptz;

-- One row per AI request, so a client can't run up the AI bill (menu suggestions are capped per day).
create table if not exists public.ai_calls (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('menu', 'programme', 'nutrition')),
  created_at timestamptz not null default now()
);
create index if not exists ai_calls_client on public.ai_calls (client_id, created_at desc);
alter table public.ai_calls enable row level security;
drop policy if exists "ai calls: read own or coach" on public.ai_calls;
create policy "ai calls: read own or coach" on public.ai_calls for select using (client_id = auth.uid() or public.is_coach());
drop policy if exists "ai calls: insert own or coach" on public.ai_calls;
create policy "ai calls: insert own or coach" on public.ai_calls for insert with check (client_id = auth.uid() or public.is_coach());
grant select, insert on public.ai_calls to authenticated;
