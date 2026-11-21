import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Send, Trash2 } from 'lucide-react';
import { useApp, useT } from '../store';
import { spring } from '../motion/springs';
import { Pressable } from '../components/Pressable';
import { STROKE } from '../components/icons';
import { VersePicker, type VersePick } from '../components/VersePicker';
import { useAccount } from '../online/account';
import {
  deleteSubmission,
  mySubmissions,
  sendSubmission,
  type CorrectionData,
  type EventData,
  type NewSubmission,
  type PersonData,
  type PersonPatch,
  type Submission,
  type SubmissionKind,
} from '../online/timeline';
import { byStart, pick, refLabel, type Lang, type TPerson, type TRef, type Text, type Timeline } from '../engine/timeline';

/** Everything the form can hold; years are BC-negative, null = empty. */
export interface Draft {
  kind: SubmissionKind;
  person: string;
  y: number | null;
  approx: boolean;
  textEn: string;
  textTa: string;
  nameEn: string;
  nameTa: string;
  titleEn: string;
  titleTa: string;
  cat: string;
  born: number | null;
  died: number | null;
  activeFrom: number | null;
  activeTo: number | null;
  activeEn: string;
  activeTa: string;
  explanation: string;
  refs: VersePick[];
}

export function emptyDraft(kind: SubmissionKind = 'event', person = ''): Draft {
  return {
    kind,
    person,
    y: null,
    approx: true,
    textEn: '',
    textTa: '',
    nameEn: '',
    nameTa: '',
    titleEn: '',
    titleTa: '',
    cat: 'anc',
    born: null,
    died: null,
    activeFrom: null,
    activeTo: null,
    activeEn: '',
    activeTa: '',
    explanation: '',
    refs: [{ book: 'GEN', chapter: 1, from: 1, to: 0 }],
  };
}

/** The verse picker starts at the person's own first chapter (else Genesis 1). */
const firstRef = (p?: TPerson): VersePick[] => {
  const r = p?.refs.find((x) => x.c) ?? p?.refs[0];
  return [{ book: r?.b ?? 'GEN', chapter: r?.c ?? 1, from: r?.v ?? 1, to: 0 }];
};
export const eventDraft = (p: TPerson): Draft => ({ ...emptyDraft('event', p.id), refs: firstRef(p) });

/** A correction starts from the person's current details. */
export function correctionDraft(p: TPerson): Draft {
  return {
    ...emptyDraft('correction', p.id),
    refs: firstRef(p),
    approx: Boolean(p.approx),
    nameEn: p.name.en,
    nameTa: p.name.ta,
    titleEn: p.title.en,
    titleTa: p.title.ta,
    born: p.born ?? null,
    died: p.died ?? null,
    activeFrom: p.active?.from ?? null,
    activeTo: p.active?.to ?? null,
    activeEn: p.active?.en ?? '',
    activeTa: p.active?.ta ?? '',
  };
}

const toRef = (v: VersePick): TRef => ({ b: v.book, c: v.chapter, v: v.from, ...(v.to > v.from ? { v2: v.to } : {}) });
const toPick = (r: TRef): VersePick => ({ book: r.b, chapter: r.c ?? 1, from: r.v ?? 1, to: r.v2 ?? 0 });
const text = (en: string, ta: string): Text => ({ en: en.trim(), ta: ta.trim() });
const sameText = (a?: Text, b?: Text) => (a?.en ?? '') === (b?.en ?? '') && (a?.ta ?? '') === (b?.ta ?? '');
/** astro-style comparison of BC-negative years */
const before = (a: number, b: number) => (a < 0 ? a + 1 : a) > (b < 0 ? b + 1 : b);

