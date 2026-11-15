import type { ReactNode } from 'react';
import { C, INK, line } from './kit';

/* Small props, animals and scenery shared by the scene pictures (Scenes*.tsx). */

type At = { x: number; y: number; s?: number; flip?: boolean };
const tf = ({ x, y, s = 1, flip }: At) => `translate(${x} ${y}) scale(${flip ? -s : s} ${s})`;

export type AnimalKind = 'sheep' | 'goat' | 'donkey' | 'ox' | 'horse';
/** A little four-legged animal with its feet at (x, y), facing right. */
export function Animal({ kind = 'sheep', fill, thin, spot, ...at }: At & { kind?: AnimalKind; fill?: string; thin?: boolean; spot?: boolean }) {
  const eye = (x: number, y: number) => <circle cx={x} cy={y} r={1.4} fill={INK} />;
  let body;
  if (kind === 'sheep') {
    body = (
      <>
        <path d="M-9 -8 V0 M-3 -8 V0 M5 -8 V0 M11 -8 V0" {...line} />
        {[[-10, -16], [-2, -21], [7, -20], [12, -14], [3, -10], [-6, -10]].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={7} fill={fill ?? C.white} {...line} strokeWidth={2.4} />
        ))}
        <ellipse cx={1} cy={-15} rx={12} ry={6.5} fill={fill ?? C.white} />
        <ellipse cx={19} cy={-19} rx={5.5} ry={6.5} fill={C.black} {...line} strokeWidth={2.2} />
        <circle cx={20.5} cy={-20.5} r={1.3} fill={C.white} />
      </>
    );
  } else if (kind === 'goat') {
    body = (
      <>
        <path d="M-10 -9 V0 M-4 -8 V0 M5 -8 V0 M11 -9 V0 M-13 -19 l-4 -5" {...line} strokeWidth={2.6} />
        <ellipse cx={0} cy={-15} rx={14} ry={8} fill={fill ?? C.sand} {...line} strokeWidth={2.6} />
        <path d="M15 -27 q-4 -8 -10 -7 M19 -28 q-1 -8 -7 -10" fill="none" {...line} strokeWidth={2.2} />
        <ellipse cx={17} cy={-23} rx={6.5} ry={5.5} fill={fill ?? C.sand} {...line} strokeWidth={2.4} />
        <path d="M20 -18 l1 5" {...line} strokeWidth={2} />
        {eye(19, -24)}
      </>
    );
  } else if (kind === 'ox') {
    const ry = thin ? 6 : 11;
    body = (
      <>
        <path d={`M-13 ${-21 + ry - 2} V0 M-6 ${-21 + ry} V0 M7 ${-21 + ry} V0 M14 ${-21 + ry - 2} V0 M-18 -22 q-5 3 -4 10`} fill="none" {...line} />
        <ellipse cx={0} cy={-21} rx={19} ry={ry} fill={fill ?? C.woodSoft} {...line} />
        {spot && <ellipse cx={-5} cy={-23} rx={6} ry={4} fill={C.black} />}
        {thin && <path d="M-6 -24 v6 M0 -25 v8 M6 -24 v6" {...line} strokeWidth={1.6} opacity={0.6} />}
        <path d="M17 -31 q-4 -7 2 -10 M27 -31 q4 -7 -2 -10" fill="none" {...line} strokeWidth={2.4} />
        <ellipse cx={22} cy={-25} rx={8} ry={7.5} fill={fill ?? C.woodSoft} {...line} strokeWidth={2.6} />
        {eye(24, -27)}
      </>
    );
  } else {
    const horse = kind === 'horse';
    const f = fill ?? (horse ? C.mane : C.steelSoft);
    const top = horse ? -26 : -20;
    body = (
      <>
        <path d={`M-12 ${top + 7} V0 M-6 ${top + 9} V0 M7 ${top + 9} V0 M13 ${top + 7} V0 M-16 ${top - 2} q-7 3 -5 13`} fill="none" {...line} />
        <ellipse cx={0} cy={top} rx={17} ry={9.5} fill={f} {...line} />
        <path d={`M10 ${top - 5} L21 ${top - 21} L30 ${top - 14} L18 ${top + 3} Z`} fill={f} {...line} strokeWidth={2.6} />
        <path d={horse ? `M22 ${top - 25} l1 -7 l4 6` : `M21 ${top - 24} l-2 -11 l6 8 M27 ${top - 24} l2 -11 l3 9`} fill={f} {...line} strokeWidth={2.2} />
        <ellipse cx={27} cy={top - 18} rx={8.5} ry={5.2} fill={f} {...line} strokeWidth={2.6} transform={`rotate(24 27 ${top - 18})`} />
        {horse && <path d={`M12 ${top - 8} L20 ${top - 20}`} {...line} stroke={C.black} strokeWidth={4} />}
        {eye(27, top - 20)}
      </>
    );
  }
  return <g transform={tf(at)}>{body}</g>;
}

