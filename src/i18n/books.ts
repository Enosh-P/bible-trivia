/** The 66 books, in canonical order. Tamil names follow the BSI O.V. headings. */
export interface Book {
  code: string;
  en: string;
  ta: string;
  testament: 'OT' | 'NT';
}

const OT: [string, string, string][] = [
  ['GEN', 'Genesis', 'ஆதியாகமம்'],
  ['EXO', 'Exodus', 'யாத்திராகமம்'],
  ['LEV', 'Leviticus', 'லேவியராகமம்'],
  ['NUM', 'Numbers', 'எண்ணாகமம்'],
  ['DEU', 'Deuteronomy', 'உபாகமம்'],
  ['JOS', 'Joshua', 'யோசுவா'],
  ['JDG', 'Judges', 'நியாயாதிபதிகள்'],
  ['RUT', 'Ruth', 'ரூத்'],
  ['1SA', '1 Samuel', '1 சாமுவேல்'],
  ['2SA', '2 Samuel', '2 சாமுவேல்'],
  ['1KI', '1 Kings', '1 இராஜாக்கள்'],
  ['2KI', '2 Kings', '2 இராஜாக்கள்'],
  ['1CH', '1 Chronicles', '1 நாளாகமம்'],
  ['2CH', '2 Chronicles', '2 நாளாகமம்'],
  ['EZR', 'Ezra', 'எஸ்றா'],
  ['NEH', 'Nehemiah', 'நெகேமியா'],
  ['EST', 'Esther', 'எஸ்தர்'],
  ['JOB', 'Job', 'யோபு'],
  ['PSA', 'Psalms', 'சங்கீதம்'],
  ['PRO', 'Proverbs', 'நீதிமொழிகள்'],
  ['ECC', 'Ecclesiastes', 'பிரசங்கி'],
  ['SNG', 'Song of Solomon', 'உன்னதப்பாட்டு'],
  ['ISA', 'Isaiah', 'ஏசாயா'],
  ['JER', 'Jeremiah', 'எரேமியா'],
  ['LAM', 'Lamentations', 'புலம்பல்'],
  ['EZK', 'Ezekiel', 'எசேக்கியேல்'],
  ['DAN', 'Daniel', 'தானியேல்'],
  ['HOS', 'Hosea', 'ஓசியா'],
  ['JOL', 'Joel', 'யோவேல்'],
  ['AMO', 'Amos', 'ஆமோஸ்'],
  ['OBA', 'Obadiah', 'ஒபதியா'],
  ['JON', 'Jonah', 'யோனா'],
  ['MIC', 'Micah', 'மீகா'],
  ['NAM', 'Nahum', 'நாகூம்'],
  ['HAB', 'Habakkuk', 'ஆபகூக்'],
  ['ZEP', 'Zephaniah', 'செப்பனியா'],
  ['HAG', 'Haggai', 'ஆகாய்'],
  ['ZEC', 'Zechariah', 'சகரியா'],
  ['MAL', 'Malachi', 'மல்கியா'],
];

const NT: [string, string, string][] = [
  ['MAT', 'Matthew', 'மத்தேயு'],
  ['MRK', 'Mark', 'மாற்கு'],
  ['LUK', 'Luke', 'லூக்கா'],
  ['JHN', 'John', 'யோவான்'],
  ['ACT', 'Acts', 'அப்போஸ்தலருடைய நடபடிகள்'],
  ['ROM', 'Romans', 'ரோமர்'],
  ['1CO', '1 Corinthians', '1 கொரிந்தியர்'],
  ['2CO', '2 Corinthians', '2 கொரிந்தியர்'],
  ['GAL', 'Galatians', 'கலாத்தியர்'],
  ['EPH', 'Ephesians', 'எபேசியர்'],
  ['PHP', 'Philippians', 'பிலிப்பியர்'],
  ['COL', 'Colossians', 'கொலோசெயர்'],
  ['1TH', '1 Thessalonians', '1 தெசலோனிக்கேயர்'],
  ['2TH', '2 Thessalonians', '2 தெசலோனிக்கேயர்'],
  ['1TI', '1 Timothy', '1 தீமோத்தேயு'],
  ['2TI', '2 Timothy', '2 தீமோத்தேயு'],
  ['TIT', 'Titus', 'தீத்து'],
  ['PHM', 'Philemon', 'பிலேமோன்'],
  ['HEB', 'Hebrews', 'எபிரெயர்'],
  ['JAS', 'James', 'யாக்கோபு'],
  ['1PE', '1 Peter', '1 பேதுரு'],
  ['2PE', '2 Peter', '2 பேதுரு'],
  ['1JN', '1 John', '1 யோவான்'],
  ['2JN', '2 John', '2 யோவான்'],
  ['3JN', '3 John', '3 யோவான்'],
  ['JUD', 'Jude', 'யூதா'],
  ['REV', 'Revelation', 'வெளிப்படுத்தின விசேஷம்'],
];

export const BOOKS: Book[] = [
  ...OT.map(([code, en, ta]) => ({ code, en, ta, testament: 'OT' as const })),
  ...NT.map(([code, en, ta]) => ({ code, en, ta, testament: 'NT' as const })),
];

export const BOOK_BY_CODE: Record<string, Book> = Object.fromEntries(BOOKS.map((b) => [b.code, b]));

export function formatRef(
  lang: 'en' | 'ta',
  book: string,
  chapter: number,
  verse?: number,
  verseEnd?: number,
): string {
  const b = BOOK_BY_CODE[book];
  const name = b ? b[lang] : book;
  if (!verse) return `${name} ${chapter}`;
  return `${name} ${chapter}:${verse}${verseEnd ? `–${verseEnd}` : ''}`;
}