/** The form as a submission, or the first problem with it. */
export function toSubmission(d: Draft, tl: Timeline, t: ReturnType<typeof useT>): NewSubmission | { error: string } {
  const person = tl.people.find((p) => p.id === d.person);
  const personName = person ? person.name : { en: '', ta: '' };
  if (!d.explanation.trim()) return { error: t.tlErrExplain };
  if (!d.refs.length) return { error: t.tlErrRefs };
  const refs = d.refs.map(toRef);
  const active = d.activeFrom != null && d.activeTo != null ? { from: d.activeFrom, to: d.activeTo, ...text(d.activeEn, d.activeTa) } : undefined;
  const yearsOk = () => {
    if (d.born != null && d.died != null && before(d.born, d.died)) return t.tlErrOrder;
    if (active && before(active.from, active.to)) return t.tlErrOrder;
    if ((d.born == null || d.died == null) && !active) return t.tlErrYears;
    return null;
  };

  if (d.kind === 'event') {
    if (!person) return { error: t.tlErrPerson };
    if (d.y == null) return { error: t.tlErrYear };
    if (!d.textEn.trim() && !d.textTa.trim()) return { error: t.tlErrText };
    const data: EventData = { person: d.person, personName, y: d.y, approx: d.approx, text: text(d.textEn, d.textTa) };
    return { kind: 'event', data, explanation: d.explanation.trim(), refs };
  }
  if (d.kind === 'person') {
    if (!d.nameEn.trim() && !d.nameTa.trim()) return { error: t.tlErrName };
    if (!d.titleEn.trim() && !d.titleTa.trim()) return { error: t.tlErrTitle };
    const bad = yearsOk();
    if (bad) return { error: bad };
    const data: PersonData = {
      name: text(d.nameEn, d.nameTa),
      title: text(d.titleEn, d.titleTa),
      cat: d.cat,
      ...(d.born != null && d.died != null ? { born: d.born, died: d.died } : {}),
      ...(active ? { active } : {}),
      approx: d.approx,
    };
    return { kind: 'person', data, explanation: d.explanation.trim(), refs };
  }
  // correction: only what changed
  if (!person) return { error: t.tlErrPerson };
  const bad = yearsOk();
  if (bad) return { error: bad };
  const patch: PersonPatch = {};
  const name = text(d.nameEn, d.nameTa);
  const title = text(d.titleEn, d.titleTa);
  if (!sameText(name, person.name)) patch.name = name;
  if (!sameText(title, person.title)) patch.title = title;
  if ((d.born ?? undefined) !== person.born) patch.born = d.born ?? undefined;
  if ((d.died ?? undefined) !== person.died) patch.died = d.died ?? undefined;
  if (JSON.stringify(active ?? null) !== JSON.stringify(person.active ?? null)) patch.active = active;
  if (d.approx !== Boolean(person.approx)) patch.approx = d.approx;
  if (!Object.keys(patch).length) return { error: t.tlErrChange };
  const data: CorrectionData = { person: d.person, personName, patch };
  return { kind: 'correction', data, explanation: d.explanation.trim(), refs };
}

/** A saved submission back in the form (for the admin to edit). */
export function fromSubmission(s: Submission, tl: Timeline): Draft {
  const base = emptyDraft(s.kind);
  const refs = s.refs.map(toPick);
  if (s.kind === 'event') {
    const d = s.data as EventData;
    return { ...base, person: d.person, y: d.y, approx: Boolean(d.approx), textEn: d.text.en, textTa: d.text.ta, explanation: s.explanation, refs };
  }
  if (s.kind === 'person') {
    const d = s.data as PersonData;
    return {
      ...base,
      nameEn: d.name.en,
      nameTa: d.name.ta,
      titleEn: d.title.en,
      titleTa: d.title.ta,
      cat: d.cat,
      born: d.born ?? null,
      died: d.died ?? null,
      activeFrom: d.active?.from ?? null,
      activeTo: d.active?.to ?? null,
      activeEn: d.active?.en ?? '',
      activeTa: d.active?.ta ?? '',
      approx: Boolean(d.approx),
      explanation: s.explanation,
      refs,
    };
  }
  const d = s.data as CorrectionData;
  const p = tl.people.find((x) => x.id === d.person);
  const start = p ? correctionDraft(p) : { ...base, person: d.person };
  const pa = d.patch;
  return {
    ...start,
    ...(pa.name ? { nameEn: pa.name.en, nameTa: pa.name.ta } : {}),
    ...(pa.title ? { titleEn: pa.title.en, titleTa: pa.title.ta } : {}),
    ...('born' in pa ? { born: pa.born ?? null } : {}),
    ...('died' in pa ? { died: pa.died ?? null } : {}),
    ...('active' in pa
      ? { activeFrom: pa.active?.from ?? null, activeTo: pa.active?.to ?? null, activeEn: pa.active?.en ?? '', activeTa: pa.active?.ta ?? '' }
      : {}),
    ...('approx' in pa ? { approx: Boolean(pa.approx) } : {}),
    explanation: s.explanation,
    refs,
  };
}

