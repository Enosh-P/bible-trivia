-- Push notifications (web push to installed PWAs and browsers).
--   push_subscriptions  one row per device that allowed notifications
--   notification_prefs  what each person wants, when, in which language and time zone
--   notification_queue  messages waiting to be sent by the `push` Edge Function
--   notification_log    one scheduled message of each kind per person per day
-- Friend events are queued by triggers; daily ones by queue_scheduled_notifications(),
-- which Supabase Cron runs every 30 minutes through the `push` function.

create table if not exists push_subscriptions (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now(),
  last_ok_at  timestamptz
);
create index if not exists push_subscriptions_user_idx on push_subscriptions (user_id);

create table if not exists notification_prefs (
  user_id        uuid primary key references profiles(id) on delete cascade,
  daily_verse    boolean not null default true,
  verse_hour     smallint not null default 7 check (verse_hour between 0 and 23),
  daily_reminder boolean not null default true,
  reminder_hour  smallint not null default 19 check (reminder_hour between 0 and 23),
  streak         boolean not null default true,
  friends        boolean not null default true,
  lang           text not null default 'en' check (lang in ('en', 'ta')),
  time_zone      text not null default 'Asia/Kolkata',
  updated_at     timestamptz not null default now()
);

create table if not exists notification_queue (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references profiles(id) on delete cascade,
  kind       text not null check (kind in ('daily_verse', 'daily_reminder', 'streak_rescue',
                                           'friend_request', 'friend_accepted', 'challenge_received', 'challenge_finished')),
  payload    jsonb not null default '{}',
  created_at timestamptz not null default now(),
  sent_at    timestamptz,
  attempts   smallint not null default 0
);
create index if not exists notification_queue_unsent_idx on notification_queue (created_at) where sent_at is null;

create table if not exists notification_log (
  user_id uuid not null references profiles(id) on delete cascade,
  kind    text not null,
  day     date not null,
  primary key (user_id, kind, day)
);

-- ---------- Access: people manage only their own devices and settings ----------
alter table push_subscriptions enable row level security;
alter table notification_prefs enable row level security;
alter table notification_queue enable row level security;  -- no player policies: server only
alter table notification_log enable row level security;    -- no player policies: server only

drop policy if exists "own subscriptions" on push_subscriptions;
create policy "own subscriptions" on push_subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own notification prefs" on notification_prefs;
create policy "own notification prefs" on notification_prefs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on push_subscriptions, notification_prefs to authenticated;

-- ---------- Friend events → queue (only for people who want them and have a device) ----------
create or replace function wants_friend_pushes(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from notification_prefs where user_id = p_user and friends)
     and exists (select 1 from push_subscriptions where user_id = p_user);
$$;

create or replace function queue_friendship_push() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' and wants_friend_pushes(new.addressee) then
    insert into notification_queue (user_id, kind, payload)
    select new.addressee, 'friend_request', jsonb_build_object('name', display_name)
    from profiles where id = new.requester;
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted' and wants_friend_pushes(new.requester) then
    insert into notification_queue (user_id, kind, payload)
    select new.requester, 'friend_accepted', jsonb_build_object('name', display_name)
    from profiles where id = new.addressee;
  end if;
  return new;
end $$;

drop trigger if exists friendships_push on friendships;
create trigger friendships_push after insert or update on friendships
  for each row execute function queue_friendship_push();

create or replace function queue_challenge_push() returns trigger
language plpgsql security definer set search_path = public as $$
declare c challenges;
begin
  select * into c from challenges where id = new.challenge_id;
  if tg_op = 'INSERT' then
    if new.user_id <> c.created_by and wants_friend_pushes(new.user_id) then
      insert into notification_queue (user_id, kind, payload)
      select new.user_id, 'challenge_received', jsonb_build_object('name', display_name, 'mode', c.mode, 'challenge_id', c.id)
      from profiles where id = c.created_by;
    end if;
  elsif old.finished_at is null and new.finished_at is not null
        and not exists (select 1 from challenge_players where challenge_id = new.challenge_id and finished_at is null) then
    -- The last player just finished: tell everyone the result.
    insert into notification_queue (user_id, kind, payload)
    select cp.user_id, 'challenge_finished', jsonb_build_object(
      'mode', c.mode, 'challenge_id', c.id,
      'winner', (select p.display_name from challenge_players x join profiles p on p.id = x.user_id
                 where x.challenge_id = c.id order by x.score desc nulls last limit 1),
      'scores', (select string_agg(p.display_name || ' ' || x.score, ' · ' order by x.score desc)
                 from challenge_players x join profiles p on p.id = x.user_id where x.challenge_id = c.id))
    from challenge_players cp
    where cp.challenge_id = c.id and wants_friend_pushes(cp.user_id);
  end if;
  return new;
end $$;

drop trigger if exists challenge_players_push on challenge_players;
create trigger challenge_players_push after insert or update on challenge_players
  for each row execute function queue_challenge_push();

-- ---------- Daily messages (run every 30 minutes by cron via the push function) ----------
-- Each person's own clock: fires in the first half hour of the chosen hour, once a day.
create or replace function queue_scheduled_notifications(p_now timestamptz default now()) returns integer
language plpgsql security definer set search_path = public as $$
declare queued integer;
begin
  with people as (
    select np.*, pr.streak as streak_days, pr.last_day,
           (p_now at time zone np.time_zone) as local_now,
           (p_now at time zone np.time_zone)::date as local_day
    from notification_prefs np
    join profiles pr on pr.id = np.user_id
    where exists (select 1 from push_subscriptions s where s.user_id = np.user_id)
  ),
  due as (
    select user_id, 'daily_verse' as kind, local_day, jsonb_build_object('day', local_day) as payload
    from people
    where daily_verse and extract(hour from local_now) = verse_hour and extract(minute from local_now) < 30
    union all
    select user_id, 'daily_reminder', local_day, jsonb_build_object('day', local_day)
    from people p
    where daily_reminder and extract(hour from local_now) = reminder_hour and extract(minute from local_now) < 30
      and not exists (select 1 from daily_results d where d.user_id = p.user_id and d.day = p.local_day)
    union all
    -- 8 pm (9 pm if the reminder is already at 8): the streak ends at midnight.
    select user_id, 'streak_rescue', local_day, jsonb_build_object('day', local_day, 'streak', streak_days)
    from people
    where streak and streak_days >= 2
      and extract(hour from local_now) = case when reminder_hour = 20 then 21 else 20 end
      and extract(minute from local_now) < 30
      and last_day = local_day - 1
  ),
  logged as (
    insert into notification_log (user_id, kind, day)
    select user_id, kind, local_day from due
    on conflict do nothing
    returning user_id, kind, day
  )
  insert into notification_queue (user_id, kind, payload)
  select d.user_id, d.kind, d.payload
  from due d join logged l on l.user_id = d.user_id and l.kind = d.kind and l.day = d.local_day;
  get diagnostics queued = row_count;

  -- Housekeeping: drop sent messages after a week, and old log rows.
  delete from notification_queue where sent_at < p_now - interval '7 days';
  delete from notification_log where day < (p_now - interval '14 days')::date;
  return queued;
end $$;

revoke all on function queue_scheduled_notifications(timestamptz), wants_friend_pushes(uuid),
  queue_friendship_push(), queue_challenge_push() from public, anon, authenticated;

-- The push Edge Function uses the secret key (service_role).
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function queue_scheduled_notifications(timestamptz) to service_role;
    grant execute on function apply_machine_tamil(jsonb) to service_role;
    grant select, insert, update, delete on push_subscriptions, notification_prefs, notification_queue, notification_log to service_role;
  end if;
end $$;
