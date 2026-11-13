-- Friends by QR code: one person shows a QR code, the other scans it, and they
-- are friends straight away (no request to accept). The code holds a one-time
-- invite that expires after 10 minutes, so a screenshot can't be reused later.

create table if not exists friend_invites (
  token      text primary key,
  user_id    uuid not null references profiles(id) on delete cascade,
  expires_at timestamptz not null
);
create index if not exists friend_invites_user_idx on friend_invites (user_id);
-- Only reachable through the functions below.
alter table friend_invites enable row level security;

-- A fresh invite for the QR code (older ones of yours are replaced).
create or replace function create_friend_invite() returns table (token text, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); t text; e timestamptz := now() + interval '10 minutes';
begin
  if me is null then raise exception 'signed out'; end if;
  delete from friend_invites where friend_invites.user_id = me or friend_invites.expires_at < now();
  t := replace(gen_random_uuid()::text, '-', '');
  insert into friend_invites (token, user_id, expires_at) values (t, me, e);
  return query select t, e;
end $$;

-- Scanning someone's QR code: become friends now.
create or replace function accept_friend_invite(p_token text) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); them uuid; existing friendships;
begin
  if me is null then return 'signed_out'; end if;
  select user_id into them from friend_invites where token = p_token and expires_at > now();
  if them is null then return 'expired'; end if;
  if them = me then return 'self'; end if;
  select * into existing from friendships
   where (requester = me and addressee = them) or (requester = them and addressee = me);
  if found then
    if existing.status = 'accepted' then return 'already_friends'; end if;
    update friendships set status = 'accepted', responded_at = now()
     where requester = existing.requester and addressee = existing.addressee;
    return 'accepted';
  end if;
  insert into friendships (requester, addressee, status, responded_at) values (me, them, 'accepted', now());
  return 'accepted';
end $$;

revoke all on function create_friend_invite(), accept_friend_invite(text) from public, anon;
grant execute on function create_friend_invite(), accept_friend_invite(text) to authenticated;

-- Notify the person who showed the code: "X is now your friend".
create or replace function queue_friendship_push() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' and wants_friend_pushes(new.addressee) then
    insert into notification_queue (user_id, kind, payload)
    select new.addressee, 'friend_request', jsonb_build_object('name', display_name)
    from profiles where id = new.requester;
  elsif tg_op = 'INSERT' and new.status = 'accepted' and wants_friend_pushes(new.addressee) then
    insert into notification_queue (user_id, kind, payload)
    select new.addressee, 'friend_added', jsonb_build_object('name', display_name)
    from profiles where id = new.requester;
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted' and wants_friend_pushes(new.requester) then
    insert into notification_queue (user_id, kind, payload)
    select new.requester, 'friend_accepted', jsonb_build_object('name', display_name)
    from profiles where id = new.addressee;
  end if;
  return new;
end $$;