/** A year typed as a number with BC / AD. Empty = not known. */
function YearField({ label, value, onChange, id }: { label: string; value: number | null; onChange: (v: number | null) => void; id: string }) {
  const t = useT();
  const bc = value == null ? true : value < 0;
  const n = value == null ? '' : String(Math.abs(value));
  const set = (num: string, isBc: boolean) => {
    const v = Number(num.replace(/\D/g, '').slice(0, 4));
    onChange(v ? (isBc ? -v : v) : null);
  };
  return (
    <label className="tl-yearfield">
      <span className="caption">{label}</span>
      <span className="tl-yearfield-row">
        <input className="field" inputMode="numeric" value={n} onChange={(e) => set(e.target.value, bc)} aria-label={label} placeholder="—" />
        <span className="lang-switch tl-bcad" role="radiogroup" aria-label={label}>
          {[true, false].map((isBc) => (
            <button key={String(isBc)} type="button" role="radio" aria-checked={bc === isBc} className={bc === isBc ? 'is-on' : ''} onClick={() => set(n, isBc)}>
              {bc === isBc && <motion.span layoutId={`${id}-thumb`} className="lang-thumb" transition={spring.calm} />}
              <span className="lang-label">{isBc ? t.tlBC : t.tlAD}</span>
            </button>
          ))}
        </span>
      </span>
    </label>
  );
}

function TwoLang({ label, en, ta, onEn, onTa, area }: { label: string; en: string; ta: string; onEn: (v: string) => void; onTa: (v: string) => void; area?: boolean }) {
  const t = useT();
  const Tag = area ? 'textarea' : 'input';
  return (
    <fieldset className="tl-twolang">
      <legend className="caption">{label}</legend>
      <Tag className="field" value={en} onChange={(e) => onEn(e.target.value)} placeholder={t.tlInEnglish} aria-label={`${label} (${t.tlInEnglish})`} maxLength={300} lang="en" />
      <Tag className="field" value={ta} onChange={(e) => onTa(e.target.value)} placeholder={t.tlInTamil} aria-label={`${label} (${t.tlInTamil})`} maxLength={300} lang="ta" />
    </fieldset>
  );
}

