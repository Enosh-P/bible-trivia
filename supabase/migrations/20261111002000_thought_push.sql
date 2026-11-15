-- Push notification for a new Daily Thought: each person gets today's post at their
-- Verse of the Day time (or, if it's published later, within half an hour of that,
-- never after 9 pm). Once a day; switchable in Settings -> Notifications.

alter table notification_prefs add column if not exists daily_thought boolean not null default true;

alter table notification_queue drop constraint if exists notification_queue_kind_check;
alter table notification_queue add constraint notification_queue_kind_check
  check (kind in ('daily_verse', 'daily_reminder', 'streak_rescue', 'daily_thought',
                  'friend_request', 'friend_accepted', 'friend_added',
                  'challenge_received', 'challenge_finished'));

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
  reminders as (
    -- one row per person per reminder slot that is due now
    select p.*, slot
    from people p
    cross join lateral (values ('am', p.morning_hour), ('noon', p.afternoon_hour), ('pm', p.reminder_hour)) as s(slot, hour)
    where p.daily_reminder
      and extract(hour from p.local_now) = s.hour and extract(minute from p.local_now) < 30
      -- already played today: nothing to remind
      and p.last_day is distinct from p.local_day
      and not exists (select 1 from daily_results d where d.user_id = p.user_id and d.day = p.local_day)
  ),
  due as (
    select user_id, 'daily_verse' as kind, 'daily_verse' as log_kind, local_day, jsonb_build_object('day', local_day) as payload
    from people
    where daily_verse and extract(hour from local_now) = verse_hour and extract(minute from local_now) < 30
    union all
    -- Daily Thought: a post for today, once it is published, from the Verse of the Day hour until 9 pm.
    select p.user_id, 'daily_thought', 'daily_thought', p.local_day,
           jsonb_build_object('day', p.local_day, 'post', t.id, 'title_en', t.title_en, 'title_ta', t.title_ta,
                              'body_en', left(t.body_en, 160), 'body_ta', left(t.body_ta, 160))
    from people p
    join lateral (
      select id, title_en, title_ta, body_en, body_ta from posts
      where status = 'published' and publish_on = p.local_day
      order by created_at desc limit 1
    ) t on true
    where p.daily_thought
      and extract(hour from p.local_now) >= p.verse_hour and extract(hour from p.local_now) < 21
    union all
    select user_id,
           case when streak_days >= 1 and last_day = local_day - 1 then 'streak_rescue' else 'daily_reminder' end,
           'reminder_' || slot,
           local_day,
           jsonb_build_object('day', local_day, 'streak', streak_days, 'slot', slot)
    from reminders
  ),
  logged as (
    insert into notification_log (user_id, kind, day)
    select user_id, log_kind, local_day from due
    on conflict do nothing
    returning user_id, kind, day
  )
  insert into notification_queue (user_id, kind, payload)
  select d.user_id, d.kind, d.payload
  from due d join logged l on l.user_id = d.user_id and l.kind = d.log_kind and l.day = d.local_day;
  get diagnostics queued = row_count;

  delete from notification_queue where sent_at < p_now - interval '7 days';
  delete from notification_log where day < (p_now - interval '14 days')::date;
  return queued;
end $$;
revoke all on function queue_scheduled_notifications(timestamptz) from public, anon, authenticated;
