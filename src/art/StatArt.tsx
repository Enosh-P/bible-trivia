/*
 * Small cartoon pictures for the Practice stats (same style as ModeArt:
 * chunky ink outline, flat colours, no gradients).
 */
const INK = '#1d2430';
const line = { stroke: INK, strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const Eye = ({ x, y }: { x: number; y: number }) => (
  <g>
    <circle cx={x} cy={y} r={2.6} fill={INK} />
    <circle cx={x + 0.9} cy={y - 0.9} r={0.9} fill="#fff" />
  </g>
);

/** Answered: a happy checklist. */
const Answered = () => (
  <>
    <rect x={14} y={8} width={36} height={48} rx={6} fill="#fff" {...line} />
    <rect x={24} y={4} width={16} height={8} rx={3} fill="#7fa6c9" {...line} />
    <path d="M20 22 l4 4 l7 -8 M20 36 l4 4 l7 -8" fill="none" stroke="#137c99" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M35 23 H44 M35 37 H44" {...line} strokeWidth={2.4} opacity={0.4} />
    <Eye x={27} y={48} />
    <Eye x={37} y={48} />
  </>
);

/** Accuracy: an arrow in the bullseye. */
const Accuracy = () => (
  <>
    <circle cx={30} cy={34} r={22} fill="#fff" {...line} />
    <circle cx={30} cy={34} r={14} fill="#e0493e" {...line} />
    <circle cx={30} cy={34} r={6} fill="#fff" {...line} />
    <path d="M30 34 L54 10" {...line} strokeWidth={3.2} />
    <path d="M48 8 L56 8 L56 16 Z" fill="#f5a524" {...line} strokeWidth={2.4} />
  </>
);

/** Books: a stack of three books. */
const Books = () => (
  <>
    <rect x={8} y={42} width={46} height={12} rx={3} fill="#2a9fc0" {...line} />
    <rect x={12} y={29} width={40} height={13} rx={3} fill="#e0493e" {...line} />
    <rect x={10} y={16} width={42} height={13} rx={3} fill="#7fa6c9" {...line} />
    <path d="M16 48 H46 M18 35 H44 M16 22 H44" {...line} strokeWidth={2} opacity={0.35} />
    <Eye x={25} y={36} />
    <Eye x={37} y={36} />
  </>
);

const ART = { answered: Answered, accuracy: Accuracy, books: Books } as const;

export function StatArt({ kind, size = 44 }: { kind: keyof typeof ART; size?: number }) {
  const Art = ART[kind];
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden className="stat-art">
      <Art />
    </svg>
  );
}
