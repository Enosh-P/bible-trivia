-- Player reports on questions, recall cards, verses and FAQ answers.
-- Each new report is emailed to the admin by the `report-email` Edge Function
-- (wired with a Database Webhook; see supabase/functions/report-email/README.md).

-- Reports can point at any content (recall cards live outside the questions
-- table), so drop the foreign key and keep a snapshot of what the player saw.
alter table question_reports drop constraint if exists question_reports_question_id_fkey;

alter table question_reports add column if not exists kind text not null default 'question'
  check (kind in ('question', 'recall', 'verse', 'faq', 'gospel'));
alter table question_reports add column if not exists category text not null default 'other'
  check (category in ('wrong_answer', 'typo', 'tamil', 'confusing', 'other'));
alter table question_reports add column if not exists snapshot jsonb;          -- question text, options, answer as shown
alter table question_reports add column if not exists contact text check (contact is null or char_length(contact) <= 200);
alter table question_reports add column if not exists app_version text;
alter table question_reports add column if not exists status text not null default 'new'
  check (status in ('new', 'fixed', 'dismissed'));
alter table question_reports add column if not exists handled_at timestamptz;
alter table question_reports add column if not exists emailed_at timestamptz;

-- The free-text reason becomes optional (the category says what is wrong).
alter table question_reports alter column reason drop not null;
alter table question_reports drop constraint if exists question_reports_reason_check;
alter table question_reports add constraint question_reports_reason_check
  check (reason is null or char_length(reason) <= 1000);
alter table question_reports drop constraint if exists question_reports_snapshot_size;
alter table question_reports add constraint question_reports_snapshot_size
  check (snapshot is null or pg_column_size(snapshot) < 8000);

create index if not exists question_reports_status_idx on question_reports (status, created_at desc);
create index if not exists question_reports_question_idx on question_reports (question_id);

-- Light abuse guard: at most 30 reports per question per day.
-- security definer: players may add reports but not read them, so the count
-- has to run with the owner's rights.
create or replace function limit_reports() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from question_reports
      where question_id = new.question_id and created_at > now() - interval '1 day') >= 30 then
    raise exception 'too many reports for this question today';
  end if;
  return new;
end $$;

drop trigger if exists question_reports_limit on question_reports;
create trigger question_reports_limit before insert on question_reports
  for each row execute function limit_reports();

-- Team view: open reports with the question's current text alongside.
create or replace view open_reports as
select r.id, r.created_at, r.kind, r.category, r.lang, r.question_id, r.reason, r.contact,
       r.snapshot, q.status as question_status
from question_reports r
left join questions q on q.id = r.question_id
where r.status = 'new'
order by r.created_at desc;
revoke all on open_reports from anon, authenticated;
