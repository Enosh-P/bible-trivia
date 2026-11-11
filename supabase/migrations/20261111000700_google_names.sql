-- Sign-ups through Google (or other providers) send the person's name as
-- full_name / name; use it for the profile, falling back to the email name.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name, ui_lang, friend_code)
  values (
    new.id,
    left(coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Player'
    ), 32),
    case when new.raw_user_meta_data->>'ui_lang' = 'ta' then 'ta' else 'en' end,
    new_friend_code()
  )
  on conflict (id) do nothing;
  return new;
end $$;
revoke all on function handle_new_user() from public, anon, authenticated;
