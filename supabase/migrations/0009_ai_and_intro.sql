-- Stage 5: AI and the intro reel. Safe to run more than once.

-- Restaurant dishes logged from a menu photo are estimates with no weight in grams.
alter table public.food_logs alter column grams drop not null;

-- When the client watched (or skipped) the intro reel, so it only plays once.
alter table public.profiles add column if not exists intro_seen_at timestamptz;
