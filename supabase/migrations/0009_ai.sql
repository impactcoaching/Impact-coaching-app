-- Stage 5: AI. Restaurant dishes logged from a menu photo are estimates with no weight in grams.
alter table public.food_logs alter column grams drop not null;
