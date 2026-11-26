-- Adam's own questions per client, added to their check-in (as in the check-in mock-up).
-- Safe to run more than once.
alter table public.client_settings add column if not exists custom_questions text[] not null default '{}';
-- Answers keep the question text, so changing a question later doesn't muddle old check-ins.
alter table public.checkins add column if not exists custom_answers jsonb not null default '[]'::jsonb;
