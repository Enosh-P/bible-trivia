import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Star } from 'lucide-react';
import { db } from '../storage/db';
import { useT } from '../store';
import { spring } from '../motion/springs';
import { STROKE } from './icons';
import { cue } from '../feedback';

/** ☆ Keep this question for the Practice tab. */
export function SaveButton({ id }: { id: string }) {
  const t = useT();
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let alive = true;
    db.saved
      .get(id)
      .then((r) => alive && setSaved(Boolean(r)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id]);
  async function toggle() {
    const next = !saved;
    setSaved(next);
    cue('tap');
    try {
      if (next) await db.saved.put({ id, at: Date.now() });
      else await db.saved.delete(id);
    } catch {
      setSaved(!next);
    }
  }
  return (
    <button className={`report-btn save-btn ${saved ? 'is-on' : ''}`} onClick={toggle} aria-pressed={saved} aria-label={saved ? t.unsaveQuestion : t.saveQuestion} title={saved ? t.unsaveQuestion : t.saveQuestion}>
      <motion.span key={String(saved)} initial={{ scale: saved ? 0.4 : 1 }} animate={{ scale: 1 }} transition={spring.flick} style={{ display: 'inline-flex' }}>
        <Star size={16} strokeWidth={STROKE} fill={saved ? 'currentColor' : 'none'} />
      </motion.span>
    </button>
  );
}
