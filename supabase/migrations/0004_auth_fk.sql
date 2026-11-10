-- Supabase-only: link application profiles to Supabase Auth users.
-- The local development database has no auth.users table, so this is skipped
-- there. Run after 0001 on a real Supabase project.

do $$
begin
  if to_regclass('auth.users') is not null
     and not exists (
       select 1 from pg_constraint where conname = 'profiles_id_auth_fkey'
     ) then
    alter table public.profiles
      add constraint profiles_id_auth_fkey
      foreign key (id) references auth.users (id) on delete cascade;
  end if;
end;
$$;
