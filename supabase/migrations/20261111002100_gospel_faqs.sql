-- Gospel questions and answers, managed by admins (Admin -> Gospel Q&A) instead of in the code.
-- Readers see published ones in Gospel -> Questions, by topic, with search.
-- The 10 questions the app shipped with are copied in once; running this again never
-- overwrites what an admin has edited.

create table if not exists gospel_faqs (
  id          text primary key default replace(gen_random_uuid()::text, '-', ''),
  topic       text not null default 'other' check (topic in ('god', 'life', 'sin', 'salvation', 'following', 'other')),
  sort        integer not null default 1000,
  question_en text not null default '',
  question_ta text not null default '',
  answer_en   text not null default '' check (char_length(answer_en) <= 8000),
  answer_ta   text not null default '' check (char_length(answer_ta) <= 8000),
  -- 'JHN 3:16' or 'JHN 3:16-18', shown from the app's Bible text
  verse_refs  text[] not null default '{}',
  -- further-reading ids (content/gospel.json sources)
  reading     text[] not null default '{}',
  status      text not null default 'draft' check (status in ('draft', 'published')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (question_en <> '' or question_ta <> '')
);
create index if not exists gospel_faqs_order_idx on gospel_faqs (topic, sort);

drop trigger if exists gospel_faqs_touch on gospel_faqs;
create or replace function touch_gospel_faq() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger gospel_faqs_touch before update on gospel_faqs for each row execute function touch_gospel_faq();

alter table gospel_faqs enable row level security;
drop policy if exists "gospel faqs: read published" on gospel_faqs;
create policy "gospel faqs: read published" on gospel_faqs for select to anon
  using (status = 'published');
drop policy if exists "gospel faqs: read published or own drafts" on gospel_faqs;
create policy "gospel faqs: read published or own drafts" on gospel_faqs for select to authenticated
  using (status = 'published' or is_admin());
drop policy if exists "gospel faqs: admins write" on gospel_faqs;
create policy "gospel faqs: admins write" on gospel_faqs for all to authenticated
  using (is_admin()) with check (is_admin());
grant select on gospel_faqs to anon, authenticated;
grant insert, update, delete on gospel_faqs to authenticated;

-- Reports on a Gospel answer already use kind 'faq'.

insert into gospel_faqs (id, topic, sort, question_en, question_ta, answer_en, answer_ta, verse_refs, reading, status) values
  ('exists', 'god', 10, 'Does God really exist?', 'தேவன் உண்மையிலேயே இருக்கிறாரா?', 'Look at the universe, at your own body, at your conscience. Things this ordered and purposeful do not come from nothing. The Bible says God''s invisible power and divine nature are clearly seen through what He has made — and your human spirit, deep within, already senses that He is there.', 'அண்டத்தையும், உங்கள் சொந்த சரீரத்தையும், உங்கள் மனசாட்சியையும் பாருங்கள். இவ்வளவு ஒழுங்கும் நோக்கமும் உள்ளவை ஒன்றுமில்லாமையிலிருந்து வருவதில்லை. தேவனுடைய காணப்படாத வல்லமையும் தேவத்துவமும் அவர் உண்டாக்கினவைகளினாலே தெளிவாய்க் காணப்படும் என்று வேதம் சொல்லுகிறது — உங்களுக்குள் ஆழத்திலுள்ள மனித ஆவியும் அவர் இருக்கிறார் என்று ஏற்கனவே உணருகிறது.', array['ROM 1:20']::text[], array['gospel-of-god','mystery']::text[], 'published'),
  ('meaning', 'life', 20, 'What is the meaning of my life?', 'என் வாழ்க்கையின் அர்த்தம் என்ன?', 'You were made by God and for God. Money, study, career and family are good, but none of them can fill the deepest part of you — your spirit — because it was made to hold God Himself. Life finds its meaning when God comes into you as your life.', 'நீங்கள் தேவனால், தேவனுக்காகவே உண்டாக்கப்பட்டீர்கள். பணம், படிப்பு, வேலை, குடும்பம் இவை நல்லவை; ஆனால் இவற்றில் எதுவும் உங்கள் உள்ளத்தின் ஆழமான பகுதியாகிய ஆவியை நிரப்ப முடியாது, ஏனெனில் அது தேவனையே கொள்ளும்படி உண்டாக்கப்பட்டது. தேவன் உங்களுக்குள் ஜீவனாக வரும்போது வாழ்க்கை அதன் அர்த்தத்தைக் கண்டடைகிறது.', array['GEN 1:26','ZEC 12:1','JHN 4:24']::text[], array['mystery','economy']::text[], 'published'),
  ('suffering', 'sin', 30, 'If God is good, why is there so much suffering?', 'தேவன் நல்லவரானால், ஏன் இவ்வளவு துன்பம்?', 'Suffering came into the world through sin, not from God''s heart. God did not stay distant from our pain: in Christ He entered it and suffered on the cross. For those who love Him He works all things together for good, and He promises a day with no more death, sorrow or pain.', 'துன்பம் பாவத்தின் மூலமாக உலகத்தில் வந்தது; தேவனுடைய இருதயத்திலிருந்து அல்ல. தேவன் நம்முடைய வேதனைக்குத் தூரமாக நிற்கவில்லை; கிறிஸ்துவில் அவர் அதற்குள் வந்து சிலுவையில் பாடுபட்டார். அவரில் அன்புகூருகிறவர்களுக்குச் சகலமும் நன்மைக்கு ஏதுவாக நடக்கும்படி செய்கிறார்; மரணமும் துக்கமும் வருத்தமும் இல்லாத ஒரு நாளையும் வாக்குப்பண்ணியிருக்கிறார்.', array['ROM 8:28','REV 21:4']::text[], array['gospel-of-god']::text[], 'published'),
  ('good-person', 'sin', 40, 'I am a good person. Why do I need to be saved?', 'நான் நல்லவன்தான். எனக்கு ஏன் இரட்சிப்பு தேவை?', 'Compared with others we may look good, but God''s standard is His own glory. Our conscience tells us we have fallen short in thought, word and deed. The problem is not only the sins we do but the sinful nature within us. Good behaviour today cannot cancel yesterday''s debt — and good works cannot pay for sin.', 'மற்றவர்களோடு ஒப்பிடும்போது நாம் நல்லவர்களாகத் தோன்றலாம்; ஆனால் தேவனுடைய அளவுகோல் அவருடைய மகிமையே. எண்ணங்களிலும் வார்த்தைகளிலும் செயல்களிலும் நாம் குறைவுபட்டிருக்கிறோம் என்று நம் மனசாட்சியே சொல்லுகிறது. நாம் செய்யும் பாவங்கள் மட்டுமல்ல, நமக்குள் இருக்கும் பாவ சுபாவமும் பிரச்சனை. இன்றைய நல்ல நடத்தை நேற்றைய கடனை ரத்துசெய்யாது — நற்கிரியைகள் பாவத்திற்கு ஈடுசெய்ய முடியாது.', array['ROM 3:23','ROM 6:23']::text[], array['gospel-of-god']::text[], 'published'),
  ('why-cross', 'salvation', 50, 'Why did Jesus have to die?', 'இயேசு ஏன் மரிக்க வேண்டியிருந்தது?', 'God is love, and He is also righteous. The wages of sin is death, so sin''s penalty had to be paid. Jesus, who had no sin, died in our place to pay it in full. Because God''s righteousness is satisfied, He can now forgive us justly and give us His life freely.', 'தேவன் அன்பாயிருக்கிறார்; அவர் நீதியுள்ளவருமாயிருக்கிறார். பாவத்தின் சம்பளம் மரணம்; ஆகையால் பாவத்தின் தண்டனை செலுத்தப்பட வேண்டியிருந்தது. பாவமில்லாத இயேசு அதை முழுமையாகச் செலுத்தும்படி நமக்குப் பதிலாக மரித்தார். தேவனுடைய நீதி திருப்தியானதால், இப்பொழுது அவர் நீதியாக நம்மை மன்னித்து, தம்முடைய ஜீவனை இலவசமாகக் கொடுக்க முடியும்.', array['ROM 6:23','JHN 3:16']::text[], array['normal','gospel-of-god']::text[], 'published'),
  ('religions', 'god', 60, 'Aren''t all religions the same?', 'எல்லா மதங்களும் ஒன்றுதானே?', 'Most religions teach people to improve themselves and climb up to God. The gospel is the opposite: God came down to man. Christ does not only give a teaching; He gives Himself as life. That is why He could say, “I am the way, the truth, and the life.”', 'பெரும்பாலான மதங்கள் மனிதன் தன்னைத் திருத்திக்கொண்டு தேவனிடம் ஏறிச்செல்லப் போதிக்கின்றன. சுவிசேஷம் அதற்கு எதிரானது: தேவன் மனிதனிடம் இறங்கி வந்தார். கிறிஸ்து ஒரு போதனையை மட்டும் கொடுக்கவில்லை; தம்மையே ஜீவனாகக் கொடுக்கிறார். ஆகையால்தான் “நானே வழியும் சத்தியமும் ஜீவனுமாயிருக்கிறேன்” என்று அவர் சொல்ல முடிந்தது.', array['JHN 14:6']::text[], array['mystery']::text[], 'published'),
  ('how-saved', 'salvation', 70, 'What must I do to be saved?', 'இரட்சிக்கப்பட நான் என்ன செய்ய வேண்டும்?', 'Nothing to earn it — only receive it. Repent, turning your heart to God; believe that Jesus died for your sins and rose again; and call on His name from your spirit. Everyone who receives Him is given the right to become a child of God.', 'அதைச் சம்பாதிக்க ஒன்றும் செய்ய வேண்டியதில்லை; ஏற்றுக்கொண்டால் போதும். மனந்திரும்பி உங்கள் இருதயத்தை தேவனிடம் திருப்புங்கள்; இயேசு உங்கள் பாவங்களுக்காக மரித்து உயிர்த்தெழுந்தார் என்று விசுவாசியுங்கள்; உங்கள் ஆவியிலிருந்து அவருடைய நாமத்தைத் தொழுதுகொள்ளுங்கள். அவரை ஏற்றுக்கொள்ளுகிற ஒவ்வொருவருக்கும் தேவனுடைய பிள்ளைகளாகும்படி அதிகாரம் கொடுக்கப்படுகிறது.', array['ROM 10:13','JHN 1:12','EPH 2:8']::text[], array['gospel-of-god']::text[], 'published'),
  ('too-sinful', 'salvation', 80, 'What if I have sinned too much to be forgiven?', 'என் பாவங்கள் மன்னிக்க முடியாத அளவுக்கு அதிகமானால்?', 'No sin is greater than the blood of Jesus. The Lord invites all who are weary and heavy laden to come to Him. If we confess our sins, He is faithful and righteous to forgive us and cleanse us — not because we deserve it, but because of what He has done.', 'இயேசுவின் இரத்தத்தைவிடப் பெரிய பாவம் ஒன்றுமில்லை. வருத்தப்பட்டுப் பாரஞ்சுமக்கிற யாவரையும் கர்த்தர் தம்மிடம் வரும்படி அழைக்கிறார். நம்முடைய பாவங்களை நாம் அறிக்கையிட்டால், அவர் நம்மை மன்னித்துச் சுத்திகரிக்க உண்மையும் நீதியும் உள்ளவராயிருக்கிறார் — நாம் தகுதியானவர்கள் என்பதால் அல்ல, அவர் செய்து முடித்ததினால்.', array['MAT 11:28','1JN 1:9']::text[], array['normal']::text[], 'published'),
  ('family', 'following', 90, 'My family follows another faith. Can I still believe?', 'என் குடும்பத்தினர் வேறொரு மார்க்கத்தைப் பின்பற்றுகிறார்கள். நான் விசுவாசிக்கலாமா?', 'Yes. Believing in Christ is a personal matter between you and God, and it does not mean rejecting or dishonouring your family. Keep loving and respecting them. God''s heart is for whole households, and your changed life may be the way they meet Him too.', 'ஆம். கிறிஸ்துவை விசுவாசிப்பது உங்களுக்கும் தேவனுக்கும் இடையிலான தனிப்பட்ட காரியம்; அது உங்கள் குடும்பத்தைப் புறக்கணிப்பதோ அவமதிப்பதோ அல்ல. அவர்களைத் தொடர்ந்து நேசித்து மதியுங்கள். தேவனுடைய இருதயம் முழு குடும்பங்களுக்காகவும் இருக்கிறது; உங்கள் மாறின வாழ்க்கை அவர்களும் அவரைச் சந்திக்கும் வழியாகலாம்.', array['ACT 16:31']::text[], array['new-believers']::text[], 'published'),
  ('assurance', 'following', 100, 'How can I know I am saved?', 'நான் இரட்சிக்கப்பட்டேன் என்று எப்படி அறிவேன்?', 'Not by feelings, which change, but by God''s word, which does not. He says that whoever calls on His name shall be saved, and that to all who receive Him He gives the right to become God''s children. Inwardly, His Spirit also bears witness with your spirit (Romans 8:16).', 'மாறும் உணர்ச்சிகளால் அல்ல; மாறாத தேவனுடைய வார்த்தையினாலே. தம்முடைய நாமத்தைத் தொழுதுகொள்ளுகிற எவனும் இரட்சிக்கப்படுவான் என்றும், தம்மை ஏற்றுக்கொள்ளுகிற யாவருக்கும் தேவனுடைய பிள்ளைகளாகும் அதிகாரம் கொடுக்கிறார் என்றும் அவர் சொல்லுகிறார். உள்ளே, அவருடைய ஆவியும் உங்கள் ஆவியோடேகூடச் சாட்சிகொடுக்கிறார் (ரோமர் 8:16).', array['ROM 10:13','JHN 1:12']::text[], array['new-believers']::text[], 'published')
on conflict (id) do nothing;
