import type { ReactElement } from 'react';

/*
 * Cartoon avatars: 20 friendly animals from the Bible, same style as the
 * game pictures (flat colours, chunky ink outline, no gradients).
 * viewBox 0 0 64 64, drawn on a coloured circle.
 */

const INK = '#1d2430';
const line = { stroke: INK, strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const Eyes = ({ y = 33, gap = 10, cx = 32, r = 2.4 }: { y?: number; gap?: number; cx?: number; r?: number }) => (
  <g>
    <circle cx={cx - gap / 2} cy={y} r={r} fill={INK} />
    <circle cx={cx + gap / 2} cy={y} r={r} fill={INK} />
    <circle cx={cx - gap / 2 + 0.8} cy={y - 0.8} r={0.8} fill="#fff" />
    <circle cx={cx + gap / 2 + 0.8} cy={y - 0.8} r={0.8} fill="#fff" />
  </g>
);
const Cheeks = ({ y = 38, gap = 18, cx = 32 }: { y?: number; gap?: number; cx?: number }) => (
  <g fill="#f08a6e" opacity={0.65}>
    <ellipse cx={cx - gap / 2} cy={y} rx={3} ry={1.8} />
    <ellipse cx={cx + gap / 2} cy={y} rx={3} ry={1.8} />
  </g>
);
const Smile = ({ y = 40, w = 6, cx = 32 }: { y?: number; w?: number; cx?: number }) => (
  <path d={`M${cx - w / 2} ${y} q${w / 2} ${w * 0.55} ${w} 0`} fill="none" {...line} strokeWidth={2} />
);
const Beak = ({ y = 37, color = '#f5a524' }: { y?: number; color?: string }) => <path d={`M28 ${y} L36 ${y} L32 ${y + 6} Z`} fill={color} {...line} strokeWidth={1.8} />;

/** id → [background, drawing]. Ids are stored on the profile. */
export const AVATARS: Record<string, { bg: string; name: { en: string; ta: string }; art: () => ReactElement }> = {
  lamb: {
    bg: '#c4e8f2',
    name: { en: 'Lamb', ta: 'ஆட்டுக்குட்டி' },
    art: () => (
      <>
        <ellipse cx={14} cy={30} rx={7} ry={4} fill="#fff" {...line} transform="rotate(-20 14 30)" />
        <ellipse cx={50} cy={30} rx={7} ry={4} fill="#fff" {...line} transform="rotate(20 50 30)" />
        <ellipse cx={32} cy={36} rx={15} ry={16} fill="#fff" {...line} />
        <path d="M20 24 q4 -8 8 -2 q4 -7 8 0 q4 -6 8 2" fill="#fff" {...line} />
        <Eyes y={34} />
        <Cheeks y={40} />
        <Smile y={42} />
      </>
    ),
  },
  lion: {
    bg: '#fde3b8',
    name: { en: 'Lion', ta: 'சிங்கம்' },
    art: () => (
      <>
        <circle cx={32} cy={34} r={22} fill="#c47a2c" {...line} />
        <circle cx={32} cy={35} r={14} fill="#f5b041" {...line} />
        <circle cx={22} cy={22} r={4} fill="#f5b041" {...line} />
        <circle cx={42} cy={22} r={4} fill="#f5b041" {...line} />
        <Eyes y={33} />
        <ellipse cx={32} cy={39} rx={3} ry={2} fill={INK} />
        <Smile y={42} w={7} />
      </>
    ),
  },
  dove: {
    bg: '#dbe7f5',
    name: { en: 'Dove', ta: 'புறா' },
    art: () => (
      <>
        <path d="M10 40 q6 -14 18 -8" fill="#fff" {...line} />
        <path d="M54 40 q-6 -14 -18 -8" fill="#fff" {...line} />
        <circle cx={32} cy={34} r={14} fill="#fff" {...line} />
        <Eyes y={32} gap={9} />
        <Beak y={36} color="#f08a6e" />
        <path d="M44 22 q4 -4 8 -2 q-2 4 -6 4" fill="#7cc576" {...line} strokeWidth={1.6} />
      </>
    ),
  },
  fish: {
    bg: '#b9dff0',
    name: { en: 'Fish', ta: 'மீன்' },
    art: () => (
      <>
        <path d="M44 32 L56 22 L56 42 Z" fill="#2a9fc0" {...line} />
        <ellipse cx={30} cy={32} rx={18} ry={13} fill="#5cc6e2" {...line} />
        <path d="M30 22 q4 10 0 20" fill="none" {...line} strokeWidth={1.6} opacity={0.5} />
        <Eyes y={30} gap={0} cx={20} r={2.6} />
        <path d="M14 36 q3 2 6 0" fill="none" {...line} strokeWidth={1.8} />
      </>
    ),
  },
  camel: {
    bg: '#f3dfb8',
    name: { en: 'Camel', ta: 'ஒட்டகம்' },
    art: () => (
      <>
        <ellipse cx={22} cy={20} rx={3} ry={5} fill="#c49b78" {...line} />
        <ellipse cx={42} cy={20} rx={3} ry={5} fill="#c49b78" {...line} />
        <ellipse cx={32} cy={32} rx={14} ry={15} fill="#d9b38c" {...line} />
        <ellipse cx={32} cy={42} rx={9} ry={7} fill="#e8c9a6" {...line} />
        <Eyes y={30} />
        <circle cx={29} cy={41} r={1.2} fill={INK} />
        <circle cx={35} cy={41} r={1.2} fill={INK} />
        <path d="M24 26 h5 M35 26 h5" {...line} strokeWidth={1.6} />
      </>
    ),
  },
  donkey: {
    bg: '#e3e7eb',
    name: { en: 'Donkey', ta: 'கழுதை' },
    art: () => (
      <>
        <ellipse cx={22} cy={14} rx={4} ry={11} fill="#9aa5b1" {...line} transform="rotate(-12 22 14)" />
        <ellipse cx={42} cy={14} rx={4} ry={11} fill="#9aa5b1" {...line} transform="rotate(12 42 14)" />
        <ellipse cx={32} cy={34} rx={14} ry={16} fill="#9aa5b1" {...line} />
        <ellipse cx={32} cy={44} rx={9} ry={6} fill="#dfe4e9" {...line} />
        <Eyes y={31} />
        <circle cx={29} cy={44} r={1.2} fill={INK} />
        <circle cx={35} cy={44} r={1.2} fill={INK} />
      </>
    ),
  },
  ram: {
    bg: '#e8dcc8',
    name: { en: 'Ram', ta: 'ஆட்டுக்கடா' },
    art: () => (
      <>
        <path d="M18 22 a8 8 0 1 0 2 14" fill="#c49b78" {...line} />
        <path d="M46 22 a8 8 0 1 1 -2 14" fill="#c49b78" {...line} />
        <ellipse cx={32} cy={36} rx={12} ry={15} fill="#fff" {...line} />
        <path d="M22 26 q5 -7 10 -2 q5 -5 10 2" fill="#fff" {...line} />
        <Eyes y={35} gap={9} />
        <Smile y={43} w={5} />
      </>
    ),
  },
  eagle: {
    bg: '#c9d9e8',
    name: { en: 'Eagle', ta: 'கழுகு' },
    art: () => (
      <>
        <path d="M14 44 q2 -18 18 -22 q16 4 18 22 Z" fill="#8b5a3c" {...line} />
        <circle cx={32} cy={28} r={12} fill="#fff" {...line} />
        <Eyes y={27} gap={9} />
        <path d="M28 31 L38 31 Q36 38 30 37 Z" fill="#f5a524" {...line} strokeWidth={1.8} />
      </>
    ),
  },
  bear: {
    bg: '#ead8c6',
    name: { en: 'Bear', ta: 'கரடி' },
    art: () => (
      <>
        <circle cx={18} cy={20} r={6} fill="#8b5a3c" {...line} />
        <circle cx={46} cy={20} r={6} fill="#8b5a3c" {...line} />
        <circle cx={32} cy={34} r={16} fill="#8b5a3c" {...line} />
        <ellipse cx={32} cy={40} rx={7} ry={5.5} fill="#d9b38c" {...line} />
        <Eyes y={31} />
        <ellipse cx={32} cy={38} rx={2.5} ry={1.8} fill={INK} />
        <Smile y={42} w={5} />
      </>
    ),
  },
  ox: {
    bg: '#f0d9c4',
    name: { en: 'Ox', ta: 'எருது' },
    art: () => (
      <>
        <path d="M18 22 q-8 -4 -6 -12 q6 6 10 8" fill="#f3dfb8" {...line} />
        <path d="M46 22 q8 -4 6 -12 q-6 6 -10 8" fill="#f3dfb8" {...line} />
        <ellipse cx={32} cy={34} rx={15} ry={15} fill="#a5683f" {...line} />
        <ellipse cx={32} cy={42} rx={10} ry={6.5} fill="#f0b8a0" {...line} />
        <Eyes y={31} />
        <circle cx={28.5} cy={42} r={1.4} fill={INK} />
        <circle cx={35.5} cy={42} r={1.4} fill={INK} />
      </>
    ),
  },
  raven: {
    bg: '#cfd6e0',
    name: { en: 'Raven', ta: 'காகம்' },
    art: () => (
      <>
        <circle cx={32} cy={34} r={15} fill="#2a2f38" {...line} />
        <path d="M26 20 q6 -6 10 0" fill="#2a2f38" {...line} />
        <circle cx={27} cy={32} r={3} fill="#fff" />
        <circle cx={37} cy={32} r={3} fill="#fff" />
        <circle cx={27.5} cy={32.5} r={1.6} fill={INK} />
        <circle cx={37.5} cy={32.5} r={1.6} fill={INK} />
        <Beak y={36} color="#6b7480" />
      </>
    ),
  },
  horse: {
    bg: '#f6d5c8',
    name: { en: 'Horse', ta: 'குதிரை' },
    art: () => (
      <>
        <path d="M22 18 L24 8 L28 16 Z" fill="#a5683f" {...line} />
        <path d="M42 18 L40 8 L36 16 Z" fill="#a5683f" {...line} />
        <ellipse cx={32} cy={34} rx={13} ry={17} fill="#a5683f" {...line} />
        <path d="M28 14 q4 -4 8 0 l-2 10 h-4 Z" fill="#4a2f22" {...line} strokeWidth={1.8} />
        <ellipse cx={32} cy={45} rx={8} ry={5.5} fill="#d9b38c" {...line} />
        <Eyes y={31} />
        <circle cx={29} cy={45} r={1.2} fill={INK} />
        <circle cx={35} cy={45} r={1.2} fill={INK} />
      </>
    ),
  },
  frog: {
    bg: '#d6efd0',
    name: { en: 'Frog', ta: 'தவளை' },
    art: () => (
      <>
        <circle cx={22} cy={22} r={7} fill="#7cc576" {...line} />
        <circle cx={42} cy={22} r={7} fill="#7cc576" {...line} />
        <ellipse cx={32} cy={38} rx={18} ry={13} fill="#7cc576" {...line} />
        <circle cx={22} cy={22} r={3} fill={INK} />
        <circle cx={42} cy={22} r={3} fill={INK} />
        <circle cx={23} cy={21} r={1} fill="#fff" />
        <circle cx={43} cy={21} r={1} fill="#fff" />
        <Cheeks y={39} gap={22} />
        <path d="M22 40 q10 8 20 0" fill="none" {...line} strokeWidth={2} />
      </>
    ),
  },
  bee: {
    bg: '#fff1c2',
    name: { en: 'Bee', ta: 'தேனீ' },
    art: () => (
      <>
        <ellipse cx={18} cy={24} rx={7} ry={5} fill="#e9f5fb" {...line} transform="rotate(-30 18 24)" />
        <ellipse cx={46} cy={24} rx={7} ry={5} fill="#e9f5fb" {...line} transform="rotate(30 46 24)" />
        <circle cx={32} cy={36} r={15} fill="#f5c542" {...line} />
        <path d="M18 40 h28 M20 46 h24" stroke={INK} strokeWidth={4} strokeLinecap="round" />
        <path d="M27 21 l-3 -7 M37 21 l3 -7" {...line} />
        <Eyes y={32} />
      </>
    ),
  },
  sparrow: {
    bg: '#f3e2cf',
    name: { en: 'Sparrow', ta: 'அடைக்கலான்குருவி' },
    art: () => (
      <>
        <circle cx={32} cy={35} r={15} fill="#b07a4f" {...line} />
        <ellipse cx={32} cy={41} rx={9} ry={7} fill="#f3e2cf" {...line} />
        <path d="M26 20 q6 -5 12 0" fill="#7a4f33" {...line} />
        <Eyes y={32} gap={9} />
        <Beak y={35} color="#4a3a2a" />
      </>
    ),
  },
  goat: {
    bg: '#e6e0d4',
    name: { en: 'Goat', ta: 'வெள்ளாடு' },
    art: () => (
      <>
        <path d="M24 20 q-4 -8 -10 -8" fill="none" {...line} strokeWidth={3} />
        <path d="M40 20 q4 -8 10 -8" fill="none" {...line} strokeWidth={3} />
        <ellipse cx={14} cy={28} rx={6} ry={3} fill="#fff" {...line} />
        <ellipse cx={50} cy={28} rx={6} ry={3} fill="#fff" {...line} />
        <ellipse cx={32} cy={32} rx={12} ry={14} fill="#fff" {...line} />
        <path d="M28 44 L32 54 L36 44 Z" fill="#fff" {...line} />
        <Eyes y={30} gap={9} />
        <circle cx={30} cy={39} r={1.1} fill={INK} />
        <circle cx={34} cy={39} r={1.1} fill={INK} />
      </>
    ),
  },
  deer: {
    bg: '#e9dccb',
    name: { en: 'Deer', ta: 'மான்' },
    art: () => (
      <>
        <path d="M24 20 L18 8 M20 13 L13 11 M40 20 L46 8 M44 13 L51 11" {...line} strokeWidth={2.6} stroke="#7a4f33" />
        <ellipse cx={16} cy={26} rx={6} ry={3} fill="#c4885a" {...line} transform="rotate(-20 16 26)" />
        <ellipse cx={48} cy={26} rx={6} ry={3} fill="#c4885a" {...line} transform="rotate(20 48 26)" />
        <ellipse cx={32} cy={34} rx={12} ry={15} fill="#c4885a" {...line} />
        <Eyes y={31} gap={9} />
        <ellipse cx={32} cy={43} rx={2.6} ry={2} fill={INK} />
        <circle cx={26} cy={22} r={1.2} fill="#fff" />
        <circle cx={38} cy={24} r={1.2} fill="#fff" />
      </>
    ),
  },
  whale: {
    bg: '#c4dff5',
    name: { en: 'Whale', ta: 'திமிங்கிலம்' },
    art: () => (
      <>
        <path d="M32 18 q-3 -6 -6 -4 M32 18 q3 -6 6 -4 M32 18 v-6" fill="none" stroke="#2a9fc0" strokeWidth={2.4} strokeLinecap="round" />
        <path d="M10 38 q0 -16 22 -16 q22 0 22 16 q0 10 -22 10 q-22 0 -22 -10 Z" fill="#4a7fb5" {...line} />
        <path d="M14 42 q18 8 36 0" fill="#c9dcef" {...line} strokeWidth={1.8} />
        <Eyes y={34} gap={16} />
        <Smile y={39} w={6} />
      </>
    ),
  },
  owl: {
    bg: '#e4d9ee',
    name: { en: 'Owl', ta: 'ஆந்தை' },
    art: () => (
      <>
        <path d="M18 20 L22 10 L26 18 M46 20 L42 10 L38 18" fill="#8b6a4f" {...line} />
        <ellipse cx={32} cy={34} rx={15} ry={17} fill="#8b6a4f" {...line} />
        <circle cx={26} cy={30} r={6} fill="#fff" {...line} />
        <circle cx={38} cy={30} r={6} fill="#fff" {...line} />
        <circle cx={26} cy={30} r={2.6} fill={INK} />
        <circle cx={38} cy={30} r={2.6} fill={INK} />
        <path d="M30 36 L34 36 L32 40 Z" fill="#f5a524" {...line} strokeWidth={1.6} />
        <path d="M24 44 q2 2 4 0 q2 2 4 0 q2 2 4 0 q2 2 4 0" fill="none" {...line} strokeWidth={1.4} opacity={0.6} />
      </>
    ),
  },
  fox: {
    bg: '#fbd9c6',
    name: { en: 'Fox', ta: 'நரி' },
    art: () => (
      <>
        <path d="M18 26 L16 10 L28 20 Z" fill="#e8762c" {...line} />
        <path d="M46 26 L48 10 L36 20 Z" fill="#e8762c" {...line} />
        <path d="M14 26 q18 -12 36 0 q-4 18 -18 22 q-14 -4 -18 -22 Z" fill="#e8762c" {...line} />
        <path d="M22 36 q10 14 20 0 q-10 6 -20 0 Z" fill="#fff" {...line} strokeWidth={1.8} />
        <Eyes y={31} />
        <ellipse cx={32} cy={42} rx={2.2} ry={1.6} fill={INK} />
      </>
    ),
  },
};

export const AVATAR_IDS = Object.keys(AVATARS);
export const isCartoonAvatar = (id?: string | null): id is string => Boolean(id && AVATARS[id]);

export function CartoonAvatar({ id, size = 40 }: { id: string; size?: number }) {
  const a = AVATARS[id];
  if (!a) return null;
  const Art = a.art;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className="cartoon-avatar" aria-label={a.name.en} role="img">
      <circle cx={32} cy={32} r={31} fill={a.bg} />
      <Art />
    </svg>
  );
}
