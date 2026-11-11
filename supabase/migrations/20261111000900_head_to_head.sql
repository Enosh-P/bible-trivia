-- Head-to-head records between friends, and an all-time wins board.
-- Read-only functions only: no table changes, no data changes.
-- A result counts once everyone in the challenge has played.

-- Your all-time record against each friend: compares your score with theirs in
-- every finished challenge you both played (group challenges included).
create or replace function friend_records()
returns table (user_id uuid, wins integer, losses integer, ties integer)
language sql stable security definer set search_path = public as $$
  select o.user_id,
         count(*) filter (where m.score > o.score)::integer,
         count(*) filter (where m.score < o.score)::integer,
         count(*) filter (where m.score = o.score)::integer
  from challenge_players m
  join challenge_players o on o.challenge_id = m.challenge_id and o.user_id <> m.user_id
  where m.user_id = auth.uid()
    and m.finished_at is not null and o.finished_at is not null
    and is_friend(o.user_id)
  group by o.user_id;
$$;

-- Every challenge you and one friend shared, newest first (not limited to 30 days).
create or replace function friend_history(p_friend uuid)
returns table (challenge_id uuid, mode text, created_at timestamptz, expires_at timestamptz,
               created_by uuid, question_ids text[],
               my_score integer, my_correct smallint, my_total smallint, my_finished_at timestamptz,
               their_score integer, their_correct smallint, their_total smallint, their_finished_at timestamptz,
               players integer)
language sql stable security definer set search_path = public as $$
  select c.id, c.mode, c.created_at, c.expires_at, c.created_by, c.question_ids,
         m.score, m.correct, m.total, m.finished_at,
         o.score, o.correct, o.total, o.finished_at,
         (select count(*)::integer from challenge_players x where x.challenge_id = c.id)
  from challenges c
  join challenge_players m on m.challenge_id = c.id and m.user_id = auth.uid()
  join challenge_players o on o.challenge_id = c.id and o.user_id = p_friend
  where is_friend(p_friend)
  order by c.created_at desc
  limit 500;
$$;

-- You and your friends ranked by challenges won (sole top score), then XP.
create or replace function all_time_board()
returns table (rank bigint, user_id uuid, display_name text, avatar text,
               wins integer, played integer, xp integer, is_me boolean)
language sql stable security definer set search_path = public as $$
  with circle as (
    select auth.uid() as id
    union
    select case when requester = auth.uid() then addressee else requester end
    from friendships where status = 'accepted' and auth.uid() in (requester, addressee)
  ),
  finished as (
    select challenge_id from challenge_players
    group by challenge_id
    having bool_and(finished_at is not null) and count(*) > 1
  ),
  ranked as (
    select cp.user_id,
           rank() over (partition by cp.challenge_id order by cp.score desc) as r,
           count(*) over (partition by cp.challenge_id, cp.score) as same_score
    from challenge_players cp
    join finished f on f.challenge_id = cp.challenge_id
  ),
  -- Ranked among everyone in each challenge, then kept for you and your friends.
  totals as (
    select user_id,
           count(*) filter (where r = 1 and same_score = 1)::integer as wins,
           count(*)::integer as played
    from ranked
    where user_id in (select id from circle)
    group by user_id
  )
  select rank() over (order by coalesce(t.wins, 0) desc, p.xp desc),
         p.id, p.display_name, p.avatar,
         coalesce(t.wins, 0), coalesce(t.played, 0), p.xp, p.id = auth.uid()
  from circle c
  join profiles p on p.id = c.id
  left join totals t on t.user_id = p.id
  order by 1, p.display_name;
$$;

revoke all on function friend_records(), friend_history(uuid), all_time_board() from public, anon;
grant execute on function friend_records(), friend_history(uuid), all_time_board() to authenticated;
