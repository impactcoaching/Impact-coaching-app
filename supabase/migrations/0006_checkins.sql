-- Stage 4: check-ins, progress photos and messages.

-- ---------- per-client check-in settings (coach sets) ----------
create table public.client_settings (
  client_id uuid primary key references public.profiles (id) on delete cascade,
  checkin_module text not null default 'general'
    check (checkin_module in ('general', 'fat_loss', 'off_season', 'prep_female', 'prep_male')),
  measurements boolean not null default false,  -- body measurements in the check-in (per client, never assumed)
  poses text[],                                -- photo poses; null = use the template for their division
  checkin_day int check (checkin_day between 1 and 7), -- suggested day; clients can still check in any day
  updated_at timestamptz not null default now()
);
create trigger client_settings_touch before update on public.client_settings for each row execute function public.touch_updated_at();

alter table public.client_settings enable row level security;
create policy "client settings: read own or coach" on public.client_settings for select using (client_id = auth.uid() or public.is_coach());
create policy "client settings: coach inserts" on public.client_settings for insert with check (public.is_coach());
create policy "client settings: coach updates" on public.client_settings for update using (public.is_coach());

-- ---------- check-ins ----------
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  module text not null default 'general',
  weight_kg numeric(5,1),
  answers jsonb not null default '{}'::jsonb,        -- general questions (scores 1 to 10, sleep, wins, what was hard, notes)
  module_answers jsonb not null default '{}'::jsonb, -- goal module questions
  measurements jsonb,                                -- cm, only when the coach has turned measurements on
  cycle jsonb,                                       -- only for clients who opted in to cycle tracking
  coach_seen_at timestamptz,
  coach_reply text,
  reply_video_path text,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);
create index checkins_client on public.checkins (client_id, created_at desc);
create index checkins_unseen on public.checkins (created_at desc) where coach_seen_at is null;

alter table public.checkins enable row level security;
create policy "checkins: read own or coach" on public.checkins for select using (client_id = auth.uid() or public.is_coach());
create policy "checkins: client inserts own" on public.checkins for insert with check (client_id = auth.uid() and coach_reply is null and coach_seen_at is null);
create policy "checkins: coach updates" on public.checkins for update using (public.is_coach());

-- ---------- progress photos ----------
create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  checkin_id uuid references public.checkins (id) on delete set null,
  taken_on date not null,
  pose text not null,
  path text not null,
  created_at timestamptz not null default now()
);
create index progress_photos_client on public.progress_photos (client_id, pose, taken_on desc);

alter table public.progress_photos enable row level security;
create policy "photos: read own or coach" on public.progress_photos for select using (client_id = auth.uid() or public.is_coach());
create policy "photos: client inserts own" on public.progress_photos for insert with check (client_id = auth.uid());
create policy "photos: client deletes own" on public.progress_photos for delete using (client_id = auth.uid());

-- ---------- messages (one conversation per client, with the coach) ----------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade, -- whose conversation
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text,
  attachment_path text,
  attachment_type text check (attachment_type in ('image', 'video')),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (body is not null or attachment_path is not null)
);
create index messages_client on public.messages (client_id, created_at desc);

alter table public.messages enable row level security;
create policy "messages: read own or coach" on public.messages for select using (client_id = auth.uid() or public.is_coach());
create policy "messages: send in own conversation" on public.messages for insert
  with check (sender_id = auth.uid() and (client_id = auth.uid() or public.is_coach()) and read_at is null);
-- Either side marks the other side's messages as read.
create policy "messages: mark read" on public.messages for update
  using ((client_id = auth.uid() or public.is_coach()) and sender_id <> auth.uid());

grant select, insert, update, delete on public.client_settings, public.checkins, public.progress_photos, public.messages to authenticated;

-- Only read_at may change when marking a message read.
create function public.guard_message_update() returns trigger language plpgsql as $$
begin
  if new.body is distinct from old.body or new.attachment_path is distinct from old.attachment_path
     or new.sender_id <> old.sender_id or new.client_id <> old.client_id or new.created_at <> old.created_at then
    raise exception 'Messages cannot be edited';
  end if;
  return new;
end;
$$;
create trigger messages_guard before update on public.messages for each row execute function public.guard_message_update();

-- ---------- private storage ----------
-- progress-photos/<client id>/<file>: client uploads own; coach reads.
-- checkin-replies/<client id>/<file>: coach uploads video replies; the client reads their own.
-- message-files/<client id>/<file>: both sides upload into the client's folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('progress-photos', 'progress-photos', false, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']),
  ('checkin-replies', 'checkin-replies', false, 52428800, array['video/mp4', 'video/quicktime', 'video/webm']),
  ('message-files', 'message-files', false, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do nothing;

create policy "progress photos: client uploads own" on storage.objects for insert to authenticated
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "progress photos: client or coach reads" on storage.objects for select to authenticated
  using (bucket_id = 'progress-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_coach()));
create policy "progress photos: client deletes own" on storage.objects for delete to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "checkin replies: coach uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'checkin-replies' and public.is_coach());
create policy "checkin replies: client or coach reads" on storage.objects for select to authenticated
  using (bucket_id = 'checkin-replies' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_coach()));

create policy "message files: own folder or coach uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'message-files' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_coach()));
create policy "message files: own folder or coach reads" on storage.objects for select to authenticated
  using (bucket_id = 'message-files' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_coach()));
