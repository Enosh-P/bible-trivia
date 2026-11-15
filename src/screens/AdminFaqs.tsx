import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, BookOpen, ChevronLeft, Eye, Plus, Send, Trash2, Undo2, X } from 'lucide-react';
import { FAQ_TOPICS, emptyFaq, faqProblem, faqText, type FaqDraft, type FaqTopic, type GospelFaq } from '../engine/faqs';
import { formatVerseRef, parseVerseRef } from '../engine/verseRef';
import { deleteFaq, listAllFaqs, saveFaq, saveFaqOrder } from '../online/faqs';
import { useApp, useT } from '../store';
import { Pressable } from '../components/Pressable';
import { STROKE } from '../components/icons';
import { Sheet } from '../components/Sheet';
import { VersePicker, type VersePick } from '../components/VersePicker';
import { PostVerse } from '../components/PostView';
import { FaqItem } from './Gospel';

/** Admin -> Gospel Q&A: the questions by topic, reorder, add, edit, publish. */
export function AdminFaqs({ onExit }: { onExit: () => void }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const [faqs, setFaqs] = useState<GospelFaq[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<FaqDraft | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setError(null);
    listAllFaqs()
      .then(setFaqs)
      .catch((e: Error) => setError(e.message));
  };
  useEffect(load, []);

  if (editing) {
    return (
      <FaqEditor
        initial={editing}
        onClose={(changed) => {
          setEditing(null);
          if (changed) load();
        }}
      />
    );
  }

  /** Move a question up or down within its topic and save the new order. */
  async function move(faq: GospelFaq, dir: -1 | 1) {
    if (!faqs || busy) return;
    const same = faqs.filter((f) => f.topic === faq.topic);
    const i = same.findIndex((f) => f.id === faq.id);
    const j = i + dir;
    if (j < 0 || j >= same.length) return;
    [same[i], same[j]] = [same[j], same[i]];
    const reordered = same.map((f, k) => ({ ...f, sort: (k + 1) * 10 }));
    setFaqs(faqs.map((f) => reordered.find((r) => r.id === f.id) ?? f).sort((a, b) => FAQ_TOPICS.indexOf(a.topic) - FAQ_TOPICS.indexOf(b.topic) || a.sort - b.sort));
    setBusy(true);
    try {
      await saveFaqOrder(same.map((f) => f.id));
    } catch (e) {
      setError((e as Error).message);
      load();
    } finally {
      setBusy(false);
    }
  }

  const nextSort = (topic: FaqTopic) => ((faqs ?? []).filter((f) => f.topic === topic).length + 1) * 10;

  return (
    <div className="screen recall" lang={uiLang}>
      <header className="recall-head">
        <Pressable className="chip glass" onClick={onExit} aria-label={t.back}>
          <ChevronLeft size={20} strokeWidth={STROKE} />
        </Pressable>
        <div className="grow">
          <p className="eyebrow">{t.admin}</p>
          <h1 className="title">{t.adminFaqs}</h1>
        </div>
      </header>

      <Pressable className="btn btn-primary" onClick={() => setEditing(emptyFaq('salvation', nextSort('salvation')))}>
        <Plus size={18} strokeWidth={STROKE} /> {t.faqNew}
      </Pressable>

      {error && <p className="caption form-msg is-error">{t.faqLoadError}</p>}
      {faqs === null && !error && <p className="caption">{t.faqLoading}</p>}

      {faqs &&
        FAQ_TOPICS.map((topic) => {
          const items = faqs.filter((f) => f.topic === topic);
          if (!items.length) return null;
          return (
            <section key={topic} className="faq-admin-group">
              <h2 className="eyebrow section-title">{t.faqTopic[topic]}</h2>
              {items.map((f, i) => {
                const txt = faqText(f, uiLang);
                return (
                  <div key={f.id} className="faq-admin-row glass">
                    <Pressable className="grow faq-admin-open" onClick={() => setEditing({ ...f })}>
                      <span lang={txt.qLang}>{txt.q}</span>
                      <span className="caption">
                        {f.status === 'draft' ? t.faqDraft : t.faqPublished}
                        {(!f.question_en || !f.question_ta) && ` · ${!f.question_ta ? t.faqNoTamil : t.faqNoEnglish}`}
                      </span>
                    </Pressable>
                    <div className="faq-admin-move">
                      <button className="icon-btn" aria-label={t.faqUp} disabled={i === 0 || busy} onClick={() => void move(f, -1)}>
                        <ArrowUp size={16} strokeWidth={STROKE} />
                      </button>
                      <button className="icon-btn" aria-label={t.faqDown} disabled={i === items.length - 1 || busy} onClick={() => void move(f, 1)}>
                        <ArrowDown size={16} strokeWidth={STROKE} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>
          );
        })}
    </div>
  );
}

function FaqEditor({ initial, onClose }: { initial: FaqDraft; onClose: (changed: boolean) => void }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const [draft, setDraft] = useState<FaqDraft>(initial);
  const [tab, setTab] = useState<'en' | 'ta'>(uiLang);
  const [picking, setPicking] = useState(false);
  const [pick, setPick] = useState<VersePick>({ book: 'JHN', chapter: 3, from: 16, to: 0 });
  const [preview, setPreview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const set = (patch: Partial<FaqDraft>) => setDraft((d) => ({ ...d, ...patch }));

  async function save(status: FaqDraft['status']) {
    const next = { ...draft, status };
    if (status === 'published') {
      const problem = faqProblem(next);
      if (problem) return setMsg(problem === 'question' ? t.faqNeedQuestion : t.faqNeedAnswer);
    } else if (!next.question_en.trim() && !next.question_ta.trim()) {
      return setMsg(t.faqNeedQuestion);
    }
    setBusy(true);
    setMsg(null);
    try {
      await saveFaq(next);
      onClose(true);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!draft.id) return onClose(false);
    setBusy(true);
    try {
      await deleteFaq(draft.id);
      onClose(true);
    } catch (e) {
      setMsg((e as Error).message);
      setBusy(false);
    }
  }

  const addVerse = () => {
    const ref = formatVerseRef({ book: pick.book, chapter: pick.chapter, verse: pick.from, ...(pick.to > pick.from ? { verseEnd: pick.to } : {}) });
    if (!draft.verse_refs.includes(ref)) set({ verse_refs: [...draft.verse_refs, ref] });
    setPicking(false);
  };

  const previewFaq: GospelFaq = { ...draft, id: draft.id ?? 'preview' };

  return (
    <div className="screen recall post-editor" lang={uiLang}>
      <header className="recall-head">
        <Pressable className="chip glass" onClick={() => onClose(false)} aria-label={t.back}>
          <ChevronLeft size={20} strokeWidth={STROKE} />
        </Pressable>
        <div className="grow">
          <p className="eyebrow">
            {t.adminFaqs} · {draft.status === 'draft' ? t.faqDraft : t.faqPublished}
          </p>
          <h1 className="title">{draft.id ? t.faqEdit : t.faqNew}</h1>
        </div>
      </header>

      <label className="glass card-pad faq-topic-pick">
        <span className="eyebrow">{t.faqTopicLabel}</span>
        <select className="field" value={draft.topic} onChange={(e) => set({ topic: e.target.value as FaqTopic })}>
          {FAQ_TOPICS.map((tp) => (
            <option key={tp} value={tp}>
              {t.faqTopic[tp]}
            </option>
          ))}
        </select>
      </label>

      <div className="segmented post-tabs" role="tablist">
        {(['en', 'ta'] as const).map((l) => (
          <button key={l} role="tab" aria-selected={tab === l} className={tab === l ? 'is-on' : ''} onClick={() => setTab(l)} lang={l}>
            {tab === l && <span className="segmented-thumb" />}
            <span>{l === 'en' ? 'English' : 'தமிழ்'}</span>
          </button>
        ))}
      </div>

      <div className="glass card-pad faq-fields">
        <input
          className="field"
          lang={tab}
          placeholder={t.faqQuestionPh}
          value={draft[`question_${tab}`]}
          onChange={(e) => set({ [`question_${tab}`]: e.target.value } as Partial<FaqDraft>)}
        />
        <textarea
          className="field post-body-input"
          lang={tab}
          placeholder={t.faqAnswerPh}
          value={draft[`answer_${tab}`]}
          onChange={(e) => set({ [`answer_${tab}`]: e.target.value } as Partial<FaqDraft>)}
        />
        <p className="caption">{t.postFormatHelp}</p>
      </div>

      <div className="glass card-pad faq-verses">
        <div className="row">
          <BookOpen size={18} strokeWidth={STROKE} />
          <span className="row-label grow">{t.faqVerses}</span>
          <button className="btn glass small" onClick={() => setPicking(true)}>
            <Plus size={16} strokeWidth={STROKE} /> {t.faqAddVerse}
          </button>
        </div>
        {draft.verse_refs.map((ref) => {
          const v = parseVerseRef(ref);
          return (
            <div key={ref} className="faq-verse-row">
              <div className="grow">{v ? <PostVerse verse={v} /> : <span>{ref}</span>}</div>
              <button className="icon-btn" aria-label={t.faqRemove} onClick={() => set({ verse_refs: draft.verse_refs.filter((r) => r !== ref) })}>
                <X size={16} strokeWidth={STROKE} />
              </button>
            </div>
          );
        })}
      </div>

      {preview && (
        <div className="faq-preview">
          <p className="eyebrow">{t.faqPreview}</p>
          <FaqItem faq={previewFaq} lang={tab} open onToggle={() => {}} preview />
        </div>
      )}

      {msg && <p className="caption form-msg is-error">{msg}</p>}

      <div className="post-actions">
        <Pressable className="btn glass" onClick={() => setPreview((p) => !p)}>
          <Eye size={18} strokeWidth={STROKE} /> {t.faqPreview}
        </Pressable>
        <Pressable className="btn glass" disabled={busy} onClick={() => void save(draft.status === 'published' ? 'published' : 'draft')}>
          {draft.status === 'published' ? t.faqSaveChanges : t.faqSaveDraft}
        </Pressable>
        {draft.status === 'published' ? (
          <Pressable className="btn btn-primary" disabled={busy} onClick={() => void save('draft')}>
            <Undo2 size={18} strokeWidth={STROKE} /> {t.faqUnpublish}
          </Pressable>
        ) : (
          <Pressable className="btn btn-primary" disabled={busy} onClick={() => void save('published')}>
            <Send size={18} strokeWidth={STROKE} /> {t.faqPublish}
          </Pressable>
        )}
      </div>

      {draft.id &&
        (confirmDelete ? (
          <div className="glass card-pad">
            <p>{t.faqDeleteConfirm}</p>
            <div className="post-actions">
              <Pressable className="btn glass" onClick={() => setConfirmDelete(false)}>
                {t.cancel}
              </Pressable>
              <Pressable className="btn btn-danger" disabled={busy} onClick={() => void remove()}>
                <Trash2 size={18} strokeWidth={STROKE} /> {t.faqDelete}
              </Pressable>
            </div>
          </div>
        ) : (
          <button className="link danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={16} strokeWidth={STROKE} /> {t.faqDelete}
          </button>
        ))}

      <Sheet open={picking} onClose={() => setPicking(false)} label={t.faqAddVerse}>
        <div className="add-verse">
          <h2 className="title">{t.faqAddVerse}</h2>
          <VersePicker value={pick} onChange={setPick} active={picking} />
          <Pressable className="btn btn-primary" onClick={addVerse}>
            <Plus size={18} strokeWidth={STROKE} /> {t.faqAddVerse}
          </Pressable>
        </div>
      </Sheet>
    </div>
  );
}
