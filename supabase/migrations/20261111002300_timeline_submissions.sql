-- Bible Timeline: readers suggest entries, the admin approves or rejects them.
--   kind 'event'      a new event in the life of someone on the timeline (data.person, data.y, data.text)
--   kind 'person'     a new person (data.name, data.title, data.cat, years, data.events)
--   kind 'correction' a change to someone already there (data.person, data.patch)
-- Every suggestion needs an explanation and at least one Bible reference.
-- Readers see their own suggestions and everyone's approved ones; only the admin
-- changes status or edits. The writer gets a notification when it's reviewed.

create table if not exists timeline_submissions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references profiles(id) on delete cascade,
  kind        text not null check (kind in ('event', 'person', 'correction')),
  data        jsonb not null,
  explanation text not null check (char_length(btrim(explanation)) between 1 and 2000),
  refs        jsonb not null check (jsonb_typeof(refs) = 'array' and jsonb_array_length(refs) between 1 and 10),
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note  text check (admin_note is null or char_length(admin_note) <= 500),
  reviewed_at timestamptz,
  created_at  timestamptz not null default now(),
  check (octet_length(data::text) <= 8000)
);
create index if not exists timeline_submissions_status_idx on timeline_submissions (status, created_at);
create index if not exists timeline_submissions_user_idx on timeline_submissions (user_id, created_at);
alter table timeline_submissions enable row level security;

drop policy if exists "timeline: read own or admin" on timeline_submissions;
create policy "timeline: read own or admin" on timeline_submissions for select to authenticated
  using (user_id = auth.uid() or is_admin());
drop policy if exists "timeline: suggest as yourself" on timeline_submissions;
create policy "timeline: suggest as yourself" on timeline_submissions for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending' and admin_note is null and reviewed_at is null);
drop policy if exists "timeline: admin reviews" on timeline_submissions;
create policy "timeline: admin reviews" on timeline_submissions for update to authenticated
  using (is_admin()) with check (is_admin());
drop policy if exists "timeline: delete own pending or admin" on timeline_submissions;
create policy "timeline: delete own pending or admin" on timeline_submissions for delete to authenticated
  using ((user_id = auth.uid() and status = 'pending') or is_admin());
grant select, insert, update, delete on timeline_submissions to authenticated;

-- At most 10 suggestions an hour per person.
create or replace function limit_timeline_submissions() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from timeline_submissions
      where user_id = new.user_id and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'too many suggestions, try again later' using errcode = 'P0001';
  end if;
  new.explanation := btrim(new.explanation);
  return new;
end $$;
drop trigger if exists timeline_submissions_limit on timeline_submissions;
create trigger timeline_submissions_limit before insert on timeline_submissions
  for each row execute function limit_timeline_submissions();

-- Approved entries for everyone (signed in or not), with the writer's display name only.
create or replace function timeline_approved()
returns table (id uuid, kind text, data jsonb, explanation text, refs jsonb, added_by text, reviewed_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.id, s.kind, s.data, s.explanation, s.refs, pr.display_name, s.reviewed_at
  from timeline_submissions s join profiles pr on pr.id = s.user_id
  where s.status = 'approved'
  order by s.reviewed_at;
$$;
revoke all on function timeline_approved() from public;
grant execute on function timeline_approved() to anon, authenticated;

-- Tell the writer when their suggestion is approved or rejected.
alter table notification_queue drop constraint if exists notification_queue_kind_check;
alter table notification_queue add constraint notification_queue_kind_check
  check (kind in ('daily_verse', 'daily_reminder', 'streak_rescue', 'daily_thought',
                  'friend_request', 'friend_accepted', 'friend_added',
                  'challenge_received', 'challenge_finished', 'timeline_reviewed'));

create or replace function notify_timeline_reviewed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status <> old.status and new.status in ('approved', 'rejected') then
    new.reviewed_at := now();
    insert into notification_queue (user_id, kind, payload)
    values (new.user_id, 'timeline_reviewed', jsonb_build_object(
      'status', new.status, 'kind', new.kind,
      'title_en', coalesce(new.data #>> '{name,en}', new.data #>> '{text,en}', new.data #>> '{personName,en}', ''),
      'title_ta', coalesce(new.data #>> '{name,ta}', new.data #>> '{text,ta}', new.data #>> '{personName,ta}', ''),
      'note', coalesce(new.admin_note, '')));
  end if;
  return new;
end $$;
drop trigger if exists timeline_submissions_reviewed on timeline_submissions;
create trigger timeline_submissions_reviewed before update on timeline_submissions
  for each row execute function notify_timeline_reviewed();

-- The Report button works on approved timeline entries too.
alter table question_reports drop constraint if exists question_reports_kind_check;
alter table question_reports add constraint question_reports_kind_check
  check (kind in ('question', 'recall', 'verse', 'faq', 'gospel', 'post', 'comment', 'timeline'));

-- Admin list: submissions with the writer's display name (profiles are otherwise private).
create or replace function timeline_submissions_admin(p_status text)
returns table (id uuid, user_id uuid, kind text, data jsonb, explanation text, refs jsonb, status text,
               admin_note text, reviewed_at timestamptz, created_at timestamptz, added_by text)
language sql stable security definer set search_path = public as $$
  select s.id, s.user_id, s.kind, s.data, s.explanation, s.refs, s.status, s.admin_note, s.reviewed_at, s.created_at, pr.display_name
  from timeline_submissions s join profiles pr on pr.id = s.user_id
  where is_admin() and s.status = p_status
  order by case when p_status = 'pending' then s.created_at end asc, s.created_at desc;
$$;
revoke all on function timeline_submissions_admin(text) from public, anon;
grant execute on function timeline_submissions_admin(text) to authenticated;
