-- "Challenge finished" now tells each player their own result: won, lost or tie.
create or replace function queue_challenge_push() returns trigger
language plpgsql security definer set search_path = public as $$
declare c challenges; top integer; tops integer;
begin
  select * into c from challenges where id = new.challenge_id;
  if tg_op = 'INSERT' then
    if new.user_id <> c.created_by and wants_friend_pushes(new.user_id) then
      insert into notification_queue (user_id, kind, payload)
      select new.user_id, 'challenge_received', jsonb_build_object('name', display_name, 'mode', c.mode, 'challenge_id', c.id)
      from profiles where id = c.created_by;
    end if;
  elsif old.finished_at is null and new.finished_at is not null
        and not exists (select 1 from challenge_players where challenge_id = new.challenge_id and finished_at is null)
        -- only once, even if two results are saved at the same moment
        and not exists (select 1 from notification_queue where kind = 'challenge_finished' and payload->>'challenge_id' = new.challenge_id::text) then
    -- The last player just finished: tell everyone how they did.
    select max(score), count(*) filter (where score = (select max(score) from challenge_players where challenge_id = c.id))
      into top, tops
      from challenge_players where challenge_id = c.id;
    insert into notification_queue (user_id, kind, payload)
    select cp.user_id, 'challenge_finished', jsonb_build_object(
      'mode', c.mode, 'challenge_id', c.id,
      'result', case when cp.score = top and tops > 1 then 'tie' when cp.score = top then 'won' else 'lost' end,
      'score', cp.score,
      'winner', (select p.display_name from challenge_players x join profiles p on p.id = x.user_id
                 where x.challenge_id = c.id order by x.score desc nulls last limit 1),
      'scores', (select string_agg(p.display_name || ' ' || x.score, ' · ' order by x.score desc)
                 from challenge_players x join profiles p on p.id = x.user_id where x.challenge_id = c.id))
    from challenge_players cp
    where cp.challenge_id = c.id and wants_friend_pushes(cp.user_id);
  end if;
  return new;
end $$;
revoke all on function queue_challenge_push() from public, anon, authenticated;
