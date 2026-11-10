import type { Transition } from 'motion/react';

/*
 * Spring presets (Apple "Designing Fluid Interfaces" values, mapped to Motion).
 * Motion's `bounce` ≈ 1 − damping ratio, and `duration` ≈ response.
 *
 * Default: critically damped, no overshoot.
 * Bounce only when the user's gesture carried momentum (a flick or throw).
 */
export const spring = {
  /** Default for anything moving or repositioning. */
  calm: { type: 'spring', bounce: 0, duration: 0.4 },
  /** Quick UI responses: press states, small toggles. */
  snappy: { type: 'spring', bounce: 0, duration: 0.28 },
  /** Sheets and drawers. */
  sheet: { type: 'spring', bounce: 0.15, duration: 0.32 },
  /** After a flick or throw: a little overshoot, because the gesture had momentum. */
  flick: { type: 'spring', bounce: 0.2, duration: 0.4 },
} satisfies Record<string, Transition>;

/**
 * Where a flick would come to rest, like scroll deceleration.
 * Apple's projection function: pick the snap target nearest to this point.
 */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Progressive resistance past a boundary instead of a hard stop. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
