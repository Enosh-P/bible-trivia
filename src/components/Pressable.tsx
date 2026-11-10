import { motion, type HTMLMotionProps } from 'motion/react';
import { forwardRef } from 'react';
import { spring } from '../motion/springs';
import { cue } from '../feedback';

/**
 * A button that responds on press-down (not release), with a springy scale.
 * The spring always animates from the current value, so rapid taps never jump.
 */
export const Pressable = forwardRef<HTMLButtonElement, HTMLMotionProps<'button'> & { silent?: boolean }>(
  function Pressable({ silent, onPointerDown, ...props }, ref) {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.965 }}
        transition={spring.snappy}
        onPointerDown={(e) => {
          if (!silent) cue('tap');
          onPointerDown?.(e);
        }}
        {...props}
      />
    );
  },
);
