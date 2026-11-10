-- Verses, the gospel presentation, and FAQ for seekers.
-- Content is bilingual jsonb: { "en": "...", "ta": "..." }.

create table if not exists verses (
  id         text primary key,                  -- 'JHN.3.16'
  book_code  text not null references books(code),
  chapter    smallint not null,
  verse      smallint not null,
  en         text not null,                     -- KJV
  ta         text not null,                     -- BSI Tamil O.V.
  daily      boolean not null default true,     -- eligible for Verse of the Day
  updated_at timestamptz not null default now()
);

create table if not exists reading_sources (
  id     text primary key,
  author jsonb not null,
  title  text not null
);

create table if not exists gospel_steps (
  id         text primary key,
  position   smallint not null unique,
  icon       text not null,
  horse      text not null check (horse in ('white', 'red', 'black', 'pale')),
  title      jsonb not null,
  body       jsonb not null,
  prayer     jsonb,
  next       jsonb,
  verse_ids  text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists faqs (
  id          text primary key,
  position    smallint not null unique,
  q           jsonb not null,
  a           jsonb not null,
  verse_ids   text[] not null default '{}',
  reading_ids text[] not null default '{}',
  status      text not null default 'published' check (status in ('draft', 'review', 'published')),
  updated_at  timestamptz not null default now()
);

drop trigger if exists verses_updated_at on verses;
create trigger verses_updated_at before update on verses for each row execute function set_updated_at();
drop trigger if exists gospel_steps_updated_at on gospel_steps;
create trigger gospel_steps_updated_at before update on gospel_steps for each row execute function set_updated_at();
drop trigger if exists faqs_updated_at on faqs;
create trigger faqs_updated_at before update on faqs for each row execute function set_updated_at();

alter table verses          enable row level security;
alter table reading_sources enable row level security;
alter table gospel_steps    enable row level security;
alter table faqs            enable row level security;

drop policy if exists "verses are public" on verses;
create policy "verses are public" on verses for select using (true);
drop policy if exists "sources are public" on reading_sources;
create policy "sources are public" on reading_sources for select using (true);
drop policy if exists "gospel is public" on gospel_steps;
create policy "gospel is public" on gospel_steps for select using (true);
drop policy if exists "published faqs are public" on faqs;
create policy "published faqs are public" on faqs for select using (status = 'published');

grant select on verses, reading_sources, gospel_steps, faqs to anon, authenticated;
