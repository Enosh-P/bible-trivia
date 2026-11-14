import type { ReactElement } from 'react';
import type { ModeId } from '../engine/modes';

/*
 * Cartoon pictures for the game-mode tiles. Same style as Illustrations.tsx:
 * viewBox 0 0 160 120, chunky ink outline, flat fills, no gradients, friendly faces.
 */

const INK = '#1d2430';
const C = {
  green: '#2a9fc0',
  greenDeep: '#137c99',
  greenSoft: '#c4e8f2',
  red: '#e0493e',
  redSoft: '#f08a6e',
  steel: '#7fa6c9',
  steelSoft: '#b9cfe2',
  sand: '#f3dfb8',
  wood: '#9c7656',
  woodSoft: '#c49b78',
  flame: '#f5a524',
  flameSoft: '#ffd27a',
  white: '#ffffff',
  night: '#2a3444',
  cheek: '#f08a6e',
};
const line = { stroke: INK, strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function Eye({ x, y, r = 3.6 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={INK} />
      <circle cx={x + r * 0.35} cy={y - r * 0.35} r={r * 0.35} fill={C.white} />
    </g>
  );
}
function Face({ x, y, gap = 16, smile = 7 }: { x: number; y: number; gap?: number; smile?: number }) {
  return (
    <g>
      <Eye x={x - gap / 2} y={y} />
      <Eye x={x + gap / 2} y={y} />
      <ellipse cx={x - gap / 2 - 6} cy={y + 7} rx={4} ry={2.6} fill={C.cheek} opacity={0.7} />
      <ellipse cx={x + gap / 2 + 6} cy={y + 7} rx={4} ry={2.6} fill={C.cheek} opacity={0.7} />
      <path d={`M${x - smile / 2} ${y + 6} q${smile / 2} ${smile * 0.6} ${smile} 0`} fill="none" {...line} strokeWidth={2.5} />
    </g>
  );
}
const Shadow = ({ cx = 80, cy = 108, rx = 46 }: { cx?: number; cy?: number; rx?: number }) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={6} fill={INK} opacity={0.08} />
);

/** Quiz by Book: a happy open Bible with a question bubble. */
const Quiz = () => (
  <>
    <Shadow />
    <path d="M30 50 L80 58 L130 50 L130 100 L80 106 L30 100 Z" fill={C.red} {...line} />
    <path d="M80 56 C66 46 48 44 36 48 L36 96 C48 92 66 94 80 102 Z" fill={C.white} {...line} />
    <path d="M80 56 C94 46 112 44 124 48 L124 96 C112 92 94 94 80 102 Z" fill={C.white} {...line} />
    <Face x={80} y={74} gap={34} smile={12} />
    <path d="M108 8 C124 8 136 18 136 31 C136 44 124 53 108 53 C104 53 100 52 97 51 L88 57 L91 47 C85 43 81 37 81 31 C81 18 93 8 108 8 Z" fill={C.white} {...line} />
    <path d="M101 25 C101 20 104 17 108.5 17 C113 17 116 20 116 24 C116 29 110 30 109 34" fill="none" stroke={C.greenDeep} strokeWidth={4.5} strokeLinecap="round" />
    <circle cx={109} cy={43} r={2.8} fill={C.greenDeep} />
  </>
);

/** Classic: a smiling crown. */
const Classic = () => (
  <>
    <Shadow />
    <path d="M38 92 L32 40 L58 62 L80 30 L102 62 L128 40 L122 92 Z" fill={C.flameSoft} {...line} />
    <rect x={36} y={88} width={88} height={14} rx={4} fill={C.flame} {...line} />
    <circle cx={32} cy={38} r={6} fill={C.red} {...line} />
    <circle cx={80} cy={27} r={6} fill={C.green} {...line} />
    <circle cx={128} cy={38} r={6} fill={C.steel} {...line} />
    <Face x={80} y={70} gap={22} smile={10} />
  </>
);

/** Recall: a bright lightbulb with a face. */
const Recall = () => (
  <>
    <Shadow />
    <g stroke={C.flame} strokeWidth={4} strokeLinecap="round">
      <path d="M80 6 V14 M42 22 L48 28 M118 22 L112 28 M30 56 H38 M122 56 H130" />
    </g>
    <path d="M80 20 C100 20 114 34 114 52 C114 66 104 74 100 82 L60 82 C56 74 46 66 46 52 C46 34 60 20 80 20 Z" fill={C.flameSoft} {...line} />
    <rect x={62} y={82} width={36} height={10} rx={3} fill={C.steelSoft} {...line} />
    <rect x={64} y={92} width={32} height={10} rx={3} fill={C.steel} {...line} />
    <Face x={80} y={52} gap={20} smile={10} />
  </>
);

