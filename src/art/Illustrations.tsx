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

/** A happy scroll: books, writers and chapters. */
const Scroll = () => (
  <>
    <ellipse cx={80} cy={110} rx={50} ry={5} fill={INK} opacity={0.12} />
    <rect x={38} y={26} width={84} height={72} rx={4} fill={C.sand} {...line} />
    <rect x={28} y={18} width={104} height={14} rx={7} fill={C.woodSoft} {...line} />
    <rect x={28} y={92} width={104} height={14} rx={7} fill={C.woodSoft} {...line} />
    <circle cx={28} cy={25} r={5} fill={C.wood} {...line} strokeWidth={2.2} />
    <circle cx={132} cy={25} r={5} fill={C.wood} {...line} strokeWidth={2.2} />
    <circle cx={28} cy={99} r={5} fill={C.wood} {...line} strokeWidth={2.2} />
    <circle cx={132} cy={99} r={5} fill={C.wood} {...line} strokeWidth={2.2} />
    <path d="M50 44 H110 M50 80 H96" {...line} strokeWidth={2} opacity={0.45} />
    <Eye x={68} y={60} r={4} />
    <Eye x={92} y={60} r={4} />
    <path d="M72 70 q8 6 16 0" fill="none" {...line} strokeWidth={2.4} />
    <circle cx={60} cy={68} r={4} fill={C.redSoft} opacity={0.5} />
    <circle cx={100} cy={68} r={4} fill={C.redSoft} opacity={0.5} />
    {/* A quill */}
    <path d="M136 52 q-16 22 -26 46" fill="none" {...line} strokeWidth={2.2} />
    <path d="M136 52 q10 10 -8 30 q-6 -18 8 -30 Z" fill={C.white} {...line} strokeWidth={2.2} />
  </>
);

/** Joseph's coat of many colours. */
const Coat = () => (
  <>
    <ellipse cx={80} cy={112} rx={46} ry={5} fill={INK} opacity={0.12} />
    <path d="M60 18 L40 24 L18 58 L34 66 L44 50 L42 106 H118 L116 50 L126 66 L142 58 L120 24 L100 18 Q80 30 60 18 Z" fill={C.red} {...line} />
    <path d="M43 40 L117 40 L117 58 L43 58 Z" fill={C.steel} />
    <path d="M43 58 H117 V76 H43 Z" fill={C.pale} />
    <path d="M43 76 H117 V92 H43 Z" fill={C.bread} />
    <path d="M60 18 L40 24 L18 58 L34 66 L44 50 L42 106 H118 L116 50 L126 66 L142 58 L120 24 L100 18 Q80 30 60 18 Z" fill="none" {...line} />
    <path d="M43 40 H117 M43 58 H117 M43 76 H117 M43 92 H117" {...line} strokeWidth={2} opacity={0.5} />
    <path d="M80 26 V106" {...line} strokeWidth={2} opacity={0.5} />
    <circle cx={80} cy={48} r={3} fill={C.white} {...line} strokeWidth={1.6} />
    <circle cx={80} cy={66} r={3} fill={C.white} {...line} strokeWidth={1.6} />
  </>
);

/** Jacob's ladder reaching up to heaven, with a little angel. */
const Ladder = () => (
  <>
    <rect x={6} y={6} width={148} height={108} rx={20} fill={C.night} />
    <circle cx={26} cy={22} r={2} fill={C.white} />
    <circle cx={136} cy={40} r={1.6} fill={C.white} />
    <circle cx={30} cy={70} r={1.6} fill={C.white} />
    <path d="M14 16 q40 -6 54 10" fill="none" stroke={C.steelSoft} strokeWidth={6} strokeLinecap="round" opacity={0.6} />
    <path d="M58 114 L76 14 M86 114 L100 14" {...line} stroke={C.bread} strokeWidth={6} />
    <path d="M58 114 L76 14 M86 114 L100 14" fill="none" {...line} strokeWidth={1.6} />
    {[100, 84, 68, 52, 36, 20].map((y, i) => (
      <path key={i} d={`M${60 + i * 3.2} ${y} H${88 + i * 2.6}`} stroke={C.bread} strokeWidth={4} strokeLinecap="round" />
    ))}
    {/* Angel */}
    <path d="M112 64 q-10 -10 -2 -18 q6 8 8 14 Z M124 64 q10 -10 2 -18 q-6 8 -8 14 Z" fill={C.white} {...line} strokeWidth={2} />
    <path d="M110 84 L118 60 L126 84 Z" fill={C.white} {...line} strokeWidth={2.2} />
    <circle cx={118} cy={54} r={7} fill={C.skin} {...line} strokeWidth={2.2} />
    <ellipse cx={118} cy={44} rx={8} ry={2.6} fill="none" stroke={C.bread} strokeWidth={2.4} />
    <circle cx={115.5} cy={54} r={1.4} fill={INK} />
    <circle cx={120.5} cy={54} r={1.4} fill={INK} />
    {/* Stone pillow */}
    <ellipse cx={40} cy={104} rx={16} ry={8} fill={C.steelSoft} {...line} />
  </>
);

