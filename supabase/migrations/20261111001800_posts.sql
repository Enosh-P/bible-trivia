-- Daily Thought: short blog posts written by admins, read by everyone signed in.
-- Later steps (comments, push) hang off posts.id.

create table if not exists posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid references profiles(id) on delete set null default auth.uid(),
  -- Either language may be empty; the app shows the other one.
  title_en    text not null default '' check (char_length(title_en) <= 200),
  title_ta    text not null default '' check (char_length(title_ta) <= 200),
  -- Simple Markdown: paragraphs, **bold**, *italic*, lists, ![alt](image url).
  body_en     text not null default '' check (char_length(body_en) <= 20000),
  body_ta     text not null default '' check (char_length(body_ta) <= 20000),
  cover_url   text check (cover_url is null or char_length(cover_url) <= 500),
  -- 'JHN 3:16' or 'JHN 3:16-18'; the words come from the app's Bible text.
  verse_ref   text check (verse_ref is null or verse_ref ~ '^[A-Z0-9]{3} [0-9]{1,3}:[0-9]{1,3}(-[0-9]{1,3})?$'),
  publish_on  date not null default current_date,   -- the day it appears (write ahead, schedule)
  status      text not null default 'draft' check (status in ('draft', 'published')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists posts_feed_idx on posts (status, publish_on desc);

create or replace function posts_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists posts_touch on posts;
create trigger posts_touch before update on posts
  for each row execute function posts_touch();

alter table posts enable row level security;

-- Readers: published posts whose day has come. The server's date is UTC, and
-- readers east of it (India is 5½ hours ahead) reach the new day first, so the
-- database allows one day ahead and the app shows a post only from the
-- reader's own date onwards.
drop policy if exists "read published posts" on posts;
create policy "read published posts" on posts for select to authenticated
  using (status = 'published' and publish_on <= (now() at time zone 'utc')::date + 1);

-- Admins: everything (drafts and scheduled posts too).
drop policy if exists "admins manage posts" on posts;
create policy "admins manage posts" on posts for all to authenticated
  using (is_admin()) with check (is_admin());

grant select, insert, update, delete on posts to authenticated;

-- The Report button works on posts too.
alter table question_reports drop constraint if exists question_reports_kind_check;
alter table question_reports add constraint question_reports_kind_check
  check (kind in ('question', 'recall', 'verse', 'faq', 'gospel', 'post'));

-- Pictures in posts: Storage bucket "post-images". Anyone can view (public
-- bucket); only admins can upload, replace or delete.
-- (Skipped where Supabase Storage isn't installed, e.g. a plain Postgres.)
do $$
begin
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise notice 'storage schema not found: skipping the post-images bucket';
    return;
  end if;

  insert into storage.buckets (id, name, public)
  values ('post-images', 'post-images', true)
  on conflict (id) do nothing;

  drop policy if exists "post images: admins list" on storage.objects;
  create policy "post images: admins list" on storage.objects for select to authenticated
    using (bucket_id = 'post-images' and public.is_admin());

  drop policy if exists "post images: admins upload" on storage.objects;
  create policy "post images: admins upload" on storage.objects for insert to authenticated
    with check (bucket_id = 'post-images' and public.is_admin());

  drop policy if exists "post images: admins replace" on storage.objects;
  create policy "post images: admins replace" on storage.objects for update to authenticated
    using (bucket_id = 'post-images' and public.is_admin())
    with check (bucket_id = 'post-images' and public.is_admin());

  drop policy if exists "post images: admins delete" on storage.objects;
  create policy "post images: admins delete" on storage.objects for delete to authenticated
    using (bucket_id = 'post-images' and public.is_admin());
end $$;