/** True or False: a balance with a tick and a cross. */
const TrueFalse = () => (
  <>
    <Shadow />
    <path d="M80 22 V98" {...line} strokeWidth={4} />
    <path d="M58 102 H102" {...line} strokeWidth={5} />
    <path d="M32 36 L128 30" {...line} strokeWidth={4} />
    <circle cx={80} cy={20} r={6} fill={C.flame} {...line} />
    <path d="M32 36 L18 70 M32 36 L46 70" {...line} strokeWidth={2} />
    <path d="M14 70 Q32 86 50 70 Z" fill={C.greenSoft} {...line} />
    <path d="M25 66 L30 71 L40 59" fill="none" stroke={C.greenDeep} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M128 30 L114 64 M128 30 L142 64" {...line} strokeWidth={2} />
    <path d="M110 64 Q128 80 146 64 Z" fill="#f8c9c2" {...line} />
    <path d="M122 52 L134 62 M134 52 L122 62" stroke={C.red} strokeWidth={4.5} strokeLinecap="round" />
  </>
);

/** Who Said It?: a bearded prophet with a speech bubble. */
const Who = () => (
  <>
    <Shadow cx={62} rx={40} />
    <path d="M30 108 C30 84 44 74 62 74 C80 74 94 84 94 108 Z" fill={C.steel} {...line} />
    <circle cx={62} cy={50} r={24} fill="#e8b98f" {...line} />
    <path d="M38 46 C38 26 50 20 62 20 C76 20 86 28 86 46 C80 38 70 34 62 34 C54 34 44 38 38 46 Z" fill={C.white} {...line} />
    <path d="M42 56 C44 76 54 86 62 86 C70 86 80 76 82 56 C76 62 70 64 62 64 C54 64 48 62 42 56 Z" fill={C.white} {...line} />
    <Eye x={54} y={48} />
    <Eye x={70} y={48} />
    <path d="M57 70 q5 4 10 0" fill="none" {...line} strokeWidth={2.5} />
    <path d="M100 12 H146 Q152 12 152 18 V46 Q152 52 146 52 H116 L104 62 L106 52 H100 Q94 52 94 46 V18 Q94 12 100 12 Z" fill={C.white} {...line} />
    <path d="M106 26 H140 M106 38 H130" stroke={C.greenDeep} strokeWidth={4} strokeLinecap="round" />
  </>
);

/** Which Book?: a rolled scroll with a face. */
const Book = () => (
  <>
    <Shadow />
    <rect x={40} y={26} width={80} height={70} rx={4} fill={C.sand} {...line} />
    <rect x={30} y={18} width={14} height={86} rx={7} fill={C.woodSoft} {...line} />
    <rect x={116} y={18} width={14} height={86} rx={7} fill={C.woodSoft} {...line} />
    <path d="M54 40 H106 M54 84 H96" stroke={INK} strokeWidth={3} strokeLinecap="round" opacity={0.25} />
    <Face x={80} y={60} gap={22} smile={10} />
  </>
);

/** Fill the Blank: a verse card and a pencil. */
const Blank = () => (
  <>
    <Shadow />
    <rect x={22} y={24} width={100} height={74} rx={10} fill={C.white} {...line} />
    <path d="M36 42 H106 M36 58 H58" stroke={INK} strokeWidth={3.5} strokeLinecap="round" opacity={0.3} />
    <rect x={64} y={51} width={34} height={14} rx={4} fill={C.greenSoft} stroke={C.greenDeep} strokeWidth={2.5} strokeDasharray="5 4" />
    <path d="M36 76 H96" stroke={INK} strokeWidth={3.5} strokeLinecap="round" opacity={0.3} />
    <g transform="rotate(35 128 60)">
      <rect x={120} y={22} width={16} height={62} rx={3} fill={C.flame} {...line} />
      <path d="M120 84 L128 100 L136 84 Z" fill={C.sand} {...line} />
      <rect x={120} y={16} width={16} height={10} rx={3} fill={C.redSoft} {...line} />
    </g>
  </>
);

