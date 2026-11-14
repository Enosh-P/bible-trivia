-- Admins: people who may write Daily Thoughts (and, later, Gospel Q&A).
-- Set it by hand for your own account: Supabase → Table editor → profiles →
-- your row → is_admin = true. Nobody can make themselves an admin from the app.

alter table profiles add column if not exists is_admin boolean not null default false;

-- Requests from the app run as "authenticated" (or "anon"); for those the flag
-- is frozen. The Table editor and SQL editor (postgres) and the service role can change it.
create or replace function protect_is_admin() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.is_admin := false;
    else
      new.is_admin := old.is_admin;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect_is_admin on profiles;
create trigger profiles_protect_is_admin
  before insert or update on profiles
  for each row execute function protect_is_admin();

-- "Is the signed-in person an admin?" for row level security policies.
-- security definer: reads the flag without opening profiles to everyone.
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_admin from profiles p where p.id = auth.uid()), false);
$$;
revoke all on function is_admin() from public;
grant execute on function is_admin() to authenticated, service_role;