/** A camel with a saddle; feet at (x, y), about 76 tall at s=1, facing right. */
export function Camel({ children, ...at }: At & { children?: ReactNode }) {
  return (
    <g transform={`${tf(at)} translate(-72 -104)`}>
      <path d="M42 64 q8 -26 24 -6 q12 -24 28 -2 q10 14 0 22 H46 q-10 -2 -4 -14 Z" fill={C.bread} {...line} />
      <path d="M52 76 V104 M64 78 V104 M82 78 V104 M92 76 V104" {...line} strokeWidth={5} stroke={C.mane} />
      <path d="M94 64 q16 -4 20 -28 q2 -8 10 -8 q10 0 12 8 q0 6 -8 6 q-6 14 -20 30" fill={C.bread} {...line} />
      <circle cx={128} cy={32} r={2.2} fill={INK} />
      <path d="M58 52 q10 -12 22 0 v8 h-22 Z" fill={C.red} {...line} strokeWidth={2.2} />
      <path d="M60 60 h18" stroke={C.steel} strokeWidth={4} strokeLinecap="round" />
      <path d="M40 66 q-10 2 -10 14" fill="none" {...line} strokeWidth={2.4} />
      {children}
    </g>
  );
}

/** A small bird in flight. */
export function Bird({ fill = C.white, leaf, ...at }: At & { fill?: string; leaf?: boolean }) {
  return (
    <g transform={tf(at)}>
      <path d="M-11 2 l-11 -5 l3 7 l-3 6 l13 -3 Z" fill={fill} {...line} strokeWidth={2.2} />
      <ellipse cx={0} cy={0} rx={13} ry={8} fill={fill} {...line} strokeWidth={2.4} />
      <path d="M-5 -4 q-8 -17 6 -19 q5 8 4 17 Z" fill={fill} {...line} strokeWidth={2.2} />
      <circle cx={12} cy={-6} r={6.5} fill={fill} {...line} strokeWidth={2.4} />
      <circle cx={14} cy={-7} r={1.5} fill={fill === C.black ? C.white : INK} />
      <path d="M18 -6 l6 2 l-6 2 Z" fill={C.bread} {...line} strokeWidth={1.6} />
      {leaf && <path d="M23 -3 q9 -3 11 5 q-9 3 -11 -5 Z" fill={C.pale} {...line} strokeWidth={1.8} />}
    </g>
  );
}

export function Oak(at: At) {
  return (
    <g transform={tf(at)}>
      <path d="M-7 0 L-5 -34 L5 -34 L7 0 Z" fill={C.wood} {...line} />
      {[[-18, -44, 15], [16, -44, 16], [0, -60, 18], [-2, -42, 13]].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={C.pale} {...line} />
      ))}
      <circle cx={0} cy={-48} r={17} fill={C.pale} />
      <path d="M-14 -50 q5 -4 9 1 M6 -62 q5 -4 9 1" fill="none" {...line} strokeWidth={2} opacity={0.5} />
    </g>
  );
}

export function Palm(at: At) {
  return (
    <g transform={tf(at)}>
      <path d="M-2 0 q-4 -30 2 -56" fill="none" {...line} strokeWidth={8} />
      <path d="M-2 0 q-4 -30 2 -56" fill="none" stroke={C.wood} strokeWidth={5} strokeLinecap="round" />
      <path d="M0 -56 q-18 -10 -26 2 M0 -56 q16 -12 24 0 M0 -56 q-6 -18 -18 -16 M0 -56 q8 -18 18 -14" fill="none" {...line} strokeWidth={7} />
      <path d="M0 -56 q-18 -10 -26 2 M0 -56 q16 -12 24 0 M0 -56 q-6 -18 -18 -16 M0 -56 q8 -18 18 -14" fill="none" stroke={C.paleDeep} strokeWidth={4} strokeLinecap="round" />
    </g>
  );
}