/** The suggestion form (readers) or the edit form (admin, `fixedKind`). */
export function TimelineForm({ draft, onChange, tl, lang, fixedKind }: { draft: Draft; onChange: (d: Draft) => void; tl: Timeline; lang: Lang; fixedKind?: boolean }) {
  const t = useT();
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });
  const people = [...tl.people].sort(byStart);
  const pickPerson = (id: string) => {
    const p = tl.people.find((x) => x.id === id);
    if (draft.kind === 'correction' && p) onChange({ ...correctionDraft(p), explanation: draft.explanation });
    else set({ person: id, ...(p ? { refs: firstRef(p) } : {}) });
  };
  const personSelect = (
    <label className="tl-formfield">
      <span className="caption">{t.tlPerson}</span>
      <select className="field" value={draft.person} onChange={(e) => pickPerson(e.target.value)} aria-label={t.tlPerson}>
        <option value="">{t.tlChoosePerson}</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {pick(p.name, lang)}
          </option>
        ))}
      </select>
    </label>
  );
  const years = (
    <>
      <p className="caption">{t.tlYearsHelp}</p>
      <div className="tl-years-grid">
        <YearField id="born" label={t.tlBorn} value={draft.born} onChange={(born) => set({ born })} />
        <YearField id="died" label={t.tlDied} value={draft.died} onChange={(died) => set({ died })} />
        <YearField id="afrom" label={t.tlActiveFrom} value={draft.activeFrom} onChange={(activeFrom) => set({ activeFrom })} />
        <YearField id="ato" label={t.tlActiveTo} value={draft.activeTo} onChange={(activeTo) => set({ activeTo })} />
      </div>
      <TwoLang label={t.tlActiveLabel} en={draft.activeEn} ta={draft.activeTa} onEn={(activeEn) => set({ activeEn })} onTa={(activeTa) => set({ activeTa })} />
    </>
  );

  return (
    <div className="tl-form">
      {!fixedKind && (
        <div className="segmented small" role="tablist">
          {(['event', 'person', 'correction'] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={draft.kind === k} className={draft.kind === k ? 'is-on' : ''} onClick={() => {
              const p = tl.people.find((x) => x.id === draft.person);
              onChange(k === 'correction' && p ? { ...correctionDraft(p), explanation: draft.explanation, refs: draft.refs } : { ...emptyDraft(k, draft.person), explanation: draft.explanation, refs: draft.refs });
            }}>
              {draft.kind === k && <motion.span layoutId="seg-tl-kind" className="segmented-thumb" transition={spring.calm} />}
              <span>{k === 'event' ? t.tlKindEvent : k === 'person' ? t.tlKindPerson : t.tlKindCorrection}</span>
            </button>
          ))}
        </div>
      )}

      {draft.kind === 'event' && (
        <>
          {personSelect}
          <YearField id="ey" label={t.tlYear} value={draft.y} onChange={(y) => set({ y })} />
          <TwoLang label={t.tlEventText} en={draft.textEn} ta={draft.textTa} onEn={(textEn) => set({ textEn })} onTa={(textTa) => set({ textTa })} />
        </>
      )}

      {draft.kind === 'person' && (
        <>
          <TwoLang label={t.tlName} en={draft.nameEn} ta={draft.nameTa} onEn={(nameEn) => set({ nameEn })} onTa={(nameTa) => set({ nameTa })} />
          <TwoLang label={t.tlTitleLabel} en={draft.titleEn} ta={draft.titleTa} onEn={(titleEn) => set({ titleEn })} onTa={(titleTa) => set({ titleTa })} />
          <label className="tl-formfield">
            <span className="caption">{t.tlGroup}</span>
            <select className="field" value={draft.cat} onChange={(e) => set({ cat: e.target.value })} aria-label={t.tlGroup}>
              {tl.cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {pick(c, lang)}
                </option>
              ))}
            </select>
          </label>
          {years}
        </>
      )}

      {draft.kind === 'correction' && (
        <>
          {personSelect}
          {draft.person && (
            <>
              <TwoLang label={t.tlName} en={draft.nameEn} ta={draft.nameTa} onEn={(nameEn) => set({ nameEn })} onTa={(nameTa) => set({ nameTa })} />
              <TwoLang label={t.tlTitleLabel} en={draft.titleEn} ta={draft.titleTa} onEn={(titleEn) => set({ titleEn })} onTa={(titleTa) => set({ titleTa })} />
              {years}
            </>
          )}
        </>
      )}

      <label className="tl-check">
        <input type="checkbox" checked={draft.approx} onChange={(e) => set({ approx: e.target.checked })} /> {t.tlApproxLabel}
      </label>

      <label className="tl-formfield">
        <span className="caption">{t.tlExplanation}</span>
        <textarea className="field" rows={4} maxLength={2000} value={draft.explanation} onChange={(e) => set({ explanation: e.target.value })} placeholder={t.tlExplanationHint} aria-label={t.tlExplanation} />
      </label>

      <div className="tl-formfield">
        <span className="caption">{t.tlVersesNeeded}</span>
        {draft.refs.map((r, i) => (
          <div key={i} className="tl-ref-edit glass">
            <VersePicker value={r} onChange={(v) => set({ refs: draft.refs.map((x, j) => (j === i ? v : x)) })} offlineNote={t.offlineNotLoaded} />
            <button type="button" className="icon-btn" onClick={() => set({ refs: draft.refs.filter((_, j) => j !== i) })} aria-label={t.tlRemove} title={t.tlRemove}>
              <Trash2 size={16} strokeWidth={STROKE} />
            </button>
          </div>
        ))}
        {draft.refs.length < 10 && (
          <button type="button" className="btn glass small tl-add-verse" onClick={() => set({ refs: [...draft.refs, draft.refs[draft.refs.length - 1] ?? { book: 'GEN', chapter: 1, from: 1, to: 0 }] })}>
            <Plus size={16} strokeWidth={STROKE} /> {t.tlAddVerse}
          </button>
        )}
      </div>
    </div>
  );
}

