-- Accounts, friends and challenges.
--   - A profile is created automatically when someone signs up (Supabase Auth).
--   - Everyone gets a 6-character friend code to share with family.
--   - Friends can challenge each other: same questions, play any time, compare scores.
-- All writes go through the functions below (security definer), which check
-- who is calling; tables are read-only for players and limited to their own rows.

-- ---------- Profiles ----------
alter table profiles add column if not exists friend_code text;
alter table profiles add column if not exists avatar text not null default 'pale'
  check (avatar in ('white', 'red', 'black', 'pale'));
alter table profiles add column if not exists updated_at timestamptz not null default now();
create unique index if not exists profiles_friend_code_idx on profiles (friend_code);

create or replace function new_friend_code() returns text
language plpgsql volatile set search_path = public as $$
declare c text;
begin
  loop
    -- 6 characters from 0-9 and A-F: about 16 million codes, no look-alike O/I/L.
    c := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from profiles where friend_code = c);
  end loop;
  return c;
end $$;

update profiles set friend_code = new_friend_code() where friend_code is null;

-- New sign-up → profile, using the name given in the sign-up form.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name, ui_lang, friend_code)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Player'), 32),
    case when new.raw_user_meta_data->>'ui_lang' = 'ta' then 'ta' else 'en' end,
    new_friend_code()
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Profiles for people who signed up before this migration.
insert into profiles (id, display_name, friend_code)
select u.id, left(coalesce(nullif(split_part(coalesce(u.email, ''), '@', 1), ''), 'Player'), 32), new_friend_code()
from auth.users u
where not exists (select 1 from profiles p where p.id = u.id);

