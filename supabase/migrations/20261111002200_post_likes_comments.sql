-- Likes and comments on Daily Thoughts.
--   Likes: one per person per post; anyone signed in can see the count.
--   Comments: signed-in readers write (1,000 characters, at most 10 a minute);
--   people delete their own, admins delete any; the Report button works on them.
-- Names and avatars come through post_comments_for() (profiles are otherwise private).

create table if not exists post_likes (
  post_id    uuid not null references posts(id) on delete cascade,
  user_id    uuid not null default auth.uid() references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table post_likes enable row level security;
drop policy if exists "post likes: read" on post_likes;
create policy "post likes: read" on post_likes for select to authenticated using (true);
drop policy if exists "post likes: like as yourself" on post_likes;
create policy "post likes: like as yourself" on post_likes for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from posts p where p.id = post_id and p.status = 'published'));
drop policy if exists "post likes: unlike your own" on post_likes;
create policy "post likes: unlike your own" on post_likes for delete to authenticated using (user_id = auth.uid());
grant select, insert, delete on post_likes to authenticated;

create table if not exists post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references posts(id) on delete cascade,
  user_id    uuid not null default auth.uid() references profiles(id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists post_comments_post_idx on post_comments (post_id, created_at);
alter table post_comments enable row level security;
drop policy if exists "post comments: read" on post_comments;
create policy "post comments: read" on post_comments for select to authenticated using (true);
drop policy if exists "post comments: write as yourself" on post_comments;
create policy "post comments: write as yourself" on post_comments for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from posts p where p.id = post_id and p.status = 'published'));
drop policy if exists "post comments: delete own or admin" on post_comments;
create policy "post comments: delete own or admin" on post_comments for delete to authenticated
  using (user_id = auth.uid() or is_admin());
grant select, insert, delete on post_comments to authenticated;

-- At most 10 comments a minute per person (stops accidental floods and spam).
create or replace function limit_post_comments() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from post_comments
      where user_id = new.user_id and created_at > now() - interval '1 minute') >= 10 then
    raise exception 'too many comments, wait a minute' using errcode = 'P0001';
  end if;
  new.body := btrim(new.body);
  return new;
end $$;
drop trigger if exists post_comments_limit on post_comments;
create trigger post_comments_limit before insert on post_comments
  for each row execute function limit_post_comments();

-- The comments on a post with each writer's name and avatar (nothing else from profiles).
create or replace function post_comments_for(p_post uuid)
returns table (id uuid, body text, created_at timestamptz, user_id uuid, display_name text, avatar text, mine boolean)
language sql stable security definer set search_path = public as $$
  select c.id, c.body, c.created_at, c.user_id, pr.display_name, pr.avatar::text, c.user_id = auth.uid()
  from post_comments c join profiles pr on pr.id = c.user_id
  where c.post_id = p_post and auth.uid() is not null
  order by c.created_at;
$$;
revoke all on function post_comments_for(uuid) from public, anon;
grant execute on function post_comments_for(uuid) to authenticated;

-- The Report button works on comments too.
alter table question_reports drop constraint if exists question_reports_kind_check;
alter table question_reports add constraint question_reports_kind_check
  check (kind in ('question', 'recall', 'verse', 'faq', 'gospel', 'post', 'comment'));