export function TentSm({ fill = C.woodSoft, ...at }: At & { fill?: string }) {
  return (
    <g transform={tf(at)}>
      <path d="M-30 0 L0 -50 L30 0 Z" fill={fill} {...line} />
      <path d="M0 -50 L-12 0 M0 -50 L12 0" {...line} strokeWidth={2} opacity={0.5} />
      <path d="M0 -50 L-5 0 H5 Z" fill={C.night} {...line} strokeWidth={2.2} />
      <path d="M0 -50 V-60 L10 -56 L0 -52" fill={C.red} {...line} strokeWidth={2} />
    </g>
  );
}

/** An altar of stones, optionally with fire and smoke. */
export function AltarSm({ fire = true, ...at }: At & { fire?: boolean }) {
  return (
    <g transform={tf(at)}>
      {fire && <path d="M-5 -52 q-6 -8 0 -14 M7 -50 q-6 -8 0 -12" fill="none" {...line} strokeWidth={2.4} opacity={0.4} />}
      {fire && <path d="M-11 -25 q-4 -14 6 -22 q0 8 5 9 q1 -9 7 -12 q-1 10 4 25 Z" fill={C.red} {...line} strokeWidth={2.6} />}
      {fire && <path d="M-4 -26 q-1 -7 3 -10 q1 5 4 5 q1 -3 3 -5 q0 6 1 10 Z" fill={C.bread} />}
      <path d="M-14 -25 H14" stroke={C.wood} strokeWidth={5} strokeLinecap="round" />
      {[[-17, -22, 17], [0, -22, 17], [-19, -11, 13], [-6, -11, 12], [6, -11, 13]].map(([rx, ry, w], i) => (
        <rect key={i} x={rx} y={ry} width={w} height={11} rx={4} fill={C.steelSoft} {...line} strokeWidth={2.4} />
      ))}
    </g>
  );
}

/** A low stone well. */
export function WellSm(at: At) {
  return (
    <g transform={tf(at)}>
      <rect x={-20} y={-18} width={40} height={18} rx={4} fill={C.steelSoft} {...line} />
      <path d="M-20 -9 H20 M-8 -18 V-9 M8 -18 V-9 M0 -9 V0 M-13 -9 V0 M13 -9 V0" {...line} strokeWidth={1.8} opacity={0.5} />
      <ellipse cx={0} cy={-18} rx={20} ry={5} fill={C.water} {...line} strokeWidth={2.6} />
    </g>
  );
}

/** God's light / the sun: a plain bright disc with rays (never a face). */
export function Light({ x, y, r = 12 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <g stroke={C.bread} strokeWidth={3} strokeLinecap="round">
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          return <path key={i} d={`M${x + Math.cos(a) * (r + 5)} ${y + Math.sin(a) * (r + 5)} L${x + Math.cos(a) * (r + 10)} ${y + Math.sin(a) * (r + 10)}`} />;
        })}
      </g>
      <circle cx={x} cy={y} r={r} fill={C.bread} {...line} />
    </g>
  );
}

export const Night = () => <rect x={6} y={6} width={148} height={108} rx={20} fill={C.night} />;
/** Grass/earth strip for night scenes (the ink ground line would not show on the dark sky). */
export const Earth = ({ y = 100, fill = C.paleDeep }: { y?: number; fill?: string }) => (
  <path d={`M6 ${y} H154 V100 Q154 114 140 114 H20 Q6 114 6 100 Z`} fill={fill} />
);

export function StarPt({ x, y, r = 5, fill = C.bread }: { x: number; y: number; r?: number; fill?: string }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    return `${x + Math.cos(a) * rr},${y + Math.sin(a) * rr}`;
  }).join(' ');
  return <polygon points={pts} fill={fill} {...line} strokeWidth={1.4} />;
}

