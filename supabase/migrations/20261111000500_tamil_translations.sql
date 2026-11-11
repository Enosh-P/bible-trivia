-- Tamil for questions that were written in English (Recall), and a way to
-- tell machine translations from ones a person has checked.

alter table questions add column if not exists ta_status text
  check (ta_status in ('machine', 'reviewed'));
comment on column questions.ta_status is
  'machine = Google translation with Tamil Bible names, not yet checked; reviewed = checked by a person';

-- Fills in Tamil only where a question has none yet, so a reviewer's
-- correction is never overwritten by a later machine translation.
-- Input: [{"id": "...", "ta": {"q": "...", "a": "..."}}, ...]
create or replace function apply_machine_tamil(p jsonb)
returns integer
language sql security definer set search_path = public as $$
  with updated as (
    update questions q
    set ta = x.ta, ta_status = 'machine', updated_at = now()
    from jsonb_to_recordset(p) as x(id text, ta jsonb)
    where q.id = x.id and q.ta is null
    returning 1
  )
  select count(*)::integer from updated;
$$;
-- Only the import script (secret key) may call it.
revoke all on function apply_machine_tamil(jsonb) from public, anon, authenticated;

-- When a reviewer edits the Tamil in the dashboard, mark it reviewed.
create or replace function mark_tamil_reviewed() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.ta is distinct from old.ta and old.ta is not null and new.ta_status is not distinct from old.ta_status then
    new.ta_status := 'reviewed';
  end if;
  return new;
end $$;

drop trigger if exists questions_tamil_reviewed on questions;
create trigger questions_tamil_reviewed before update on questions
  for each row execute function mark_tamil_reviewed();
