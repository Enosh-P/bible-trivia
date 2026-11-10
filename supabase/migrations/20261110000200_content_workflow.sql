-- Content workflow for a large question bank (10,000+).
-- The database is the source of truth: generated or hand-written questions are
-- imported as 'review', reviewers fix and approve them in the Supabase table
-- editor, and only 'published' questions reach players.

alter table questions add column if not exists source text not null default 'manual'
  check (source in ('manual', 'generated', 'imported'));
alter table questions add column if not exists review_note text;          -- reviewer's comment
alter table questions add column if not exists reviewed_by text;          -- reviewer name or email
alter table questions add column if not exists reviewed_at timestamptz;
-- Where an imported question came from, so credit and licence terms travel with it.
alter table questions add column if not exists attribution text;        -- e.g. 'Example Ministry, examplequiz.org'
alter table questions add column if not exists license text;            -- e.g. 'CC BY 4.0', 'used with permission'

create index if not exists questions_book_chapter_idx on questions (book_code, chapter);
create index if not exists questions_status_idx on questions (status);

-- Stamp the review time when a question is published.
create or replace function stamp_reviewed() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status = 'published' and old.status is distinct from 'published' then
    new.reviewed_at := coalesce(new.reviewed_at, now());
  end if;
  return new;
end $$;

drop trigger if exists questions_stamp_reviewed on questions;
create trigger questions_stamp_reviewed before update on questions
  for each row execute function stamp_reviewed();

-- Targets: how many questions we want per book (a guide, not a hard rule).
create table if not exists book_targets (
  book_code  text primary key references books(code),
  target     integer not null check (target >= 0),
  priority   smallint not null default 100,         -- lower = write sooner
  focus_chapters smallint[] not null default '{}'   -- important chapters get more
);
alter table book_targets enable row level security;
-- No public policy: targets are only for the team (dashboard / service role).

-- Progress per book, for the team dashboard (Supabase → SQL editor or table view).
create or replace view book_progress as
select
  b.position,
  b.code,
  b.name_en,
  b.name_ta,
  coalesce(t.target, 0)                                   as target,
  count(q.id) filter (where q.status = 'published')       as published,
  count(q.id) filter (where q.status = 'review')          as in_review,
  count(q.id) filter (where q.status = 'draft')           as draft,
  count(q.id)                                             as total,
  round(100.0 * count(q.id) filter (where q.status = 'published')
        / nullif(t.target, 0), 1)                         as pct_published
from books b
left join book_targets t on t.book_code = b.code
left join questions q on q.book_code = b.code and q.status <> 'retired'
group by b.position, b.code, b.name_en, b.name_ta, t.target
order by b.position;

revoke all on book_progress from anon, authenticated;

-- Players should stop seeing a question once it is retired. The app syncs
-- published rows only, so it also needs the list of ids that were withdrawn.
create or replace function withdrawn_question_ids(p_since timestamptz)
returns table (id text)
language sql stable security definer set search_path = public as $$
  select q.id from questions q
  where q.status <> 'published' and q.updated_at > p_since;
$$;
revoke all on function withdrawn_question_ids(timestamptz) from public;
grant execute on function withdrawn_question_ids(timestamptz) to anon, authenticated;