/** The dove coming back with an olive leaf. */
const Dove = () => (
  <>
    <path d="M24 74a56 56 0 0 1 112 0" fill="none" stroke={C.pale} strokeWidth={7} strokeLinecap="round" opacity={0.7} />
    <path d="M10 104 q20 -14 44 -6 q24 -16 50 -2 q22 -10 46 4 V120 H10 Z" fill={C.paleDeep} {...line} />
    <path d="M58 60 q-26 -30 -6 -40 q14 10 22 32 Z" fill={C.white} {...line} />
    <ellipse cx={82} cy={64} rx={30} ry={18} fill={C.white} {...line} />
    <path d="M52 66 L30 58 L36 72 L30 84 L56 74 Z" fill={C.white} {...line} />
    <path d="M96 52 q-6 -26 22 -20 q-2 16 -14 26 Z" fill={C.white} {...line} />
    <circle cx={108} cy={46} r={12} fill={C.white} {...line} />
    <Eye x={111} y={44} r={3.2} />
    <path d="M119 48 l9 3 l-9 3 Z" fill={C.bread} {...line} strokeWidth={2} />
    {/* Olive leaf */}
    <path d="M127 52 q14 -2 18 10 q-14 4 -18 -10 Z" fill={C.pale} {...line} strokeWidth={2.2} />
    <circle cx={98} cy={52} r={3} fill={C.redSoft} opacity={0.5} />
  </>
);

/** Joseph's dream: the sheaves bowing to his sheaf. */
const Sheaves = () => {
  const sheaf = (x: number, tilt: number, key: number) => (
    <g key={key} transform={`rotate(${tilt} ${x} 104)`}>
      <path d={`M${x - 10} 104 L${x - 4} 62 M${x} 104 V58 M${x + 10} 104 L${x + 4} 62`} {...line} stroke={C.bread} strokeWidth={5} />
      <path d={`M${x - 10} 104 L${x - 4} 62 M${x} 104 V58 M${x + 10} 104 L${x + 4} 62`} fill="none" {...line} strokeWidth={1.4} />
      <ellipse cx={x} cy={56} rx={9} ry={14} fill={C.bread} {...line} />
      <path d={`M${x - 9} 84 H${x + 9}`} stroke={C.red} strokeWidth={4} strokeLinecap="round" />
    </g>
  );
  return (
    <>
      <path d="M8 104 H152" {...line} />
      <circle cx={130} cy={26} r={12} fill={C.bread} {...line} />
      {sheaf(30, 18, 1)}
      {sheaf(130, -18, 2)}
      <g>
        <path d="M70 104 L76 46 M80 104 V40 M90 104 L84 46" {...line} stroke={C.bread} strokeWidth={6} />
        <path d="M70 104 L76 46 M80 104 V40 M90 104 L84 46" fill="none" {...line} strokeWidth={1.4} />
        <ellipse cx={80} cy={40} rx={12} ry={18} fill={C.bread} {...line} />
        <path d="M70 80 H90" stroke={C.red} strokeWidth={5} strokeLinecap="round" />
        <circle cx={76} cy={40} r={1.8} fill={INK} />
        <circle cx={84} cy={40} r={1.8} fill={INK} />
        <path d="M76 46 q4 3 8 0" fill="none" {...line} strokeWidth={1.8} />
      </g>
    </>
  );
};

/** A fluffy sheep: Jacob, Laban and the flocks. */
const Sheep = () => {
  const puffs = [
    [52, 58], [66, 48], [82, 46], [98, 50], [110, 60], [106, 74], [90, 80], [72, 80], [56, 74],
  ];
  return (
    <>
      <path d="M8 106 H152" {...line} />
      <path d="M20 106 q4 -10 8 0 M132 106 q4 -12 8 0" fill="none" {...line} stroke={C.paleDeep} strokeWidth={2.4} />
      <path d="M64 84 V104 M76 86 V106 M94 86 V106 M104 84 V104" {...line} strokeWidth={5} />
      {puffs.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={13} fill={C.white} {...line} />
      ))}
      <ellipse cx={82} cy={64} rx={28} ry={16} fill={C.white} />
      <ellipse cx={42} cy={60} rx={14} ry={16} fill={C.black} {...line} />
      <path d="M30 52 q-8 -2 -10 6 q6 4 12 0" fill={C.black} {...line} strokeWidth={2.2} />
      <circle cx={38} cy={58} r={3.2} fill={C.white} />
      <circle cx={38.6} cy={58} r={1.8} fill={INK} />
      <circle cx={47} cy={58} r={3.2} fill={C.white} />
      <circle cx={47.6} cy={58} r={1.8} fill={INK} />
      <path d="M38 68 q4 3 8 0" fill="none" stroke={C.white} strokeWidth={2} strokeLinecap="round" />
      <circle cx={40} cy={44} r={7} fill={C.white} {...line} strokeWidth={2.2} />
    </>
  );
};

