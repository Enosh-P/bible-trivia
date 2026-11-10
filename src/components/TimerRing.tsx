import type { Horse } from '../engine/modes';

/** Circular countdown. `progress` goes 1 → 0. */
export function TimerRing({ progress, seconds, horse = 'white', size = 44 }: { progress: number; seconds: number; horse?: Horse; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const urgent = progress < 0.25;
  return (
    <div className="timer" style={{ width: size, height: size }} role="timer" aria-label={`${seconds}s`}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-strong)" strokeWidth={3} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={urgent ? 'var(--red)' : `var(--${horse}-ink)`}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke 300ms ease' }}
        />
      </svg>
      <span className={`timer-num ${urgent ? 'is-urgent' : ''}`}>{seconds}</span>
    </div>
  );
}
