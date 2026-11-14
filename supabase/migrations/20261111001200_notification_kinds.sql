-- Allow the "X is now your friend" notification (friends by QR code).
alter table notification_queue drop constraint if exists notification_queue_kind_check;
alter table notification_queue add constraint notification_queue_kind_check
  check (kind in ('daily_verse', 'daily_reminder', 'streak_rescue',
                  'friend_request', 'friend_accepted', 'friend_added',
                  'challenge_received', 'challenge_finished'));