-- ---------- Friends ----------
create table if not exists friendships (
  requester    uuid not null references profiles(id) on delete cascade,
  addressee    uuid not null references profiles(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  primary key (requester, addressee),
  check (requester <> addressee)
);
-- One friendship per pair, whichever direction it was asked in.
create unique index if not exists friendships_pair_idx
  on friendships (least(requester, addressee), greatest(requester, addressee));
create index if not exists friendships_addressee_idx on friendships (addressee);

alter table friendships enable row level security;
drop policy if exists "see own friendships" on friendships;
create policy "see own friendships" on friendships for select
  using (auth.uid() in (requester, addressee));
grant select on friendships to authenticated;

create or replace function is_friend(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from friendships
    where status = 'accepted'
      and ((requester = auth.uid() and addressee = other) or (addressee = auth.uid() and requester = other))
  );
$$;

-- Send a request by friend code. If they already asked you, you become friends.
create or replace function send_friend_request(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); them uuid; existing friendships;
begin
  if me is null then return 'signed_out'; end if;
  select id into them from profiles where friend_code = upper(trim(p_code));
  if them is null then return 'not_found'; end if;
  if them = me then return 'self'; end if;
  select * into existing from friendships
   where (requester = me and addressee = them) or (requester = them and addressee = me);
  if found then
    if existing.status = 'accepted' then return 'already_friends'; end if;
    if existing.requester = them then
      update friendships set status = 'accepted', responded_at = now()
       where requester = them and addressee = me;
      return 'accepted';
    end if;
    return 'already_sent';
  end if;
  insert into friendships (requester, addressee) values (me, them);
  return 'sent';
end $$;

create or replace function respond_friend_request(p_from uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_accept then
    update friendships set status = 'accepted', responded_at = now()
     where requester = p_from and addressee = auth.uid() and status = 'pending';
  else
    delete from friendships where requester = p_from and addressee = auth.uid() and status = 'pending';
  end if;
end $$;

-- Unfriend, cancel a sent request, or decline.
create or replace function remove_friend(p_other uuid) returns void
language sql security definer set search_path = public as $$
  delete from friendships
   where (requester = auth.uid() and addressee = p_other) or (requester = p_other and addressee = auth.uid());
$$;

-- Everyone you are connected to, with what the app shows about them.
create or replace function my_friends()
returns table (user_id uuid, display_name text, avatar text, friend_code text, xp integer, streak integer,
               status text, incoming boolean, since timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.avatar,
         case when f.status = 'accepted' then p.friend_code end,
         case when f.status = 'accepted' then p.xp end,
         case when f.status = 'accepted' then p.streak end,
         f.status, f.addressee = auth.uid(), coalesce(f.responded_at, f.created_at)
  from friendships f
  join profiles p on p.id = case when f.requester = auth.uid() then f.addressee else f.requester end
  where auth.uid() in (f.requester, f.addressee)
  order by f.status desc, p.display_name;
$$;

-- Today's Daily Challenge: you and your friends.
create or replace function friends_daily_board(p_day date default current_date)
returns table (rank bigint, user_id uuid, display_name text, avatar text, score integer, correct smallint, total smallint, is_me boolean)
language sql stable security definer set search_path = public as $$
  with circle as (
    select auth.uid() as id
    union
    select case when requester = auth.uid() then addressee else requester end
    from friendships where status = 'accepted' and auth.uid() in (requester, addressee)
  )
  select rank() over (order by d.score desc, d.created_at), p.id, p.display_name, p.avatar,
         d.score, d.correct, d.total, p.id = auth.uid()
  from circle c
  join daily_results d on d.user_id = c.id and d.day = p_day
  join profiles p on p.id = c.id
  order by d.score desc, d.created_at;
$$;

-- ---------- Challenges ----------
create table if not exists challenges (
  id           uuid primary key default gen_random_uuid(),
  created_by   uuid not null references profiles(id) on delete cascade,
  mode         text not null check (char_length(mode) <= 20),
  question_ids text[] not null check (array_length(question_ids, 1) between 1 and 30),
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '14 days'
);
create table if not exists challenge_players (
  challenge_id uuid not null references challenges(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  score        integer check (score between 0 and 3000),
  correct      smallint,
  total        smallint,
  finished_at  timestamptz,
  primary key (challenge_id, user_id)
);
create index if not exists challenge_players_user_idx on challenge_players (user_id, finished_at);

alter table challenges enable row level security;
alter table challenge_players enable row level security;

create or replace function in_challenge(p_challenge uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from challenge_players where challenge_id = p_challenge and user_id = auth.uid());
$$;

drop policy if exists "players see their challenges" on challenges;
create policy "players see their challenges" on challenges for select using (in_challenge(id));
drop policy if exists "players see fellow players" on challenge_players;
create policy "players see fellow players" on challenge_players for select using (in_challenge(challenge_id));
grant select on challenges, challenge_players to authenticated;

-- Start a challenge with up to 10 friends. Returns its id.
create or replace function create_challenge(p_mode text, p_question_ids text[], p_friends uuid[]) returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); cid uuid; f uuid;
begin
  if me is null then raise exception 'sign in first'; end if;
  if coalesce(array_length(p_friends, 1), 0) not between 1 and 10 then raise exception 'choose 1 to 10 friends'; end if;
  foreach f in array p_friends loop
    if not is_friend(f) then raise exception 'you can only challenge friends'; end if;
  end loop;
  insert into challenges (created_by, mode, question_ids) values (me, p_mode, p_question_ids) returning id into cid;
  insert into challenge_players (challenge_id, user_id)
  select cid, u from unnest(array_append(p_friends, me)) as u
  on conflict do nothing;
  return cid;
end $$;

-- Record your score once.
create or replace function submit_challenge_result(p_challenge uuid, p_score integer, p_correct integer, p_total integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  update challenge_players
     set score = least(greatest(p_score, 0), 3000), correct = p_correct, total = p_total, finished_at = now()
   where challenge_id = p_challenge and user_id = auth.uid() and finished_at is null;
  if not found then raise exception 'not your challenge, or already played'; end if;
end $$;

-- Your challenges with every player's name and result.
create or replace function my_challenges()
returns table (id uuid, mode text, question_ids text[], created_at timestamptz, expires_at timestamptz,
               created_by uuid, players jsonb)
language sql stable security definer set search_path = public as $$
  select c.id, c.mode, c.question_ids, c.created_at, c.expires_at, c.created_by,
         jsonb_agg(jsonb_build_object(
           'user_id', p.id, 'name', p.display_name, 'avatar', p.avatar, 'me', p.id = auth.uid(),
           'score', cp.score, 'correct', cp.correct, 'total', cp.total, 'finished_at', cp.finished_at
         ) order by cp.score desc nulls last, p.display_name)
  from challenges c
  join challenge_players cp on cp.challenge_id = c.id
  join profiles p on p.id = cp.user_id
  where in_challenge(c.id) and c.created_at > now() - interval '30 days'
  group by c.id
  order by c.created_at desc
  limit 50;
$$;

-- ---------- Access ----------
revoke all on function send_friend_request(text), respond_friend_request(uuid, boolean), remove_friend(uuid),
  my_friends(), friends_daily_board(date), create_challenge(text, text[], uuid[]),
  submit_challenge_result(uuid, integer, integer, integer), my_challenges(), is_friend(uuid), in_challenge(uuid)
  from public, anon;
grant execute on function send_friend_request(text), respond_friend_request(uuid, boolean), remove_friend(uuid),
  my_friends(), friends_daily_board(date), create_challenge(text, text[], uuid[]),
  submit_challenge_result(uuid, integer, integer, integer), my_challenges(), is_friend(uuid), in_challenge(uuid)
  to authenticated;
revoke all on function new_friend_code(), handle_new_user() from public, anon, authenticated;

-- Players may edit only their name and avatar (xp and streak are synced by the app too).
drop policy if exists "update own profile" on profiles;
create policy "update own profile" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);
