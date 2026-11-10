import { AnimatePresence, animate, motion, useMotionValue, useTransform, type PanInfo } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { project, spring } from '../motion/springs';

/**
 * Bottom sheet that follows the finger 1:1, can be grabbed mid-animation,
 * and decides close vs. stay from where the flick is *heading* (momentum
 * projection), not just where the finger let go.
 */
export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  const y = useMotionValue(0);
  const scrim = useTransform(y, [0, 400], [1, 0]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  function onDragEnd(_: unknown, info: PanInfo) {
    const projected = y.get() + project(info.velocity.y);
    if (projected > 160) onClose();
    else animate(y, 0, { ...spring.sheet, velocity: info.velocity.y });
  }

  // Rendered at the top of the page: a moving parent (screen transitions use
  // transforms) would otherwise carry the fixed-position sheet along with it.
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="sheet-root" role="dialog" aria-modal="true" aria-label={label}>
          <motion.div
            className="sheet-scrim"
            style={{ opacity: scrim }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="sheet glass glass-thick"
            style={{ y }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={spring.sheet}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.08, bottom: 1 }}
            onDragEnd={onDragEnd}
          >
            <div className="sheet-grabber" />
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
