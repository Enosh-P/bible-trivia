import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Flag } from 'lucide-react';
import { sendReport, type ReportCategory, type ReportTarget } from '../online/reports';
import { useApp, useT } from '../store';
import { spring } from '../motion/springs';
import { Pressable } from './Pressable';
import { Sheet } from './Sheet';
import { STROKE } from './icons';

const CATEGORIES: ReportCategory[] = ['wrong_answer', 'typo', 'tamil', 'confusing', 'other'];

/** Small flag button. Opens a sheet to report a problem with this item. */
export function ReportButton({ target, compact }: { target: ReportTarget; compact?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        className={`report-btn ${compact ? 'is-compact' : 'glass'}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={t.report}
        title={t.report}
      >
        <Flag size={compact ? 14 : 16} strokeWidth={STROKE} />
      </Pressable>
      <ReportSheet target={target} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function ReportSheet({ target, open, onClose }: { target: ReportTarget; open: boolean; onClose: () => void }) {
  const t = useT();
  const lang = useApp((s) => s.uiLang);
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [reason, setReason] = useState('');
  const [contact, setContact] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [result, setResult] = useState<'sent' | 'queued' | 'email'>('sent');

  function close() {
    onClose();
    // Reset after the sheet has slid away.
    setTimeout(() => {
      setCategory(null);
      setReason('');
      setState('idle');
    }, 400);
  }

  async function submit() {
    if (!category) return;
    setState('sending');
    const r = await sendReport({ ...target, category, lang, reason: reason.trim() || undefined, contact: contact.trim() || undefined }).catch(
      () => 'queued' as const,
    );
    setResult(r);
    setState('done');
  }

  return (
    <Sheet open={open} onClose={close} label={t.report}>
      <AnimatePresence mode="wait" initial={false}>
        {state !== 'done' ? (
          <motion.div key="form" className="report-form" exit={{ opacity: 0, scale: 0.97 }} transition={spring.snappy}>
            <h2 className="title">{t.reportTitle}</h2>
            <p className="caption">{t.reportIntro}</p>
            <div className="report-cats" role="radiogroup">
              {CATEGORIES.map((c) => (
                <button key={c} role="radio" aria-checked={category === c} className={`report-cat ${category === c ? 'is-on' : ''}`} onClick={() => setCategory(c)}>
                  {t.reportCategory[c]}
                </button>
              ))}
            </div>
            <textarea
              className="report-input"
              rows={3}
              maxLength={1000}
              placeholder={t.reportDetails}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <input
              className="report-input"
              type="text"
              maxLength={200}
              placeholder={t.reportContact}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
            <Pressable className="btn btn-primary" disabled={!category || state === 'sending'} onClick={submit}>
              <Flag size={18} strokeWidth={STROKE} /> {t.reportSend}
            </Pressable>
          </motion.div>
        ) : (
          <motion.div key="done" className="report-done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={spring.flick}>
            <span className="icon-tile horse-pale report-done-icon">
              <Check size={26} strokeWidth={STROKE} />
            </span>
            <h2 className="title">{t.reportThanks}</h2>
            <p className="caption">{result === 'queued' ? t.reportQueued : result === 'email' ? t.reportEmail : t.reportSent}</p>
            <Pressable className="btn glass" onClick={close}>
              {t.close}
            </Pressable>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}
