-- Streak hearts: every 5 days in a row earns a heart (max 3); a heart saves the
-- streak on a missed day. Kept on the profile so they follow the player to another phone.
alter table profiles add column if not exists hearts smallint not null default 0;
alter table profiles drop constraint if exists profiles_hearts_range;
alter table profiles add constraint profiles_hearts_range check (hearts between 0 and 3);