/** Creation: a smiling sun with the moon and stars. */
const Sun = () => (
  <>
    <rect x={84} y={6} width={70} height={108} rx={20} fill={C.night} />
    <rect x={6} y={6} width={78} height={108} rx={20} fill={C.steelSoft} />
    <rect x={64} y={6} width={30} height={108} fill={C.steelSoft} />
    <rect x={84} y={6} width={20} height={108} fill={C.night} />
    <g stroke={C.bread} strokeWidth={5} strokeLinecap="round">
      <path d="M44 16 V24 M44 96 V104 M10 60 H18 M70 60 H78 M20 36 L26 42 M62 78 L68 84 M20 84 L26 78 M62 42 L68 36" />
    </g>
    <circle cx={44} cy={60} r={24} fill={C.bread} {...line} />
    <Eye x={36} y={56} r={3.4} />
    <Eye x={52} y={56} r={3.4} />
    <path d="M37 66 q7 6 14 0" fill="none" {...line} strokeWidth={2.4} />
    <path d="M128 40 a18 18 0 1 1 -14 -22 a14 14 0 1 0 14 22 Z" fill={C.sand} {...line} />
    <circle cx={110} cy={84} r={2.4} fill={C.white} />
    <circle cx={138} cy={92} r={2} fill={C.white} />
    <circle cx={124} cy={70} r={1.6} fill={C.white} />
    <circle cx={142} cy={60} r={1.6} fill={C.white} />
  </>
);

/** A crown: kings, judges and rulers. */
const Crown = () => (
  <>
    <ellipse cx={80} cy={106} rx={52} ry={6} fill={INK} opacity={0.12} />
    <path d="M28 92 L22 38 L52 62 L80 26 L108 62 L138 38 L132 92 Z" fill={C.bread} {...line} />
    <rect x={26} y={88} width={108} height={14} rx={4} fill={C.woodSoft} {...line} />
    <circle cx={22} cy={36} r={6} fill={C.red} {...line} strokeWidth={2.2} />
    <circle cx={80} cy={22} r={7} fill={C.steel} {...line} strokeWidth={2.2} />
    <circle cx={138} cy={36} r={6} fill={C.pale} {...line} strokeWidth={2.2} />
    <circle cx={54} cy={95} r={3.5} fill={C.red} />
    <circle cx={80} cy={95} r={3.5} fill={C.steel} />
    <circle cx={106} cy={95} r={3.5} fill={C.pale} />
    <Eye x={68} y={66} r={3.6} />
    <Eye x={92} y={66} r={3.6} />
    <path d="M72 76 q8 6 16 0" fill="none" {...line} strokeWidth={2.4} />
  </>
);

/** A stone well in the field, where Jacob met Rachel. */
const Well = () => (
  <>
    <path d="M8 104 H152" {...line} />
    <path d="M44 22 V60 M116 22 V60" {...line} stroke={C.wood} strokeWidth={6} />
    <path d="M44 22 V60 M116 22 V60" fill="none" {...line} strokeWidth={1.4} />
    <path d="M34 26 L80 8 L126 26 Z" fill={C.red} {...line} />
    <path d="M44 36 H116" {...line} strokeWidth={3} />
    <path d="M80 36 V54" {...line} strokeWidth={2} />
    <path d="M72 54 h16 l-2 12 h-12 Z" fill={C.wood} {...line} strokeWidth={2.4} />
    <rect x={34} y={64} width={92} height={40} rx={6} fill={C.steelSoft} {...line} />
    <path d="M34 78 H126 M34 92 H126 M58 64 V78 M90 64 V78 M74 78 V92 M106 78 V92 M50 92 V104 M88 92 V104" {...line} strokeWidth={2} opacity={0.5} />
    <ellipse cx={80} cy={64} rx={46} ry={6} fill={C.water} {...line} />
    <Eye x={66} y={88} r={3} />
    <Eye x={94} y={88} r={3} />
    <path d="M74 96 q6 4 12 0" fill="none" {...line} strokeWidth={2} />
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
  scroll: Scroll,
  coat: Coat,
  ladder: Ladder,
  dove: Dove,
  sheaves: Sheaves,
  sheep: Sheep,
  sun: Sun,
  crown: Crown,
  well: Well,
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
