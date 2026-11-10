import type { ReactElement } from 'react';
import type { ArtKey } from '../engine/types';

/*
 * Cartoon "sticker" illustrations for questions.
 * Style rules (keep new art consistent):
 *   - viewBox 0 0 160 120, drawn on a light sticker card in both themes
 *   - chunky ink outline (3px, round caps/joins), flat fills, no gradients
 *   - friendly faces where it makes sense (eyes = ink dots + white glint)
 *   - accents come from the horse palette (red / pale / steel)
 */

const INK = '#1d2430';
const C = {
  red: '#e0493e',
  redSoft: '#f08a6e',
  pale: '#8fbfa3',
  paleDeep: '#5f9a78',
  steel: '#7fa6c9',
  steelSoft: '#b9cfe2',
  water: '#9fbad3',
  wood: '#9c7656',
  woodSoft: '#c49b78',
  bread: '#dcb68c',
  sand: '#dcc6a6',
  mane: '#a9784f',
  skin: '#c99a72',
  white: '#ffffff',
  night: '#2a3444',
  black: '#2a2f38',
};

const line = { stroke: INK, strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function Eye({ x, y, r = 4 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={INK} />
      <circle cx={x + r * 0.35} cy={y - r * 0.35} r={r * 0.35} fill={C.white} />
    </g>
  );
}

const Waves = ({ y = 96, fill = C.water }: { y?: number; fill?: string }) => (
  <path
    d={`M0 ${y} q10 -6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 V120 H0 Z`}
    fill={fill}
    {...line}
  />
);

const Ark = () => (
  <>
    <path d="M24 74a56 56 0 0 1 112 0" fill="none" stroke={C.red} strokeWidth={7} strokeLinecap="round" />
    <path d="M33 74a47 47 0 0 1 94 0" fill="none" stroke={C.pale} strokeWidth={7} strokeLinecap="round" />
    <path d="M42 74a38 38 0 0 1 76 0" fill="none" stroke={C.steel} strokeWidth={7} strokeLinecap="round" />
    <Waves y={98} />
    <path d="M28 80 H132 L118 102 H42 Z" fill={C.wood} {...line} />
    <path d="M40 90 H120" {...line} stroke={INK} strokeWidth={2} opacity={0.5} />
    <rect x={56} y={60} width={48} height={20} rx={3} fill={C.woodSoft} {...line} />
    <path d="M50 62 L80 46 L110 62 Z" fill={C.red} {...line} />
    {/* Two giraffes peeking out of the window */}
    <path d="M70 60 V40" stroke={C.bread} strokeWidth={6} strokeLinecap="round" />
    <path d="M70 60 V40" fill="none" {...line} strokeWidth={1.5} />
    <ellipse cx={72} cy={36} rx={7} ry={5} fill={C.bread} {...line} strokeWidth={2} />
    <circle cx={74} cy={35} r={1.6} fill={INK} />
    <circle cx={68} cy={70} r={4} fill={INK} />
    <circle cx={92} cy={70} r={4} fill={INK} />
    {/* Dove */}
    <path d="M128 30 q8 -8 16 0 q-4 4 -10 4 l-2 6 l-4 -6 q-4 0 -6 -4 Z" fill={C.white} {...line} strokeWidth={2.2} />
  </>
);

const Fish = () => (
  <>
    <circle cx={44} cy={22} r={4} fill={C.white} {...line} strokeWidth={2} />
    <circle cx={34} cy={34} r={2.8} fill={C.white} {...line} strokeWidth={2} />
    <Waves y={104} />
    <path d="M124 66 L152 44 L146 66 L152 90 Z" fill={C.steel} {...line} />
    <ellipse cx={80} cy={66} rx={52} ry={32} fill={C.steel} {...line} />
    <path d="M44 82 q36 18 76 -2" fill="none" {...line} strokeWidth={2} opacity={0.55} />
    <path d="M78 40 q8 -16 22 -10" fill={C.steelSoft} {...line} />
    {/* Little Jonah peeking from the mouth */}
    <circle cx={34} cy={66} r={9} fill={C.skin} {...line} strokeWidth={2.4} />
    <circle cx={31} cy={65} r={1.5} fill={INK} />
    <circle cx={37} cy={65} r={1.5} fill={INK} />
    <path d="M30 59 q4 -6 9 0" fill="none" {...line} strokeWidth={2} />
    <path d="M28 74 q14 6 22 -2" fill="none" {...line} />
    <circle cx={58} cy={52} r={9} fill={C.white} {...line} />
    <Eye x={60} y={53} r={4} />
  </>
);

const Lion = () => {
  const tufts = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    return <circle key={i} cx={80 + Math.cos(a) * 36} cy={62 + Math.sin(a) * 36} r={12} fill={C.mane} {...line} />;
  });
  return (
    <>
      {tufts}
      <circle cx={80} cy={62} r={36} fill={C.mane} />
      <circle cx={57} cy={40} r={7} fill={C.sand} {...line} />
      <circle cx={103} cy={40} r={7} fill={C.sand} {...line} />
      <circle cx={80} cy={64} r={27} fill={C.sand} {...line} />
      {/* Sleepy eyes — the angel shut the lions' mouths */}
      <path d="M66 58 q5 4 10 0 M84 58 q5 4 10 0" fill="none" {...line} />
      <path d="M75 68 h10 l-5 5 Z" fill={INK} {...line} strokeWidth={2} />
      <path d="M80 73 v4 M73 79 q7 4 14 0" fill="none" {...line} strokeWidth={2.4} />
      <circle cx={63} cy={70} r={4} fill={C.redSoft} opacity={0.5} />
      <circle cx={97} cy={70} r={4} fill={C.redSoft} opacity={0.5} />
      <text x={122} y={30} fontSize={16} fontWeight={800} fill={INK} fontFamily="system-ui">z</text>
      <text x={134} y={18} fontSize={12} fontWeight={800} fill={INK} fontFamily="system-ui">z</text>
    </>
  );
};

