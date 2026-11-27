-- 0010: end coaching and delete a client permanently (Adam, 27 Nov 2026).
-- Safe to run more than once.

-- The coach can delete a client's files in every bucket (needed to wipe them on permanent delete).
drop policy if exists "coach deletes client files" on storage.objects;
create policy "coach deletes client files" on storage.objects for delete to authenticated
  using (bucket_id in ('set-videos', 'menu-photos', 'progress-photos', 'checkin-replies', 'message-files') and public.is_coach());

-- Permanently delete a client's account. Every table that belongs to a client is set to
-- "on delete cascade", so removing the sign-in account removes all their rows too.
-- Files are removed by the app first (Supabase doesn't allow deleting files from SQL).
create or replace function public.delete_client(target uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_coach() then
    raise exception 'Only the coach can delete clients';
  end if;
  if not exists (select 1 from public.profiles where id = target and role = 'client') then
    raise exception 'Client not found';
  end if;
  delete from auth.users where id = target;
end;
$$;

revoke all on function public.delete_client(uuid) from public, anon;
grant execute on function public.delete_client(uuid) to authenticated;