/** A sack of grain, tied (or open). */
export function Sack({ open, ...at }: At & { open?: boolean }) {
  return (
    <g transform={tf(at)}>
      <path d={open ? 'M-13 0 q-3 -24 3 -30 h20 q6 6 3 30 Z' : 'M-13 0 q-2 -23 5 -26 l-2 -5 h20 l-2 5 q7 3 5 26 Z'} fill={C.woodSoft} {...line} strokeWidth={2.6} />
      {!open && <path d="M-7 -27 q7 3 14 0" fill="none" {...line} stroke={C.red} strokeWidth={3} />}
      {open && <ellipse cx={0} cy={-30} rx={10} ry={3.5} fill={C.bread} {...line} strokeWidth={2.2} />}
    </g>
  );
}

export function Coins({ n = 3, ...at }: At & { n?: number }) {
  const spots = [[0, 0], [9, 1], [4, -5], [-7, -3], [12, -6]].slice(0, n);
  return (
    <g transform={tf(at)}>
      {spots.map(([cx, cy], i) => (
        <ellipse key={i} cx={cx} cy={cy - 3} rx={5.5} ry={3} fill={C.steelSoft} {...line} strokeWidth={1.8} />
      ))}
    </g>
  );
}

/** A sheaf of wheat standing at (x, y). */
export function Sheaf({ tilt = 0, ...at }: At & { tilt?: number }) {
  return (
    <g transform={`${tf(at)} rotate(${tilt})`}>
      <path d="M-7 0 L-3 -26 M0 0 V-28 M7 0 L3 -26" fill="none" {...line} strokeWidth={5.5} />
      <path d="M-7 0 L-3 -26 M0 0 V-28 M7 0 L3 -26" fill="none" stroke={C.bread} strokeWidth={3} strokeLinecap="round" />
      <ellipse cx={0} cy={-30} rx={6.5} ry={10} fill={C.bread} {...line} strokeWidth={2.4} />
      <path d="M-6 -12 H6" stroke={C.red} strokeWidth={3} strokeLinecap="round" />
    </g>
  );
}

/** A short sword; the grip is at (x, y) and the blade points up before `r` degrees of turn. */
export function SwordSm({ x, y, r = 0, s = 1 }: { x: number; y: number; r?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <path d="M-3 -5 V-28 L0 -35 L3 -28 V-5 Z" fill={C.steelSoft} {...line} strokeWidth={2} />
      <path d="M-7 -5 H7" {...line} strokeWidth={3.4} />
      <path d="M0 -3 V3" {...line} stroke={C.wood} strokeWidth={3.4} />
    </g>
  );
}

/** A staff or spear from (x, y1) down to (x, y2); `tip` adds a spear head. */
export function Stick({ x, y1, y2, tip, crook }: { x: number; y1: number; y2: number; tip?: boolean; crook?: boolean }) {
  return (
    <g>
      <path d={`M${x} ${y1} V${y2}`} {...line} strokeWidth={4.6} />
      <path d={`M${x} ${y1} V${y2}`} stroke={C.wood} strokeWidth={2.4} strokeLinecap="round" />
      {crook && <path d={`M${x} ${y1} q0 -8 7 -7 q5 2 2 7`} fill="none" {...line} strokeWidth={2.6} />}
      {tip && <path d={`M${x - 3.5} ${y1} L${x} ${y1 - 9} L${x + 3.5} ${y1} Z`} fill={C.steelSoft} {...line} strokeWidth={1.8} />}
    </g>
  );
}

/** A thought bubble for dreams. */
export function Bubble({ x, y, w, h, fill = C.white, tail, children }: { x: number; y: number; w: number; h: number; fill?: string; tail?: [number, number]; children?: ReactNode }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={14} fill={fill} {...line} strokeWidth={2.6} />
      {tail && (
        <>
          <circle cx={x + w / 2 + (tail[0] - x - w / 2) * 0.35} cy={y + h + (tail[1] - y - h) * 0.35} r={3.6} fill={fill} {...line} strokeWidth={2} />
          <circle cx={x + w / 2 + (tail[0] - x - w / 2) * 0.75} cy={y + h + (tail[1] - y - h) * 0.75} r={2.4} fill={fill} {...line} strokeWidth={2} />
        </>
      )}
      {children}
    </g>
  );
}

/** Soft rolling hills behind a scene. */
export const Hills = ({ y = 104, fill = C.pale }: { y?: number; fill?: string }) => (
  <path d={`M8 ${y} Q30 ${y - 26} 58 ${y - 12} Q84 ${y - 34} 112 ${y - 14} Q134 ${y - 28} 152 ${y - 10} V${y} Z`} fill={fill} opacity={0.55} />
);