const Sling = () => (
  <>
    <path d="M40 30 a40 40 0 1 0 64 6" fill="none" {...line} strokeDasharray="2 9" opacity={0.6} />
    <path d="M26 104 L58 50 M58 50 L92 92" fill="none" stroke={C.woodSoft} strokeWidth={6} strokeLinecap="round" />
    <path d="M26 104 L58 50 L92 92" fill="none" {...line} strokeWidth={1.6} />
    <path d="M50 50 q8 14 16 0" fill={C.wood} {...line} />
    <circle cx={58} cy={46} r={7} fill={C.steelSoft} {...line} />
    {/* The stone flying toward Goliath, with speed lines */}
    <circle cx={122} cy={34} r={9} fill={C.steelSoft} {...line} />
    <path d="M92 30 h14 M96 40 h12 M100 22 h8" {...line} strokeWidth={2.4} />
    {/* Five smooth stones */}
    {[104, 118, 132, 111, 125].map((x, i) => (
      <ellipse key={i} cx={x} cy={i < 3 ? 104 : 94} rx={7} ry={5} fill={C.steelSoft} {...line} strokeWidth={2.2} />
    ))}
  </>
);

const Bush = () => (
  <>
    <path d="M20 108 H140" {...line} />
    <path
      d="M44 108 q-18 -4 -14 -22 q-12 -16 6 -26 q2 -18 22 -14 q10 -14 26 -4 q18 -8 26 8 q20 2 16 22 q12 14 -4 26 q2 10 -10 10 Z"
      fill={C.pale}
      {...line}
    />
    <path d="M60 96 q6 -12 18 -10 M88 92 q10 -8 16 2" fill="none" {...line} strokeWidth={2.2} opacity={0.6} />
    <path
      d="M52 52 q-6 -20 10 -30 q-2 12 8 14 q0 -20 14 -28 q-2 16 10 22 q4 -10 12 -12 q-4 16 2 34 Z"
      fill={C.red}
      {...line}
    />
    <path d="M66 50 q-2 -12 6 -18 q2 8 8 10 q2 -10 8 -14 q0 12 6 22 Z" fill={C.redSoft} />
  </>
);

const Star = () => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 11 : 26;
    return `${80 + Math.cos(a) * r},${40 + Math.sin(a) * r}`;
  }).join(' ');
  return (
    <>
      <rect x={6} y={6} width={148} height={108} rx={20} fill={C.night} />
      <circle cx={30} cy={24} r={2} fill={C.white} />
      <circle cx={130} cy={30} r={2} fill={C.white} />
      <circle cx={140} cy={64} r={1.6} fill={C.white} />
      <circle cx={22} cy={60} r={1.6} fill={C.white} />
      <path d="M80 62 L62 104 M80 62 L98 104" stroke={C.pale} strokeWidth={2} opacity={0.6} />
      <polygon points={pts} fill={C.white} {...line} />
      <circle cx={74} cy={40} r={2.2} fill={INK} />
      <circle cx={86} cy={40} r={2.2} fill={INK} />
      <path d="M75 46 q5 4 10 0" fill="none" {...line} strokeWidth={2} />
      {/* Little stable */}
      <path d="M50 114 V92 L80 76 L110 92 V114" fill={C.wood} {...line} />
      <path d="M44 94 L80 72 L116 94" fill="none" stroke={C.red} strokeWidth={5} strokeLinecap="round" />
      <rect x={72} y={98} width={16} height={16} rx={2} fill={C.night} {...line} strokeWidth={2.2} />
    </>
  );
};

