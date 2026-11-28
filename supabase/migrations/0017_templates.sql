-- Templates library: ready-made training programmes and nutrition plans in the coach's Library.
-- Adam copies a template onto a client in one tap, then tweaks it. It's a copy, not a link,
-- so editing a template never changes a client's plan, and editing a client's plan never changes the template.
--
-- The plan itself lives in `body` (jsonb), in the same shape as a client's programme or nutrition plan.
-- Exercises and foods can be given by id or by name, so templates are easy to load with SQL:
-- see supabase/templates/README.md for the shape and an example.

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('training', 'nutrition')),
  name text not null check (char_length(name) between 1 and 80),
  summary text check (char_length(summary) <= 300),        -- one line shown on the card
  goal text check (char_length(goal) <= 40),               -- e.g. Fat loss, Muscle gain, Glutes and legs
  level text check (level in ('Beginner', 'Intermediate', 'Advanced')),
  location text check (location in ('Gym', 'Home', 'Any')),  -- training only
  audience text not null default 'any' check (audience in ('any', 'female', 'male')),
  competitor text not null default 'any' check (competitor in ('any', 'yes', 'no')),
  tags text[] not null default '{}',                       -- anything else, e.g. {bikini, vegetarian}
  self_guided boolean not null default false,              -- could be offered in the self-guided tier later
  body jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index templates_kind on public.templates (kind, name);
create trigger templates_touch before update on public.templates for each row execute function public.touch_updated_at();

-- Row level security. Templates belong to no client, so only the coach can see or change them.
-- (A self-guided tier later would add a read policy for self_guided templates.)
alter table public.templates enable row level security;
create policy "templates: coach reads" on public.templates for select using (public.is_coach());
create policy "templates: coach inserts" on public.templates for insert with check (public.is_coach());
create policy "templates: coach updates" on public.templates for update using (public.is_coach());
create policy "templates: coach deletes" on public.templates for delete using (public.is_coach());

grant select, insert, update, delete on public.templates to authenticated;
