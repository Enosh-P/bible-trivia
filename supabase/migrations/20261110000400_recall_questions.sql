-- Recall questions (human-written question + answer, e.g. unfoldingWord
-- Translation Questions, ~17,000 rows) live in the same questions table.
--   type = 'recall'
--   en   = { "q": "...", "a": "..." }      (answer text, no options)
--   ta   = null until a Tamil version is written and reviewed
--   answer = null (the answer is the text in en.a / ta.a)

alter table questions drop constraint if exists questions_type_check;
alter table questions add constraint questions_type_check
  check (type in ('mcq', 'tf', 'who', 'book', 'blank', 'recall'));

alter table questions alter column ta drop not null;
alter table questions alter column answer drop not null;

-- Every type except recall still needs both languages and an answer.
alter table questions drop constraint if exists questions_complete_check;
alter table questions add constraint questions_complete_check
  check (type = 'recall' or (ta is not null and answer is not null));
alter table questions drop constraint if exists questions_recall_shape_check;
alter table questions add constraint questions_recall_shape_check
  check (type <> 'recall' or (en ? 'q' and en ? 'a'));

-- The app loads Recall cards one book at a time.
create index if not exists questions_recall_book_idx on questions (book_code, chapter) where type = 'recall';
