-- Machine Tamil can now be corrected by a later import (e.g. the fix for
-- "Lord" translated as கிருஷ்ணர், "prophet" as தேரோட்டம்). Only rows still marked
-- 'machine' are refreshed; Tamil a person has reviewed is never replaced.

-- The import marks its own update so the trigger below doesn't call it "reviewed".
create or replace function mark_tamil_reviewed() returns trigger
language plpgsql set search_path = public as $$
begin
  if coalesce(current_setting('bt.machine_tamil', true), '') = 'on' then
    return new;
  end if;
  if new.ta is distinct from old.ta and old.ta is not null and new.ta_status is not distinct from old.ta_status then
    new.ta_status := 'reviewed';
  end if;
  return new;
end $$;

-- Input: [{"id": "...", "ta": {"q": "...", "a": "..."}}, ...]
-- Fills empty Tamil, and replaces machine Tamil that has changed.
create or replace function apply_machine_tamil(p jsonb)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  perform set_config('bt.machine_tamil', 'on', true);
  with updated as (
    update questions q
    set ta = x.ta, ta_status = 'machine', updated_at = now()
    from jsonb_to_recordset(p) as x(id text, ta jsonb)
    where q.id = x.id
      and (q.ta is null or (q.ta_status = 'machine' and q.ta is distinct from x.ta))
    returning 1
  )
  select count(*)::integer into n from updated;
  perform set_config('bt.machine_tamil', '', true);
  return n;
end $$;
revoke all on function apply_machine_tamil(jsonb) from public, anon, authenticated;
