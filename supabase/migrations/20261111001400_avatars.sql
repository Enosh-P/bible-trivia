-- 20 cartoon avatars (src/art/Avatars.tsx) as well as the original horse colours.
alter table profiles drop constraint if exists profiles_avatar_check;
alter table profiles add constraint profiles_avatar_check check (avatar in (
  'white', 'red', 'black', 'pale',
  'lamb', 'lion', 'dove', 'fish', 'camel', 'donkey', 'ram', 'eagle', 'bear', 'ox',
  'raven', 'horse', 'frog', 'bee', 'sparrow', 'goat', 'deer', 'whale', 'owl', 'fox'
));
