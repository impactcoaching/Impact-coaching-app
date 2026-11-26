-- Stage 2: training.
-- Exercise library, programmes written by the coach, and what clients log.

-- ---------- exercise library ----------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  muscle text not null,
  equipment text[] not null default '{}',   -- keys from the equipment list; all are needed
  demo_url text,                            -- stock demo (WorkoutX) or the coach's own video
  cues text,
  created_at timestamptz not null default now()
);

alter table public.exercises enable row level security;
create policy "exercises: anyone signed in can read" on public.exercises for select using (auth.uid() is not null);
create policy "exercises: coach writes" on public.exercises for insert with check (public.is_coach());
create policy "exercises: coach updates" on public.exercises for update using (public.is_coach());
create policy "exercises: coach deletes" on public.exercises for delete using (public.is_coach());

-- ---------- programmes ----------
create table public.programmes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  name text not null default 'Training programme',
  notes text,
  is_live boolean not null default false,   -- the client only sees a live programme
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index programmes_client on public.programmes (client_id);
create trigger programmes_touch before update on public.programmes for each row execute function public.touch_updated_at();

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  position int not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
create index workouts_programme on public.workouts (programme_id, position);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  position int not null default 0,
  linked_to_previous boolean not null default false,  -- superset / tri-set / giant set with the one above
  warmup_sets int not null default 0 check (warmup_sets between 0 and 10),
  work_sets int not null default 3 check (work_sets between 1 and 20),
  reps_type text not null default 'range' check (reps_type in ('fixed', 'range', 'amrap', 'time')),
  reps_min int,
  reps_max int,
  tempo text,                                -- e.g. 3-1-1-0
  effort_type text not null default 'RIR' check (effort_type in ('RIR', 'RPE', '%1RM', 'Weight')),
  effort_value text,
  rest_seconds int not null default 90 check (rest_seconds between 0 and 900),
  -- Intensifier sits beside its set. {type: drop|rp|cluster|myo|partials, ...settings}
  intensifier jsonb,
  intensifier_on text not null default 'last' check (intensifier_on in ('last', 'all')),
  film_set int,                              -- which work set the client films for the coach
  notes text,
  swap_exercise_id uuid references public.exercises (id),
  created_at timestamptz not null default now()
);
create index workout_exercises_workout on public.workout_exercises (workout_id, position);

-- The client sees their programme only once it's live. The coach sees and writes everything.
alter table public.programmes enable row level security;
create policy "programmes: client reads own live, coach reads all" on public.programmes for select
  using (public.is_coach() or (client_id = auth.uid() and is_live));
create policy "programmes: coach inserts" on public.programmes for insert with check (public.is_coach());
create policy "programmes: coach updates" on public.programmes for update using (public.is_coach());
create policy "programmes: coach deletes" on public.programmes for delete using (public.is_coach());

alter table public.workouts enable row level security;
create policy "workouts: client reads own live, coach reads all" on public.workouts for select
  using (public.is_coach() or (client_id = auth.uid() and exists (select 1 from public.programmes p where p.id = programme_id and p.is_live)));
create policy "workouts: coach inserts" on public.workouts for insert with check (public.is_coach());
create policy "workouts: coach updates" on public.workouts for update using (public.is_coach());
create policy "workouts: coach deletes" on public.workouts for delete using (public.is_coach());

alter table public.workout_exercises enable row level security;
create policy "workout exercises: client reads own live, coach reads all" on public.workout_exercises for select
  using (public.is_coach() or (client_id = auth.uid() and exists (
    select 1 from public.workouts w join public.programmes p on p.id = w.programme_id where w.id = workout_id and p.is_live)));
create policy "workout exercises: coach inserts" on public.workout_exercises for insert with check (public.is_coach());
create policy "workout exercises: coach updates" on public.workout_exercises for update using (public.is_coach());
create policy "workout exercises: coach deletes" on public.workout_exercises for delete using (public.is_coach());

-- ---------- what clients log ----------
create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  workout_id uuid references public.workouts (id) on delete set null,
  workout_name text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  client_note text,
  coach_seen_at timestamptz
);
create index workout_logs_client on public.workout_logs (client_id, started_at desc);

create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references public.workout_logs (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  workout_exercise_id uuid references public.workout_exercises (id) on delete set null,
  exercise_name text not null,
  set_kind text not null check (set_kind in ('warmup', 'work')),
  set_number int not null,
  weight_kg numeric(6,2),
  reps int,
  effort text,
  intensifier_done boolean not null default false,
  video_path text,
  created_at timestamptz not null default now(),
  unique (log_id, workout_exercise_id, set_kind, set_number)
);
create index set_logs_exercise on public.set_logs (client_id, workout_exercise_id, created_at desc);

