-- Practice follows the account: answers (for mistakes, reviews and weak spots),
-- saved questions, and memory-verse progress, synced between a person's devices.
-- Each person sees and writes only their own rows.

create table if not exists practice_answers (
  user_id     uuid not null references profiles(id) on delete cascade,
  -- Made on the device ("<device>-<n>"), so sending the same answer twice is harmless.
  client_key  text not null check (char_length(client_key) <= 80),
  question_id text not null check (char_length(question_id) <= 80),
  book        text not null check (char_length(book) <= 8),
  correct     boolean not null,
  mode        text not null check (char_length(mode) <= 20),
  answered_at timestamptz not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, client_key)
);
-- Devices fetch what's new since they last looked.
create index if not exists practice_answers_pull_idx on practice_answers (user_id, created_at);

create table if not exists saved_questions (
  user_id     uuid not null references profiles(id) on delete cascade,
  question_id text not null check (char_length(question_id) <= 80),
  saved       boolean not null default true,   -- false: un-starred (kept so other devices hear about it)
  updated_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table if not exists practice_state (
  user_id    uuid primary key references profiles(id) on delete cascade,
  memory     jsonb not null default '{}'::jsonb,   -- memory verse id -> level
  my_verses  jsonb not null default '[]'::jsonb,   -- verses the person added
  updated_at timestamptz not null default now()
);
alter table practice_state drop constraint if exists practice_state_size;
alter table practice_state add constraint practice_state_size
  check (pg_column_size(memory) < 100000 and pg_column_size(my_verses) < 300000);

alter table practice_answers enable row level security;
alter table saved_questions enable row level security;
alter table practice_state enable row level security;

drop policy if exists "own practice answers" on practice_answers;
create policy "own practice answers" on practice_answers for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own saved questions" on saved_questions;
create policy "own saved questions" on saved_questions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own practice state" on practice_state;
create policy "own practice state" on practice_state for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on practice_answers, saved_questions, practice_state to authenticated;