/** Study: an oil lamp ("Thy word is a lamp"). */
const Study = () => (
  <>
    <Shadow />
    <path d="M80 12 C92 28 94 38 86 48 C82 52 76 52 73 48 C66 40 70 28 80 12 Z" fill={C.flame} {...line} />
    <path d="M80 28 C85 36 85 42 81 46 C78 48 76 46 75 44 C73 40 75 34 80 28 Z" fill={C.flameSoft} />
    <path d="M30 70 C30 58 52 52 80 52 C112 52 124 60 136 56 C132 70 118 86 82 86 C52 86 30 82 30 70 Z" fill={C.woodSoft} {...line} />
    <path d="M58 86 L54 100 H108 L104 86" fill={C.wood} {...line} />
    <Face x={80} y={68} gap={22} smile={10} />
  </>
);

/** Speed Round: a running stopwatch. */
const Speed = () => (
  <>
    <Shadow cx={88} />
    <path d="M14 50 H34 M8 66 H30 M16 82 H34" stroke={C.steel} strokeWidth={5} strokeLinecap="round" />
    <rect x={80} y={8} width={16} height={10} rx={3} fill={C.red} {...line} />
    <circle cx={88} cy={62} r={40} fill={C.white} {...line} />
    <circle cx={88} cy={62} r={32} fill="#fde1dc" stroke="none" />
    <path d="M88 62 L88 38" {...line} strokeWidth={4} />
    <path d="M88 62 L104 70" {...line} strokeWidth={4} />
    <circle cx={88} cy={62} r={4} fill={INK} />
    <Eye x={76} y={84} />
    <Eye x={100} y={84} />
  </>
);

/** Survival: three hearts. */
const Heart = ({ x, y, s = 1, fill }: { x: number; y: number; s?: number; fill: string }) => (
  <path
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M0 10 C0 -4 -22 -6 -22 10 C-22 22 -8 30 0 38 C8 30 22 22 22 10 C22 -6 0 -4 0 10 Z"
    fill={fill}
    {...line}
    strokeWidth={3 / s}
  />
);
const Survival = () => (
  <>
    <Shadow />
    <Heart x={38} y={44} s={0.8} fill={C.redSoft} />
    <Heart x={122} y={44} s={0.8} fill={C.redSoft} />
    <Heart x={80} y={28} s={1.4} fill={C.red} />
    <Face x={80} y={56} gap={18} smile={9} />
  </>
);

/** Daily Challenge: a rising sun. */
const Daily = () => (
  <>
    <g stroke={C.flame} strokeWidth={5} strokeLinecap="round">
      <path d="M80 8 V22 M36 26 L46 36 M124 26 L114 36 M18 64 H32 M128 64 H142" />
    </g>
    <path d="M36 84 A44 44 0 0 1 124 84 Z" fill={C.flameSoft} {...line} />
    <path d="M10 84 H150 V112 H10 Z" fill={C.greenSoft} {...line} />
    <Face x={80} y={64} gap={22} smile={10} />
  </>
);

/** Books of the Bible: a shelf of books, one of them smiling. */
const Shelf = () => (
  <>
    <Shadow rx={56} />
    <rect x={18} y={96} width={124} height={10} rx={3} fill={C.wood} {...line} />
    <rect x={26} y={40} width={18} height={56} rx={3} fill={C.red} {...line} />
    <path d="M30 50 H40 M30 86 H40" {...line} strokeWidth={2} />
    <rect x={46} y={30} width={22} height={66} rx={3} fill={C.steel} {...line} />
    <path d="M50 42 H64 M50 84 H64" {...line} strokeWidth={2} />
    <rect x={70} y={22} width={30} height={74} rx={4} fill={C.green} {...line} />
    <path d="M85 30 V44 M79 36 H91" stroke={C.white} strokeWidth={3.5} strokeLinecap="round" />
    <Face x={85} y={66} gap={14} smile={8} />
    <rect x={102} y={44} width={16} height={52} rx={3} fill={C.flame} {...line} />
    <path d="M106 54 H114" {...line} strokeWidth={2} />
    <g transform="rotate(14 128 96)">
      <rect x={120} y={46} width={16} height={50} rx={3} fill={C.steelSoft} {...line} />
    </g>
  </>
);

const ART: Record<ModeId, () => ReactElement> = {
  quiz: Quiz,
  classic: Classic,
  recall: Recall,
  truefalse: TrueFalse,
  who: Who,
  book: Book,
  blank: Blank,
  study: Study,
  speed: Speed,
  survival: Survival,
  daily: Daily,
  practice: Study,
  drill: Shelf,
};

export function ModeArt({ mode, className }: { mode: ModeId; className?: string }) {
  const Art = ART[mode];
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden>
      <Art />
    </svg>
  );
}