/** Reader: suggest something. */
export function SubmitPanel({ tl, lang, initial, onDone }: { tl: Timeline; lang: Lang; initial: Draft; onDone: () => void }) {
  const t = useT();
  const signedIn = useAccount((s) => Boolean(s.session));
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);

  if (!signedIn) return <p className="caption note">{t.tlSignIn}</p>;

  async function send() {
    const s = toSubmission(draft, tl, t);
    if ('error' in s) return setMsg({ text: s.error });
    setBusy(true);
    setMsg(null);
    try {
      await sendSubmission(s);
      setMsg({ text: t.tlSent, ok: true });
      setTimeout(onDone, 1200);
    } catch (e) {
      setMsg({ text: /too many/.test((e as Error).message) ? t.tlTooMany : t.tlSendFailed });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tl-panel">
      <h2 className="title">{t.tlAdd}</h2>
      <p className="caption">{t.tlAddLead}</p>
      <TimelineForm draft={draft} onChange={setDraft} tl={tl} lang={lang} />
      {msg && <p className={`caption form-msg ${msg.ok ? 'is-ok' : 'is-error'}`}>{msg.text}</p>}
      <Pressable className="btn btn-primary" disabled={busy || msg?.ok} onClick={() => void send()}>
        <Send size={17} strokeWidth={STROKE} /> {t.tlSend}
      </Pressable>
    </div>
  );
}

/** A one-line summary of a suggestion. */
export function submissionTitle(s: Pick<Submission, 'kind' | 'data'>, lang: Lang): string {
  if (s.kind === 'event') return `${pick((s.data as EventData).personName, lang)}: ${pick((s.data as EventData).text, lang)}`;
  if (s.kind === 'person') return pick((s.data as PersonData).name, lang);
  return pick((s.data as CorrectionData).personName, lang);
}

/** Reader: their own suggestions and what happened to them. */
export function MinePanel({ lang }: { lang: Lang }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const signedIn = useAccount((s) => Boolean(s.session));
  const [list, setList] = useState<Submission[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    void mySubmissions().then((l) => (l ? setList(l) : setFailed(true)));
  }, []);
  if (!signedIn) return <p className="caption note">{t.tlSignIn}</p>;
  const kindLabel = (k: SubmissionKind) => (k === 'event' ? t.tlKindEvent : k === 'person' ? t.tlKindPerson : t.tlKindCorrection);
  const statusLabel = { pending: t.tlPending, approved: t.tlApproved, rejected: t.tlRejected };
  return (
    <div className="tl-panel">
      <h2 className="title">{t.tlMine}</h2>
      {failed && <p className="caption note">{t.offlineNotLoaded}</p>}
      {list && !list.length && <p className="caption">{t.tlNoMine}</p>}
      <div className="tl-mine">
        {list?.map((s) => (
          <div key={s.id} className="tl-mine-item glass">
            <div className="tl-mine-head">
              <span className="caption">{kindLabel(s.kind)}</span>
              <span className={`tl-status is-${s.status}`}>{statusLabel[s.status]}</span>
            </div>
            <strong>{submissionTitle(s, lang)}</strong>
            <span className="caption">
              {s.refs.map((r) => refLabel(r, lang)).join('; ')} · {new Date(s.created_at).toLocaleDateString(uiLang === 'ta' ? 'ta-IN' : undefined)}
            </span>
            {s.admin_note && (
              <p className="caption tl-admin-note">
                <b>{t.tlAdminNote}:</b> {s.admin_note}
              </p>
            )}
            {s.status === 'pending' && (
              <button className="link tl-mine-delete" onClick={async () => {
                if (!confirm(t.tlDeleteConfirm)) return;
                await deleteSubmission(s.id).catch(() => {});
                setList((l) => l?.filter((x) => x.id !== s.id) ?? null);
              }}>
                <Trash2 size={14} strokeWidth={STROKE} /> {t.tlDelete}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