/** Mud-brick town in the distance. */
export function Town(at: At) {
  return (
    <g transform={tf(at)}>
      <path d="M-24 0 V-16 H-12 V-26 H2 V-18 H12 V-30 H24 V0 Z" fill={C.sand} {...line} strokeWidth={2.4} />
      <path d="M-18 -8 v4 M-6 -18 v4 M6 -10 v4 M18 -22 v4 M18 -10 v4" {...line} strokeWidth={2.4} />
    </g>
  );
}

/** A small harp, standing on (x, y). */
export function HarpSm(at: At) {
  const frame = 'M0 0 V-28 Q8 -33 16 -20 L4 0 Z';
  return (
    <g transform={tf(at)}>
      <path d="M4 -29.5 V0 M8 -29 V-6.7 M12 -26.5 V-13.3" {...line} strokeWidth={1.2} />
      <path d={frame} fill="none" {...line} strokeWidth={6} />
      <path d={frame} fill="none" stroke={C.wood} strokeWidth={3} strokeLinejoin="round" />
    </g>
  );
}

/** A ram's horn (of oil, or blown as a trumpet), its mouthpiece at (x, y), turned `r` degrees. */
export function Horn({ x, y, r = 0, s = 1 }: { x: number; y: number; r?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <path d="M-3 2 Q2 -10 16 -12 L18 -5 Q8 -4 4 5 Z" fill={C.bread} {...line} strokeWidth={2} />
    </g>
  );
}

/** A big cart wheel. */
export const Wheel = ({ x, y, r = 12 }: { x: number; y: number; r?: number }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill={C.woodSoft} {...line} />
    <path d={`M${x - r} ${y} H${x + r} M${x} ${y - r} V${y + r}`} {...line} strokeWidth={2} />
    <circle cx={x} cy={y} r={3} fill={C.wood} {...line} strokeWidth={2} />
  </g>
);

/** A long table seen from the front, top edge at y, legs to the ground at 104. */
export const Table = ({ x1, x2, y, fill = C.woodSoft }: { x1: number; x2: number; y: number; fill?: string }) => (
  <g>
    <path d={`M${x1 + 6} ${y + 6} V104 M${x2 - 6} ${y + 6} V104`} {...line} strokeWidth={4} />
    <rect x={x1} y={y} width={x2 - x1} height={9} rx={3} fill={fill} {...line} />
  </g>
);

/** Joseph's coat of many colours, laid flat and centred at (x, y); `blood` stains it. */
export function CoatSm({ blood, ...at }: At & { blood?: boolean }) {
  const d = 'M-6 -14 L-16 -9 L-13 -2 L-8 -5 V12 H8 V-5 L13 -2 L16 -9 L6 -14 Q0 -10 -6 -14 Z';
  return (
    <g transform={tf(at)}>
      <path d={d} fill={C.red} />
      <path d="M-8 -3 H8 V2 H-8 Z" fill={C.steel} />
      <path d="M-8 6 H8 V10 H-8 Z" fill={C.bread} />
      <path d={d} fill="none" {...line} strokeWidth={2.4} />
      {blood && <path d="M-5 3 q2 5 5 1 q3 3 4 -2 q-3 -4 -9 1 Z M4 -9 q3 3 5 -1 q-2 -3 -5 1 Z" fill="#9b2c25" />}
    </g>
  );
}

/** A silver cup standing at (x, y). */
export const CupSm = (at: At) => (
  <g transform={tf(at)}>
    <path d="M-6 -14 H6 Q6 -6 0 -5 Q-6 -6 -6 -14 Z M0 -5 V-1 M-4 0 H4" fill={C.steelSoft} {...line} strokeWidth={2} />
  </g>
);

/** A throne: a high-backed seat whose front edge is at (x, y) on the ground; the person sits at x. */
export const Throne = (at: At) => (
  <g transform={tf(at)}>
    <rect x={-18} y={-50} width={8} height={50} rx={3} fill={C.red} {...line} strokeWidth={2.6} />
    <rect x={-16} y={-16} width={24} height={16} rx={3} fill={C.wood} {...line} strokeWidth={2.6} />
  </g>
);
