import { motion, useReducedMotion } from 'motion/react';
import { Illustration } from '../art/Illustrations';
import type { ArtKey } from '../engine/types';
import { spring } from '../motion/springs';

/** Cartoon illustration on a sticker card. Pops in, and wiggles when tapped. */
export function ArtSticker({ name }: { name: ArtKey }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="art-sticker"
      key={name}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85, rotate: -4 }}
      animate={{ opacity: 1, scale: 1, rotate: -1.5 }}
      transition={spring.flick}
      whileTap={reduce ? undefined : { rotate: [-1.5, 3, -3, 1.5, -1.5], scale: 1.03 }}
    >
      <Illustration name={name} />
    </motion.div>
  );
}
