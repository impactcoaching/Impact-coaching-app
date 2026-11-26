-- Sex, asked at sign-up. Cycle tracking is offered to female clients only (Adam, 26 Nov 2026).
alter table public.client_intake add column if not exists sex text check (sex in ('female', 'male'));