const Loaves = () => (
  <>
    <path d="M22 66 h116 l-12 42 h-92 Z" fill={C.wood} {...line} />
    <path d="M30 80 h100 M34 94 h92" {...line} strokeWidth={2} opacity={0.5} />
    {[34, 54, 74, 94].map((x, i) => (
      <g key={i}>
        <ellipse cx={x + 8} cy={56 - (i % 2) * 6} rx={14} ry={10} fill={C.bread} {...line} />
        <path d={`M${x + 2} ${54 - (i % 2) * 6} l4 -5 M${x + 9} ${56 - (i % 2) * 6} l4 -5`} {...line} strokeWidth={2} />
      </g>
    ))}
    <ellipse cx={62} cy={40} rx={14} ry={10} fill={C.bread} {...line} />
    <path d="M56 38 l4 -5 M63 40 l4 -5" {...line} strokeWidth={2} />
    {/* Two fish */}
    {[
      [118, 44],
      [132, 58],
    ].map(([x, y], i) => (
      <g key={i}>
        <path d={`M${x + 12} ${y} l10 -7 v14 Z`} fill={C.steel} {...line} strokeWidth={2.4} />
        <ellipse cx={x} cy={y} rx={14} ry={8} fill={C.steel} {...line} strokeWidth={2.4} />
        <circle cx={x - 7} cy={y - 2} r={1.8} fill={INK} />
      </g>
    ))}
  </>
);

const Horse = () => (
  <>
    <path
      d="M44 112 C40 92 40 70 50 52 C58 36 76 26 94 28 C110 30 124 42 130 58 C134 70 128 80 116 80 C108 80 102 76 96 76 C92 86 94 100 100 112 Z"
      fill={C.black}
      {...line}
    />
    <path d="M78 32 L82 12 L94 30 Z" fill={C.black} {...line} />
    <path d="M58 44 L44 46 L54 54 L40 58 L50 64 L38 70 L48 76 L38 84 L48 88" fill="none" stroke="#c9d2de" strokeWidth={4} {...{ strokeLinecap: 'round', strokeLinejoin: 'round' }} />
    <circle cx={104} cy={50} r={7} fill={C.white} />
    <Eye x={105} y={51} r={3.6} />
    <circle cx={124} cy={66} r={2.6} fill="#c9d2de" />
    <path d="M110 74 q6 4 12 0" fill="none" stroke="#c9d2de" strokeWidth={2.4} strokeLinecap="round" />
    {/* A pair of balances (Revelation 6:5) */}
    <path d="M140 26 V58 M124 30 H156" {...line} />
    <path d="M124 30 l-6 14 h12 Z M156 30 l-6 14 h12 Z" fill={C.steelSoft} {...line} strokeWidth={2.2} />
  </>
);

const Tree = () => (
  <>
    <path d="M10 112 H150" {...line} />
    <path d="M72 112 V70 q0 -8 -10 -14 M88 112 V70 q0 -8 12 -16" fill={C.wood} {...line} />
    <rect x={72} y={70} width={16} height={42} fill={C.wood} />
    <path d="M72 112 V70 M88 112 V70" {...line} />
    {[
      [56, 46, 24],
      [84, 32, 28],
      [110, 48, 24],
      [80, 58, 22],
    ].map(([x, y, r], i) => (
      <circle key={i} cx={x} cy={y} r={r} fill={C.pale} {...line} />
    ))}
    <circle cx={80} cy={50} r={30} fill={C.pale} />
    {/* Zacchaeus peeking out of the leaves */}
    <circle cx={104} cy={50} r={11} fill={C.skin} {...line} strokeWidth={2.6} />
    <path d="M94 46 q10 -14 22 -2" fill={INK} />
    <circle cx={100} cy={51} r={1.8} fill={INK} />
    <circle cx={108} cy={51} r={1.8} fill={INK} />
    <path d="M100 56 q4 3 8 0" fill="none" {...line} strokeWidth={2} />
    <circle cx={120} cy={60} r={4} fill={C.skin} {...line} strokeWidth={2} />
    <path d="M44 40 q6 -4 10 2 M66 24 q6 -4 10 2" fill="none" {...line} strokeWidth={2} opacity={0.5} />
  </>
);

const ART: Record<ArtKey, () => ReactElement> = {
  ark: Ark,
  fish: Fish,
  lion: Lion,
  sling: Sling,
  bush: Bush,
  star: Star,
  loaves: Loaves,
  horse: Horse,
  tree: Tree,
};

export const ART_KEYS = Object.keys(ART) as ArtKey[];

export function Illustration({ name, title }: { name: ArtKey; title?: string }) {
  const Art = ART[name];
  return (
    <svg viewBox="0 0 160 120" role={title ? 'img' : 'presentation'} aria-label={title} width="100%" height="100%">
      <Art />
    </svg>
  );
}
