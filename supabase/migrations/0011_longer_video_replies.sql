-- 0011: allow check-in video replies up to 200 MB (Adam, 27 Nov 2026). Needs Supabase Pro.
-- Also raise the project-wide limit: Storage > Settings > Upload file size limit, to at least 200 MB.
update storage.buckets set file_size_limit = 209715200 where id = 'checkin-replies';
