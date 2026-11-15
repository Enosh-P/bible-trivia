import type { ReactNode } from 'react';

/*
 * Shared drawing kit for the cartoon pictures (Illustrations.tsx, Scenes.tsx).
 * Style rules:
 *   - viewBox 0 0 160 120, chunky ink outline (3px, round caps/joins), flat fills, no gradients
 *   - friendly faces (eyes = ink dots)
 *   - colours only from the palette `C`
 */

export const INK = '#1d2430';
export const C = {
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

export const line = { stroke: INK, strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function Eye({ x, y, r = 4 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={INK} />
      <circle cx={x + r * 0.35} cy={y - r * 0.35} r={r * 0.35} fill={C.white} />
    </g>
  );
}

export const Waves = ({ y = 96, fill = C.water }: { y?: number; fill?: string }) => (
  <path d={`M0 ${y} q10 -6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 V120 H0 Z`} fill={fill} {...line} />
);

export const Ground = ({ y = 104 }: { y?: number }) => <path d={`M8 ${y} H152`} {...line} />;

export const Smile = ({ x, y, w = 8 }: { x: number; y: number; w?: number }) => (
  <path d={`M${x - w / 2} ${y} q${w / 2} ${w * 0.6} ${w} 0`} fill="none" {...line} strokeWidth={2.2} />
);

/* ---------- People: a small cartoon figure kit for scenes ----------
 * <Person x y /> stands with its feet at (x, y), about 66 units tall at s=1, and faces right
 * (use `flip` to face left, `look` to turn the face a little).
 * Poses: stand, walk, raise (arms up), point (arm forward), sit (on a stool; seat={false} hides it),
 *        kneel, bow (kneeling, bent to the ground), bowStand (standing, bent low from the waist).
 * `lean` tips the upper body forward by that many degrees. `hands` moves the two hands
 * ([back arm, front arm], in the figure's own coordinates: shoulders are at (-7,-37) and (7,-37)).
 * Children passed in are drawn on top in the figure's own coordinates (things held in the hand).
 * Men can have a beard; women wear a head covering. `back` draws the figure from behind (no face).
 */
export type Pose = 'stand' | 'walk' | 'raise' | 'point' | 'sit' | 'kneel' | 'bow' | 'bowStand';
export type Mood = 'smile' | 'sad' | 'cry' | 'angry' | 'sleep' | 'wow';
type Pt = [number, number];
export interface PersonProps {
  x: number;
  y: number;
  s?: number;
  flip?: boolean;
  robe?: string;
  beard?: 'dark' | 'white' | 'red';
  woman?: boolean;
  child?: boolean;
  pose?: Pose;
  headcloth?: string;
  hair?: string;
  look?: number;
  mood?: Mood;
  back?: boolean;
  lean?: number;
  rot?: number;
  seat?: boolean;
  sash?: string | null;
  stripes?: boolean;
  wings?: boolean;
  crown?: boolean;
  nemes?: boolean;
  hands?: [Pt | null, Pt | null];
  children?: ReactNode;
}

type HeadProps = Pick<PersonProps, 'beard' | 'woman' | 'headcloth' | 'hair' | 'look' | 'mood' | 'back' | 'crown' | 'nemes'>;

function Head({ beard, woman, headcloth, hair, look = 0, mood = 'smile', back, crown, nemes }: HeadProps) {
  const dx = look * 2.5;
  const hairC = hair ?? (beard === 'white' ? C.steelSoft : C.night);
  const beardC = beard === 'white' ? C.white : beard === 'red' ? C.redSoft : C.mane;
  const crownEl = crown && <path d="M-9 -60 L-11 -71 L-5 -66 L0 -73 L5 -66 L11 -71 L9 -60 Z" fill={C.bread} {...line} strokeWidth={2} />;
  if (back) {
    return (
      <g>
        <path d="M-11 -52 Q-13 -38 -8 -35 H8 Q13 -38 11 -52 Z" fill={headcloth ?? hairC} {...line} strokeWidth={2.2} />
        <circle cx={0} cy={-52} r={10} fill={headcloth ?? hairC} {...line} strokeWidth={2.4} />
        {crownEl}
      </g>
    );
  }
  const sadBrow = mood === 'sad' || mood === 'cry';
  return (
    <g>
      {woman && <path d="M-13 -48 Q-14 -66 0 -66 Q14 -66 13 -48 L15 -30 H-15 Z" fill={headcloth ?? C.steelSoft} {...line} strokeWidth={2.2} />}
      {nemes && <path d="M-15 -35 L-12 -58 Q0 -70 12 -58 L15 -35 L8 -37 V-52 H-8 V-37 Z" fill={C.steel} {...line} strokeWidth={2.2} />}
      <circle cx={0} cy={-52} r={10} fill={C.skin} {...line} strokeWidth={2.4} />
      {beard && (
        <path
          d="M-9 -50 Q-8 -36 0 -34 Q8 -36 9 -50 Q4 -45 0 -45 Q-4 -45 -9 -50 Z"
          fill={beardC}
          {...line}
          strokeWidth={2}
          transform={`translate(${dx * 0.5} 0)`}
        />
      )}
      {!woman && !nemes && headcloth && <path d="M-11 -54 Q0 -68 11 -54 L12 -46 Q0 -52 -12 -46 Z" fill={headcloth} {...line} strokeWidth={2} />}
      {!woman && !nemes && !headcloth && <path d="M-10 -56 Q0 -66 10 -56" fill="none" {...line} stroke={hairC} strokeWidth={4} />}
      {nemes && <path d="M-10 -56 Q0 -64 10 -56" fill="none" {...line} stroke={C.bread} strokeWidth={4} />}
      {woman && <path d="M-11 -50 Q-12 -62 0 -63 Q12 -62 11 -50" fill="none" stroke={headcloth ?? C.steelSoft} strokeWidth={3} />}
      {mood === 'sleep' ? (
        <path d={`M${dx - 5.5} -53 q2 2 4 0 M${dx + 1.5} -53 q2 2 4 0`} fill="none" {...line} strokeWidth={1.5} />
      ) : (
        <>
          <circle cx={dx - 3.5} cy={-53} r={1.4} fill={INK} />
          <circle cx={dx + 3.5} cy={-53} r={1.4} fill={INK} />
        </>
      )}
      {mood === 'angry' && <path d={`M${dx - 7} -58.5 l5 2.5 M${dx + 7} -58.5 l-5 2.5`} fill="none" {...line} strokeWidth={1.8} />}
      {(sadBrow || mood === 'wow') && (
        <path d={`M${dx - 7} ${mood === 'wow' ? -58 : -56} l5 -2 M${dx + 7} ${mood === 'wow' ? -58 : -56} l-5 -2`} fill="none" {...line} strokeWidth={1.6} />
      )}
      {mood === 'cry' && (
        <>
          <circle cx={dx - 5.5} cy={-49} r={1.5} fill={C.steel} />
          <circle cx={dx + 5.5} cy={-47.5} r={1.5} fill={C.steel} />
        </>
      )}
      {mood === 'wow' && <circle cx={dx} cy={-46.5} r={2} fill={INK} />}
      {!beard && (mood === 'smile' || mood === 'sleep') && <path d={`M${dx - 3} -48 q3 2 6 0`} fill="none" {...line} strokeWidth={1.6} />}
      {!beard && (sadBrow || mood === 'angry') && <path d={`M${dx - 3} -46.5 q3 -2.4 6 0`} fill="none" {...line} strokeWidth={1.6} />}
      {crownEl}
    </g>
  );
}

const ARMS: Record<Pose, [Pt, Pt]> = {
  stand: [[-12, -18], [12, -18]],
  walk: [[-13, -20], [14, -22]],
  raise: [[-16, -58], [16, -58]],
  point: [[-12, -18], [28, -40]],
  sit: [[-4, -20], [16, -22]],
  kneel: [[-11, -20], [15, -24]],
  bow: [[9, -39], [16, -34]],
  bowStand: [[5, -29], [18, -29]],
};

export function Person(p: PersonProps) {
  const { x, y, s = 1, flip, robe = C.steel, child, pose = 'stand', hands, rot, seat = true, stripes, wings, children } = p;
  const sash = p.sash === undefined ? C.bread : p.sash;
  const scale = (child ? 0.7 : 1) * s;
  const kneel = pose === 'kneel' || pose === 'bow';
  const lean = p.lean ?? (pose === 'bow' ? 72 : pose === 'bowStand' ? 55 : 0);
  const drop = kneel ? 12 : 0;
  const split = kneel || lean !== 0;
  const sx = pose === 'sit' ? 6 : 7;
  const ends: [Pt, Pt] = [hands?.[0] ?? ARMS[pose][0], hands?.[1] ?? ARMS[pose][1]];
  const arm = (from: Pt, to: Pt, key: number) => (
    <g key={key}>
      <path d={`M${from[0]} ${from[1]} L${to[0]} ${to[1]}`} fill="none" {...line} strokeWidth={8} />
      <path d={`M${from[0]} ${from[1]} L${to[0]} ${to[1]}`} fill="none" stroke={robe} strokeWidth={5} strokeLinecap="round" />
      <circle cx={to[0]} cy={to[1]} r={3.2} fill={C.skin} {...line} strokeWidth={1.6} />
    </g>
  );
  const wingsEl = wings && (
    <path
      d="M-7 -38 Q-34 -62 -28 -16 Q-18 -22 -8 -24 Z M7 -38 Q34 -62 28 -16 Q18 -22 8 -24 Z"
      fill={C.white}
      {...line}
      strokeWidth={2.2}
    />
  );
  const upper = (
    <g transform={split ? `translate(0 ${drop}) rotate(${lean} 0 -22)` : undefined}>
      {split && wingsEl}
      {split && <path d="M-10.5 -20 L-9 -39 Q0 -45 9 -39 L10.5 -20 Z" fill={robe} {...line} />}
      {split && <circle cx={0} cy={-22} r={9.3} fill={robe} />}
      <Head {...p} />
      {arm([-sx, -37], ends[0], 0)}
      {arm([sx, -37], ends[1], 1)}
    </g>
  );
  let lower;
  if (pose === 'sit') {
    lower = (
      <>
        {seat && <rect x={-14} y={-14} width={18} height={14} rx={3} fill={C.wood} {...line} strokeWidth={2} />}
        <path d="M-10 -14 L-8 -40 Q0 -45 8 -40 L10 -18 H22 V-6 H6 Z" fill={robe} {...line} />
        <ellipse cx={19} cy={-1} rx={4.5} ry={2.4} fill={INK} />
        <path d="M17 -6 V-2" {...line} strokeWidth={4} />
      </>
    );
  } else if (kneel) {
    lower = (
      <>
        <circle cx={0} cy={-10} r={10.5} fill={robe} {...line} />
        <path d="M-21 0 Q-24 -9 -12 -11 L-10.5 -11 H10.5 L12 0 Z" fill={robe} {...line} />
      </>
    );
  } else if (split) {
    lower = (
      <>
        <circle cx={0} cy={-22} r={11} fill={robe} {...line} />
        <ellipse cx={-5} cy={0} rx={4.5} ry={2.4} fill={INK} />
        <ellipse cx={6} cy={0} rx={4.5} ry={2.4} fill={INK} />
        <path d="M-13 0 L-11 -22 H11 L13 0 Z" fill={robe} {...line} />
      </>
    );
  } else {
    const w = (yy: number) => 9 + (4 * (yy + 39)) / 39;
    const band = (y1: number, y2: number, fill: string) => (
      <path d={`M${-w(y1)} ${y1} H${w(y1)} L${w(y2)} ${y2} H${-w(y2)} Z`} fill={fill} />
    );
    lower = (
      <>
        {wingsEl}
        <ellipse cx={pose === 'walk' ? -7 : -5} cy={0} rx={4.5} ry={2.4} fill={INK} />
        <ellipse cx={pose === 'walk' ? 9 : 6} cy={0} rx={4.5} ry={2.4} fill={INK} />
        <path d="M-13 0 L-9 -39 Q0 -45 9 -39 L13 0 Z" fill={robe} {...line} />
        {stripes && (
          <>
            {band(-31, -24, C.steel)}
            {band(-18, -11, C.pale)}
            {band(-7, -1.5, C.bread)}
            <path d="M-13 0 L-9 -39 Q0 -45 9 -39 L13 0 Z" fill="none" {...line} />
          </>
        )}
        {sash && !stripes && <path d="M-10 -22 H10" {...line} strokeWidth={2} stroke={sash} />}
      </>
    );
  }
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})${rot ? ` rotate(${rot})` : ''}`}>
      {lower}
      {upper}
      {children}
    </g>
  );
}
