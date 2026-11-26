-- Newer Supabase projects don't always give the app's signed-in role access
-- to tables made in the SQL Editor. Grant it explicitly. Row level security
-- still decides which rows each person can see; anonymous visitors get nothing.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant execute on functions to authenticated;
