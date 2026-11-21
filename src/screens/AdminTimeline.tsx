import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Check, ChevronLeft, ChevronRight, Save, Trash2, X } from 'lucide-react';
import { useApp, useT } from '../store';
import { spring } from '../motion/springs';
import { Pressable } from '../components/Pressable';
import { STROKE } from '../components/icons';
import { Sheet } from '../components/Sheet';
import { loadTimeline, refLabel, type Lang, type Timeline } from '../engine/timeline';
import { deleteSubmission, listSubmissions, loadApproved, reviewSubmission, withApproved, type Submission, type SubmissionStatus } from '../online/timeline';
import { TimelineForm, fromSubmission, submissionTitle, toSubmission, type Draft } from './TimelineSubmit';

/** Admin → Timeline suggestions: check, edit, approve or reject readers' entries. */
export function AdminTimeline({ onExit }: { onExit: () => void }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const lang: Lang = uiLang;
  const [tab, setTab] = useState<SubmissionStatus>('pending');
  const [list, setList] = useState<Submission[] | null>(null);
  const [error, setError] = useState(false);
  const [tl, setTl] = useState<Timeline | null>(null);
  const [editing, setEditing] = useState<Submission | null>(null);

  const load = () => {
    setList(null);
    listSubmissions(tab)
      .then(setList)
      .catch(() => setError(true));
  };
  useEffect(load, [tab]);
  useEffect(() => {
    // The timeline as readers see it (approved suggestions included), so corrections compare against the current details.
    void loadTimeline().then(async (base) => {
      const rows = await loadApproved(true);
      setTl(rows ? withApproved(base, rows) : base);
    });
  }, []);

  const kindLabel = { event: t.tlKindEvent, person: t.tlKindPerson, correction: t.tlKindCorrection };
  const tabs: [SubmissionStatus, string][] = [
    ['pending', t.tlPending],
    ['approved', t.tlApproved],
    ['rejected', t.tlRejected],
  ];

  return (
    <div className="screen recall" lang={uiLang}>
      <header className="recall-head">
        <Pressable className="chip glass" onClick={onExit} aria-label={t.back}>
          <ChevronLeft size={20} strokeWidth={STROKE} />
        </Pressable>
        <h1 className="title grow">{t.adminTimeline}</h1>
      </header>
      <div className="segmented small" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'is-on' : ''} onClick={() => setTab(id)}>
            {tab === id && <motion.span layoutId="seg-admin-tl" className="segmented-thumb" transition={spring.calm} />}
            <span>{label}</span>
          </button>
        ))}
      </div>
      {error && <p className="caption note">{t.offlineNotLoaded}</p>}
      {list && !list.length && <p className="caption">{t.tlNothing}</p>}
      <div className="tl-mine">
        {list?.map((s) => (
          <Pressable key={s.id} className="tl-mine-item glass tl-admin-item" onClick={() => setEditing(s)}>
            <div className="tl-mine-head">
              <span className="caption">{kindLabel[s.kind]}</span>
              <span className="caption">
                {s.added_by} · {new Date(s.created_at).toLocaleDateString(uiLang === 'ta' ? 'ta-IN' : undefined)}
              </span>
            </div>
            <strong>{submissionTitle(s, lang)}</strong>
            <span className="caption">{s.refs.map((r) => refLabel(r, lang)).join('; ')}</span>
            <span className="caption tl-admin-expl">{s.explanation}</span>
            <ChevronRight size={18} strokeWidth={STROKE} className="menu-chevron" />
          </Pressable>
        ))}
      </div>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} label={t.adminTimeline}>
        {editing && tl && (
          <Review
            key={editing.id}
            s={editing}
            tl={tl}
            lang={lang}
            onDone={() => {
              setEditing(null);
              load();
            }}
          />
        )}
      </Sheet>
    </div>
  );
}

function Review({ s, tl, lang, onDone }: { s: Submission; tl: Timeline; lang: Lang; onDone: () => void }) {
  const t = useT();
  const [draft, setDraft] = useState<Draft>(() => fromSubmission(s, tl));
  const [note, setNote] = useState(s.admin_note ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save(status?: SubmissionStatus) {
    setMsg(null);
    const out = toSubmission(draft, tl, t);
    // Rejecting doesn't need a complete entry; everything else does.
    if ('error' in out && status !== 'rejected') return setMsg(out.error);
    setBusy(true);
    try {
      await reviewSubmission(s.id, {
        ...('error' in out ? {} : { data: out.data, explanation: out.explanation, refs: out.refs }),
        admin_note: note.trim() || null,
        ...(status ? { status } : {}),
      });
      if (status) await loadApproved(true);
      onDone();
    } catch {
      setMsg(t.tlSendFailed);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(t.tlDeleteConfirm)) return;
    setBusy(true);
    try {
      await deleteSubmission(s.id);
      await loadApproved(true);
      onDone();
    } catch {
      setMsg(t.tlSendFailed);
      setBusy(false);
    }
  }

  return (
    <div className="tl-panel">
      <p className="caption">
        {s.added_by} · {s.kind === 'event' ? t.tlKindEvent : s.kind === 'person' ? t.tlKindPerson : t.tlKindCorrection}
      </p>
      <h2 className="title">{submissionTitle(s, lang)}</h2>
      <TimelineForm draft={draft} onChange={setDraft} tl={tl} lang={lang} fixedKind />
      <label className="tl-formfield">
        <span className="caption">{t.tlNoteForWriter}</span>
        <input className="field" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} aria-label={t.tlNoteForWriter} />
      </label>
      {msg && <p className="caption form-msg is-error">{msg}</p>}
      <div className="tl-review-actions">
        {s.status !== 'approved' && (
          <Pressable className="btn btn-primary" disabled={busy} onClick={() => void save('approved')}>
            <Check size={17} strokeWidth={STROKE} /> {t.tlApprove}
          </Pressable>
        )}
        {s.status === 'approved' && (
          <Pressable className="btn btn-primary" disabled={busy} onClick={() => void save()}>
            <Save size={17} strokeWidth={STROKE} /> {t.tlSaveEdits}
          </Pressable>
        )}
        {s.status !== 'rejected' && (
          <Pressable className="btn glass" disabled={busy} onClick={() => void save('rejected')}>
            <X size={17} strokeWidth={STROKE} /> {s.status === 'approved' ? t.tlUnpublish : t.tlReject}
          </Pressable>
        )}
        <Pressable className="btn glass" disabled={busy} onClick={() => void remove()}>
          <Trash2 size={16} strokeWidth={STROKE} /> {t.tlDelete}
        </Pressable>
      </div>
    </div>
  );
}