alter table public.workout_logs enable row level security;
create policy "workout logs: read own or coach" on public.workout_logs for select using (client_id = auth.uid() or public.is_coach());
create policy "workout logs: client inserts own" on public.workout_logs for insert with check (client_id = auth.uid());
create policy "workout logs: client or coach updates" on public.workout_logs for update using (client_id = auth.uid() or public.is_coach());
create policy "workout logs: client deletes own" on public.workout_logs for delete using (client_id = auth.uid());

alter table public.set_logs enable row level security;
create policy "set logs: read own or coach" on public.set_logs for select using (client_id = auth.uid() or public.is_coach());
create policy "set logs: client inserts own" on public.set_logs for insert
  with check (client_id = auth.uid() and exists (select 1 from public.workout_logs l where l.id = log_id and l.client_id = auth.uid()));
create policy "set logs: client updates own" on public.set_logs for update using (client_id = auth.uid());
create policy "set logs: client deletes own" on public.set_logs for delete using (client_id = auth.uid());

grant select, insert, update, delete on public.exercises, public.programmes, public.workouts, public.workout_exercises, public.workout_logs, public.set_logs to authenticated;

-- ---------- set videos (private storage) ----------
-- Files live at set-videos/<client id>/<file>. Clients upload into their own folder; the coach can read all.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('set-videos', 'set-videos', false, 104857600, array['video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do nothing;

create policy "set videos: client uploads own" on storage.objects for insert to authenticated
  with check (bucket_id = 'set-videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "set videos: client or coach reads" on storage.objects for select to authenticated
  using (bucket_id = 'set-videos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_coach()));
create policy "set videos: client deletes own" on storage.objects for delete to authenticated
  using (bucket_id = 'set-videos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- starter exercise library ----------
insert into public.exercises (name, muscle, equipment) values
 ('Barbell back squat', 'Quads', '{barbell,rack}'),
 ('Hack squat', 'Quads', '{hacksquat}'),
 ('Leg press', 'Quads', '{legpress}'),
 ('Leg extension', 'Quads', '{legext}'),
 ('Goblet squat', 'Quads', '{db}'),
 ('Bulgarian split squat', 'Quads', '{db,bench}'),
 ('Walking lunge', 'Quads', '{db}'),
 ('Smith machine squat', 'Quads', '{smith}'),
 ('Romanian deadlift', 'Hamstrings', '{barbell}'),
 ('Dumbbell Romanian deadlift', 'Hamstrings', '{db}'),
 ('Seated leg curl', 'Hamstrings', '{legcurl}'),
 ('Lying leg curl', 'Hamstrings', '{legcurl}'),
 ('Smith machine hip thrust', 'Glutes', '{smith,bench}'),
 ('Barbell hip thrust', 'Glutes', '{barbell,bench}'),
 ('Machine hip thrust', 'Glutes', '{hipthrust}'),
 ('Cable kickback', 'Glutes', '{cable}'),
 ('Hip abduction machine', 'Glutes', '{abductor}'),
 ('45° back extension', 'Glutes', '{backext}'),
 ('Banded glute bridge', 'Glutes', '{bands}'),
 ('Frog pumps', 'Glutes', '{}'),
 ('Barbell bench press', 'Chest', '{barbell,bench,rack}'),
 ('Incline dumbbell press', 'Chest', '{db,adjbench}'),
 ('Machine chest press', 'Chest', '{chestpress}'),
 ('Pec deck', 'Chest', '{pecdeck}'),
 ('Cable fly', 'Chest', '{cable}'),
 ('Push-up', 'Chest', '{}'),
 ('Lat pulldown', 'Back', '{pulldown}'),
 ('Pull-up', 'Back', '{pullup}'),
 ('Seated cable row', 'Back', '{cable}'),
 ('One-arm dumbbell row', 'Back', '{db,bench}'),
 ('Chest-supported dumbbell row', 'Back', '{db,adjbench}'),
 ('Banded row', 'Back', '{bands}'),
 ('Seated dumbbell shoulder press', 'Shoulders', '{db,adjbench}'),
 ('Machine shoulder press', 'Shoulders', '{shpress}'),
 ('Lateral raise', 'Shoulders', '{db}'),
 ('Cable lateral raise', 'Shoulders', '{cable}'),
 ('Rear delt fly', 'Shoulders', '{pecdeck}'),
 ('Face pull', 'Shoulders', '{cable}'),
 ('Cable curl', 'Arms', '{cable}'),
 ('Dumbbell curl', 'Arms', '{db}'),
 ('Rope pushdown', 'Arms', '{cable}'),
 ('Overhead cable extension', 'Arms', '{cable}'),
 ('Dips', 'Arms', '{dip}'),
 ('Hanging knee raise', 'Core', '{pullup}'),
 ('Cable crunch', 'Core', '{cable}'),
 ('Plank', 'Core', '{}'),
 ('Standing calf raise', 'Calves', '{smith}'),
 ('Seated calf raise', 'Calves', '{db}')
on conflict (name) do nothing;
