export type Lang = 'en' | 'ta';

export type ArtKey =
  | 'ark' | 'fish' | 'lion' | 'sling' | 'bush' | 'star' | 'loaves' | 'horse' | 'tree'
  | 'scroll' | 'coat' | 'ladder' | 'dove' | 'sheaves' | 'sheep' | 'sun' | 'crown' | 'well'
  | 'harp' | 'boat' | 'river' | 'altar' | 'path' | 'elder' | 'raven' | 'tower' | 'tent' | 'stars' | 'cave' | 'bow' | 'camel' | 'stones' | 'coins' | 'ring' | 'cup' | 'cows' | 'sacks' | 'wagon' | 'donkey' | 'lamp' | 'sword'
  // action scenes (src/art/Scenes*.tsx)
  | 'callFishers' | 'cainAbel' | 'prayCall' | 'walkWithGod' | 'noahRaven' | 'noahDove' | 'noahAltar' | 'jacobAltar'
  | 'nightAltar' | 'abramJourney' | 'abramLot' | 'abram318' | 'hagarAngel' | 'abrahamPleads' | 'buyCave' | 'moriahJourney'
  | 'jacobIsaac' | 'esauAngry' | 'jacobDream' | 'jacobRachel' | 'labanWelcome' | 'esauEmbrace' | 'jacobShepherd' | 'josephShepherd'
  | 'goatDrove' | 'reubenMandrakes' | 'handmaid' | 'motherSons' | 'labanChase' | 'rachelCamel' | 'angelsMeet' | 'esau400'
  | 'wrestle' | 'jacobBows' | 'heapStones' | 'simeonLevi' | 'buryIdols' | 'mournOak' | 'mournAtad' | 'josephDreams'
  | 'reubenPit' | 'josephSold' | 'coatBlood' | 'tamarSignet' | 'prison' | 'pharaohDream' | 'josephChariot' | 'josephFamily'
  | 'granary' | 'simeonBound' | 'pleadJacob' | 'feastByAge' | 'cupSack' | 'wagons' | 'donkeyGifts' | 'crossedHands'
  | 'countStars' | 'jacobPillar' | 'hannahElkanah' | 'samuelLamp' | 'ehud' | 'deborahPalm' | 'solomonCrowned' | 'mosesWell'
  | 'mosesSons' | 'davidHarp' | 'templeSingers' | 'pilgrims' | 'davidFlees' | 'davidWindow' | 'davidMad' | 'davidCave'
  | 'nathanDavid' | 'davidPray' | 'babylonRivers' | 'tellSaul'
  | 'writer' | 'bookch';

/** How a question is asked. Every type renders as multiple choice except `tf`. */
export type QuestionType =
  | 'mcq' //   general multiple choice
  | 'tf' //    true / false statement
  | 'who' //   "Who said it?"
  | 'book' //  "Which book?"
  | 'blank'; // fill the blank in a verse

export type Difficulty = 1 | 2 | 3;

export interface LocalizedText {
  /** The question or statement. For `blank`, the gap is written as "____". */
  q: string;
  /** Answer options (same order in both languages). Omitted for `tf`. */
  options?: string[];
  /** Short explanation shown after answering. */
  explain?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  /** USFM-style book code, e.g. GEN, JHN, REV. */
  book: string;
  chapter: number;
  verse?: number;
  verseEnd?: number;
  difficulty: Difficulty;
  /** Index into `options`, or a boolean for `tf`. Same for both languages. */
  answer: number | boolean;
  en: LocalizedText;
  ta: LocalizedText;
  tags?: string[];
  /** Optional cartoon illustration key (see src/art). */
  art?: ArtKey;
  /** Words written on the picture (e.g. a book's name and its chapter count; "?" where that is the answer). */
  artLabel?: { en: string; ta: string; n: string };
}

export interface QuestionPack {
  id: string;
  title: { en: string; ta: string };
  questions: Question[];
}
