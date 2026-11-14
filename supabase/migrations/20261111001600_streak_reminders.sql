-- Three streak reminders a day: morning (default 9 am), afternoon (1 pm) and
-- evening (reminder_hour, default 7 pm). Each is skipped if you've already played that day. With a streak
-- going it says "Keep your N-day streak"; otherwise "Today's Challenge is waiting".
-- The separate 8 pm "streak about to end" message is folded into the evening one.

alter table notification_prefs add column if not exists morning_hour smallint not null default 9
  check (morning_hour between 0 and 23);
alter table notification_prefs add column if not exists afternoon_hour smallint not null default 13
  check (afternoon_hour between 0 and 23);

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
