-- Bible Trivia — database schema (Supabase / Postgres)
--
-- The app works fully offline from the JSON packs in content/packs.
-- This database is the long-term home for the question bank (so it can grow
-- past what ships in the app) and for online features: accounts, synced
-- progress, the daily leaderboard and question reports.
--
-- Apply with the Supabase CLI (`supabase db push`) or paste into the SQL
-- editor. Then load content: `npm run db:seed-sql` and run supabase/seed.sql.

-- ---------- Reference data ----------

create table if not exists books (
  code        text primary key,           -- USFM code: GEN, JHN, REV
  position    smallint not null unique,   -- 1..66 canonical order
  testament   text not null check (testament in ('OT', 'NT')),
  name_en     text not null,
  name_ta     text not null
);

-- ---------- Questions ----------

create table if not exists questions (
  id          text primary key,           -- e.g. 'gen-001'
  type        text not null check (type in ('mcq', 'tf', 'who', 'book', 'blank')),
  book_code   text not null references books(code),
  chapter     smallint not null check (chapter > 0),
  verse       smallint,
  verse_end   smallint,
  difficulty  smallint not null check (difficulty between 1 and 3),
  -- index into options (mcq/who/book/blank) or true/false (tf)
  answer      jsonb not null,
  -- { "q": "...", "options": [...], "explain": "..." }
  en          jsonb not null,
  ta          jsonb not null,
  art         text,                       -- cartoon illustration key
  tags        text[] not null default '{}',
  status      text not null default 'draft' check (status in ('draft', 'review', 'published', 'retired')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists questions_book_idx on questions (book_code);
create index if not exists questions_type_idx on questions (type) where status = 'published';
-- The app syncs "everything changed since my last sync".
create index if not exists questions_updated_idx on questions (updated_at);

create or replace function set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists questions_updated_at on questions;
create trigger questions_updated_at before update on questions
  for each row execute function set_updated_at();

-- ---------- Players (v2: online features) ----------

create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 1 and 32),
  ui_lang       text not null default 'en' check (ui_lang in ('en', 'ta')),
  xp            integer not null default 0,
  streak        integer not null default 0,
  last_day      date,
  created_at    timestamptz not null default now()
);

create table if not exists answers (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references profiles(id) on delete cascade,
  question_id  text not null references questions(id),
  correct      boolean not null,
  mode         text not null,
  answered_at  timestamptz not null default now()
);
create index if not exists answers_user_idx on answers (user_id, answered_at desc);

create table if not exists daily_results (
  user_id   uuid not null references profiles(id) on delete cascade,
  day       date not null,
  score     integer not null check (score between 0 and 2000),
  correct   smallint not null,
  total     smallint not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)               -- one daily attempt per person
);
create index if not exists daily_results_board_idx on daily_results (day, score desc);

-- Anyone (signed in or not) can flag a confusing or wrong question.
create table if not exists question_reports (
  id           bigint generated always as identity primary key,
  question_id  text not null references questions(id),
  lang         text not null check (lang in ('en', 'ta')),
  reason       text not null check (char_length(reason) between 1 and 500),
  user_id      uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- ---------- Row level security ----------

alter table books            enable row level security;
alter table questions        enable row level security;
alter table profiles         enable row level security;
alter table answers          enable row level security;
alter table daily_results    enable row level security;
alter table question_reports enable row level security;

create policy "books are public" on books for select using (true);
create policy "published questions are public" on questions for select using (status = 'published');

create policy "read own profile" on profiles for select using (auth.uid() = id);
create policy "create own profile" on profiles for insert with check (auth.uid() = id);
create policy "update own profile" on profiles for update using (auth.uid() = id);

create policy "read own answers" on answers for select using (auth.uid() = user_id);
create policy "add own answers" on answers for insert with check (auth.uid() = user_id);

create policy "daily board is public" on daily_results for select using (true);
create policy "add own daily result" on daily_results for insert with check (auth.uid() = user_id);

create policy "anyone can report" on question_reports for insert
  with check (user_id is null or auth.uid() = user_id);

-- Public daily leaderboard: only names and scores leave the database.
-- security definer lets it read display names without making profiles public.
create or replace function daily_leaderboard(p_day date default current_date, p_limit int default 50)
returns table (rank bigint, display_name text, score integer, correct smallint, total smallint)
language sql stable security definer set search_path = public as $$
  select rank() over (order by d.score desc, d.created_at),
         p.display_name, d.score, d.correct, d.total
  from daily_results d
  join profiles p on p.id = d.user_id
  where d.day = p_day
  order by d.score desc, d.created_at
  limit least(greatest(p_limit, 1), 100);
$$;

revoke all on function daily_leaderboard(date, int) from public;
grant execute on function daily_leaderboard(date, int) to anon, authenticated;

-- ---------- Table privileges (RLS above decides which rows) ----------
-- Supabase grants these by default; stated here so the intent is explicit.
grant usage on schema public to anon, authenticated;
grant select on books, questions to anon, authenticated;
grant insert on question_reports to anon, authenticated;
grant select, insert, update on profiles to authenticated;
grant select, insert on answers, daily_results to authenticated;
grant usage on all sequences in schema public to anon, authenticated;
