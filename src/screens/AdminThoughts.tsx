import { useEffect, useRef, useState } from 'react';
import { Bold, BookOpen, CircleHelp, Heart, MessageCircle, CalendarDays, ChevronLeft, ChevronRight, Eye, Feather, Image as ImageIcon, ImagePlus, Italic, List, ListOrdered, Plus, Send, Trash2, Undo2, History } from 'lucide-react';
import { dayKey } from '../engine/picker';
import { emptyDraft, hasLang, postState, publishProblem, type Post, type PostDraft, type PostState } from '../engine/posts';
import { formatVerseRef, parseVerseRef } from '../engine/verseRef';
import type { Lang } from '../engine/types';
import { deletePost, listAllPosts, savePost, uploadPostImage } from '../online/adminPosts';
import { postStats } from '../online/postSocial';
import { useAccount } from '../online/account';
import { supabase } from '../online/supabase';
import { useApp, useT } from '../store';
import { Pressable } from '../components/Pressable';
import { IconTile, STROKE } from '../components/icons';
import { LangToggle } from '../components/LangToggle';
import { Sheet } from '../components/Sheet';
import { VersePicker, type VersePick } from '../components/VersePicker';
import { PostImage } from '../components/Markdown';
import { PostVerse, PostView, postDate } from '../components/PostView';

// ---------- Unsaved drafts, kept on the phone so nothing is lost if the app closes ----------
const DRAFT_KEY = 'bt-post-drafts';
interface StoredDraft {
  draft: PostDraft;
  at: number;
}
/** Unsaved drafts by post id ('new' for a thought not saved yet). */
function readAllStored(): Record<string, StoredDraft> {
  try {
    const all = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}') as Record<string, StoredDraft>;
    return all && typeof all === 'object' ? Object.fromEntries(Object.entries(all).filter(([, s]) => s?.draft && typeof s.draft.body_en === 'string')) : {};
  } catch {
    return {};
  }
}
function saveAllStored(all: Record<string, StoredDraft>) {
  try {
    if (Object.keys(all).length) localStorage.setItem(DRAFT_KEY, JSON.stringify(all));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* storage full or blocked */
  }
}
function writeStored(draft: PostDraft) {
  saveAllStored({ ...readAllStored(), [draft.id ?? 'new']: { draft, at: Date.now() } });
}
function clearStored(key: string) {
  const all = readAllStored();
  if (!(key in all)) return;
  delete all[key];
  saveAllStored(all);
}

const toDraft = (p: Post): PostDraft => ({
  id: p.id,
  title_en: p.title_en,
  title_ta: p.title_ta,
  body_en: p.body_en,
  body_ta: p.body_ta,
  cover_url: p.cover_url,
  verse_ref: p.verse_ref,
  publish_on: p.publish_on,
  status: p.status,
});
const same = (a: PostDraft, b: PostDraft) => JSON.stringify(a) === JSON.stringify(b);
const ORDER: PostState[] = ['draft', 'scheduled', 'published'];
const STATE_HORSE = { draft: 'white', scheduled: 'black', published: 'pale' } as const;

/** Admin → Thoughts: the list of drafts, scheduled and published posts, and the editor. */
export function AdminThoughts({ onExit }: { onExit: () => void }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const signedIn = useAccount((s) => Boolean(s.session));
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [stats, setStats] = useState<Record<string, { likes: number; comments: number }>>({});
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<{ saved: PostDraft; start: PostDraft; restored: boolean } | null>(null);
  const [stored, setStored] = useState(() => readAllStored());
  const today = dayKey();
  const canWork = Boolean(supabase) && signedIn;

  async function load() {
    if (!canWork) return;
    setFailed(false);
    try {
      setPosts(await listAllPosts());
      void postStats().then(setStats).catch(() => {});
    } catch {
      setFailed(true);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canWork]);

  /** Open the editor; unsaved words from last time come back. */
  function open(post: Post | null) {
    const saved = post ? toDraft(post) : emptyDraft(dayKey());
    const kept = readAllStored()[post?.id ?? 'new'];
    const mine = kept && !same(kept.draft, saved) ? kept.draft : null;
    setEditing({ saved, start: mine ?? saved, restored: Boolean(mine) });
  }

  if (editing) {
    return (
      <Editor
        key={editing.saved.id ?? 'new'}
        saved={editing.saved}
        start={editing.start}
        restored={editing.restored}
        onBack={() => {
          setEditing(null);
          setStored(readAllStored());
          void load();
        }}
      />
    );
  }

  // Unsaved work: a new thought, or changes to a post that still exists.
  const unsaved = Object.entries(stored)
    .map(([key, s]) => ({ key, draft: s.draft, post: key === 'new' ? null : (posts?.find((p) => p.id === key) ?? null) }))
    .filter((u) => u.key === 'new' || u.post);

  return (
    <div className="screen recall" lang={uiLang}>
      <header className="recall-head">
        <Pressable className="chip glass" onClick={onExit} aria-label={t.back}>
          <ChevronLeft size={20} strokeWidth={STROKE} />
        </Pressable>
        <div className="grow">
          <p className="eyebrow">{t.admin}</p>
          <h1 className="title">{t.adminThoughts}</h1>
        </div>
      </header>

      <Pressable className="btn btn-primary" onClick={() => open(null)}>
        <Plus size={18} strokeWidth={STROKE} /> {t.newThought}
      </Pressable>

      {unsaved.map((u) => (
        <Pressable key={u.key} className="thought-item glass is-unsaved" onClick={() => open(u.post)}>
          <IconTile horse="red" icon={Undo2} size={34} />
          <div className="grow">
            <span className="eyebrow">{t.draftContinue}</span>
            <strong>{u.draft[`title_${uiLang}`] || u.draft.title_en || u.draft.title_ta || t.postUntitled}</strong>
          </div>
          <ChevronRight size={18} strokeWidth={STROKE} />
        </Pressable>
      ))}

      {!canWork && <p className="caption form-msg is-info">{t.adminOffline}</p>}
      {failed && (
        <div className="glass card-pad">
          <p className="form-msg is-error">{t.adminLoadFailed}</p>
          <Pressable className="btn glass small" onClick={() => void load()}>
            {t.tryAgain}
          </Pressable>
        </div>
      )}
      {posts?.length === 0 && <p className="caption empty-note">{t.postNone}</p>}

      {ORDER.map((state) => {
        const group = (posts ?? []).filter((p) => postState(p, today) === state);
        if (!group.length) return null;
        return (
          <section key={state} className="admin-group">
            <h2 className="eyebrow section-title">
              {t.postStateGroup[state]} · {group.length}
            </h2>
            <div className="memory-list">
              {group.map((p) => (
                <Pressable key={p.id} className="thought-item glass" onClick={() => open(p)}>
                  <div className="grow">
                    <span className="eyebrow">
                      {postDate(p.publish_on, uiLang, 'short')}
                      {(['en', 'ta'] as const).map((l) => hasLang(p, l) && (
                        <span key={l} className="tag-lang" lang={l}>
                          {l === 'en' ? 'EN' : 'த'}
                        </span>
                      ))}
                    </span>
                    <strong lang={p[`title_${uiLang}`] ? uiLang : uiLang === 'en' ? 'ta' : 'en'}>{p[`title_${uiLang}`] || p.title_en || p.title_ta || t.postUntitled}</strong>
                    {stats[p.id] && (
                      <span className="caption post-stats">
                        <Heart size={13} strokeWidth={STROKE} /> {stats[p.id].likes} · <MessageCircle size={13} strokeWidth={STROKE} /> {stats[p.id].comments}
                      </span>
                    )}
                  </div>
                  <span className={`state-chip horse-${STATE_HORSE[state]}`}>{t.postStateName[state]}</span>
                </Pressable>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ---------- Text helpers for the formatting buttons ----------
type Sel = { value: string; start: number; end: number };

/** Puts ** or * around the selection (or an empty pair to type into). */
function wrap({ value, start, end }: Sel, mark: string): Sel {
  const picked = value.slice(start, end);
  const next = value.slice(0, start) + mark + picked + mark + value.slice(end);
  return { value: next, start: start + mark.length, end: end + mark.length };
}

/** Starts each selected line with "- " or "1. ", "2. " … */
function listify({ value, start, end }: Sel, numbered: boolean): Sel {
  const from = value.lastIndexOf('\n', start - 1) + 1;
  const toNl = value.indexOf('\n', end);
  const to = toNl === -1 ? value.length : toNl;
  const lines = value.slice(from, to).split('\n');
  const done = lines.map((l, i) => `${numbered ? `${i + 1}.` : '-'} ${l.replace(/^\s*(?:[-*•]|\d{1,3}[.)])\s+/, '')}`).join('\n');
  const next = value.slice(0, from) + done + value.slice(to);
  return { value: next, start: from + done.length, end: from + done.length };
}

/** Puts a block (a picture) on a line of its own at the cursor. */
function insertBlock({ value, end }: Sel, block: string): Sel {
  const before = value.slice(0, end).replace(/\s+$/, '');
  const after = value.slice(end).replace(/^\s+/, '');
  const head = before ? `${before}\n\n` : '';
  const next = head + block + (after ? `\n\n${after}` : '\n\n');
  const at = head.length + block.length + 2;
  return { value: next, start: at, end: at };
}

function Editor({ saved: savedAtOpen, start, restored, onBack }: { saved: PostDraft; start: PostDraft; restored: boolean; onBack: () => void }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const [saved, setSaved] = useState(savedAtOpen);
  const [draft, setDraft] = useState(start);
  const [tab, setTab] = useState<Lang>(() => (hasLang(start, uiLang) || !hasLang(start, uiLang === 'en' ? 'ta' : 'en') ? uiLang : uiLang === 'en' ? 'ta' : 'en'));
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showRestored, setShowRestored] = useState(restored);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [imageFor, setImageFor] = useState<Lang | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [pick, setPick] = useState<VersePick | null>(() => {
    const v = parseVerseRef(start.verse_ref);
    return v ? { book: v.book, chapter: v.chapter, from: v.verse, to: v.verseEnd ?? 0 } : null;
  });
  const bodies = { en: useRef<HTMLTextAreaElement>(null), ta: useRef<HTMLTextAreaElement>(null) };
  const coverInput = useRef<HTMLInputElement>(null);
  const dirty = !same(draft, saved);
  const patch = (p: Partial<PostDraft>) => {
    setDraft((d) => ({ ...d, ...p }));
    setMsg(null);
  };

  // Autosave: every change is kept on the phone until it has been saved to the server.
  useEffect(() => {
    if (!dirty) {
      clearStored(draft.id ?? 'new'); // nothing unsaved: forget the copy on the phone
      return;
    }
    const timer = setTimeout(() => writeStored(draft), 400);
    return () => clearTimeout(timer);
  }, [draft, dirty]);
  // Closing the app right after typing: write straight away.
  const latest = useRef({ draft, dirty });
  latest.current = { draft, dirty };
  useEffect(() => {
    const flush = () => {
      if (latest.current.dirty) writeStored(latest.current.draft);
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      flush();
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flush);
    };
  }, []);

  /** Change the text around the cursor of one language's text box. */
  function format(lang: Lang, change: (s: Sel) => Sel) {
    const el = bodies[lang].current;
    const value = draft[`body_${lang}`];
    const next = change({ value, start: el?.selectionStart ?? value.length, end: el?.selectionEnd ?? value.length });
    patch({ [`body_${lang}`]: next.value });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(next.start, next.end);
    });
  }

  function setVerse(v: VersePick | null) {
    setPick(v);
    patch({ verse_ref: v && v.chapter > 0 && v.from > 0 ? formatVerseRef({ book: v.book, chapter: v.chapter, verse: v.from, verseEnd: v.to }) : null });
  }

  async function save(status: PostDraft['status']) {
    const problem = status === 'published' ? publishProblem(draft) : null;
    if (problem) {
      setMsg({ ok: false, text: t.postNeed[problem] });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const stored = toDraft(await savePost({ ...draft, status }));
      setSaved(stored);
      setDraft(stored);
      clearStored(draft.id ?? 'new');
      clearStored(stored.id!);
      setShowRestored(false);
      const text =
        status === 'draft'
          ? saved.status === 'published'
            ? t.postUnpublished
            : t.postSaved
          : stored.publish_on > dayKey()
            ? t.postScheduledMsg(postDate(stored.publish_on, uiLang, 'short'))
            : saved.status === 'published'
              ? t.postSaved
              : t.postPublishedNow;
      setMsg({ ok: true, text });
    } catch {
      writeStored({ ...draft });
      setMsg({ ok: false, text: t.postSaveFailed });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      if (draft.id) await deletePost(draft.id);
      clearStored(draft.id ?? 'new');
      latest.current.dirty = false;
      onBack();
    } catch {
      setConfirmDelete(false);
      setMsg({ ok: false, text: t.postSaveFailed });
      setBusy(false);
    }
  }

  async function pickCover(file: File | undefined) {
    if (!file) return;
    setCoverBusy(true);
    setMsg(null);
    try {
      patch({ cover_url: await uploadPostImage(file) });
    } catch {
      setMsg({ ok: false, text: t.imageFailed });
    } finally {
      setCoverBusy(false);
    }
  }

  if (view === 'preview') {
    return (
      <div className="screen recall thought-screen" lang={uiLang}>
        <header className="recall-head">
          <Pressable className="chip glass" onClick={() => setView('edit')} aria-label={t.back}>
            <ChevronLeft size={20} strokeWidth={STROKE} />
          </Pressable>
          <div className="grow">
            <p className="eyebrow">{t.preview}</p>
            <p className="caption">{t.previewNote}</p>
          </div>
          <LangToggle compact />
        </header>
        <PostView post={draft} />
      </div>
    );
  }

  const verse = parseVerseRef(draft.verse_ref);
  const published = saved.status === 'published';
  const state = postState(saved, dayKey());
  return (
    <div className="screen recall post-editor" lang={uiLang}>
      <header className="recall-head">
        <Pressable className="chip glass" onClick={onBack} aria-label={t.back}>
          <ChevronLeft size={20} strokeWidth={STROKE} />
        </Pressable>
        <div className="grow">
          <p className="eyebrow">{t.adminThoughts}</p>
          <h1 className="title">{draft.id ? t.editThought : t.newThought}</h1>
        </div>
        <span className={`state-chip horse-${STATE_HORSE[state]}`}>{t.postStateName[state]}</span>
      </header>

      {showRestored && (
        <div className="glass card-pad restored-note" role="status">
          <span>{t.draftRestored}</span>
          <button
            className="link"
            onClick={() => {
              setDraft(saved);
              const v = parseVerseRef(saved.verse_ref);
              setPick(v ? { book: v.book, chapter: v.chapter, from: v.verse, to: v.verseEnd ?? 0 } : null);
              setShowRestored(false);
            }}
          >
            {t.draftDiscard}
          </button>
        </div>
      )}

      <div className="segmented post-tabs" role="tablist">
        {(['en', 'ta'] as const).map((l) => (
          <button key={l} role="tab" aria-selected={tab === l} className={tab === l ? 'is-on' : ''} onClick={() => setTab(l)} lang={l}>
            {tab === l && <span className="segmented-thumb" />}
            <span>
              {l === 'en' ? 'English' : 'தமிழ்'}
              {hasLang(draft, l) && <i className="lang-dot" aria-hidden />}
            </span>
          </button>
        ))}
      </div>

      <div className="post-panes">
        {(['en', 'ta'] as const).map((l) => (
          <section key={l} className={`glass card-pad post-pane ${tab === l ? 'is-active' : ''}`} lang={l}>
            <span className="eyebrow pane-name">{l === 'en' ? 'English' : 'தமிழ்'}</span>
            <input className="field post-title-input" maxLength={200} placeholder={`${t.postTitle} · ${l === 'en' ? 'English' : 'தமிழ்'}`} aria-label={`${t.postTitle} (${l})`} value={draft[`title_${l}`]} onChange={(e) => patch({ [`title_${l}`]: e.target.value })} />
            <div className="fmt-bar" role="toolbar" lang={uiLang}>
              <button type="button" className="fmt-btn" aria-label={t.fmtBold} title={t.fmtBold} onClick={() => format(l, (s) => wrap(s, '**'))}>
                <Bold size={18} strokeWidth={STROKE} />
              </button>
              <button type="button" className="fmt-btn" aria-label={t.fmtItalic} title={t.fmtItalic} onClick={() => format(l, (s) => wrap(s, '*'))}>
                <Italic size={18} strokeWidth={STROKE} />
              </button>
              <button type="button" className="fmt-btn" aria-label={t.fmtList} title={t.fmtList} onClick={() => format(l, (s) => listify(s, false))}>
                <List size={18} strokeWidth={STROKE} />
              </button>
              <button type="button" className="fmt-btn" aria-label={t.fmtNumbers} title={t.fmtNumbers} onClick={() => format(l, (s) => listify(s, true))}>
                <ListOrdered size={18} strokeWidth={STROKE} />
              </button>
              <button type="button" className="fmt-btn" aria-label={t.fmtImage} title={t.fmtImage} onClick={() => setImageFor(l)}>
                <ImagePlus size={18} strokeWidth={STROKE} />
              </button>
            </div>
            <textarea ref={bodies[l]} className="field post-body-input" rows={10} maxLength={20000} placeholder={t.postBody} aria-label={`${t.postBody} (${l})`} value={draft[`body_${l}`]} onChange={(e) => patch({ [`body_${l}`]: e.target.value })} />
          </section>
        ))}
      </div>
      <p className="caption">{t.postFormatHelp}</p>

      <section className="glass group">
        <div className="row">
          <IconTile horse="white" icon={ImageIcon} size={30} />
          <span className="row-label">{t.postCover}</span>
          <div className="row-control cover-control">
            {draft.cover_url && (
              <button className="link danger" onClick={() => patch({ cover_url: null })}>
                {t.postCoverRemove}
              </button>
            )}
            <Pressable className="btn glass small" disabled={coverBusy} onClick={() => coverInput.current?.click()}>
              {coverBusy ? '…' : draft.cover_url ? t.postCoverChange : t.postCoverAdd}
            </Pressable>
            <input
              ref={coverInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                void pickCover(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
        </div>
        {coverBusy && <p className="caption form-msg is-info cover-note">{t.imageUploading}</p>}
        {draft.cover_url && <PostImage url={draft.cover_url} alt="" className="cover-preview" />}

        <div className="row">
          <IconTile horse="pale" icon={BookOpen} size={30} />
          <span className="row-label">{t.postVerse}</span>
          <div className="row-control">
            {pick ? (
              <button className="link danger" onClick={() => setVerse(null)}>
                {t.postVerseRemove}
              </button>
            ) : (
              <Pressable className="btn glass small" onClick={() => setVerse({ book: 'JHN', chapter: 3, from: 16, to: 0 })}>
                {t.postVerseAdd}
              </Pressable>
            )}
          </div>
        </div>
        {pick && (
          <div className="verse-block">
            <VersePicker value={pick} onChange={setVerse} offlineNote={t.postVerseOffline} />
            {verse && <PostVerse verse={verse} />}
          </div>
        )}

        <div className="row">
          <IconTile horse="black" icon={CalendarDays} size={30} />
          <label className="row-label" htmlFor="post-date">
            {t.postDate}
          </label>
          <div className="row-control">
            <input id="post-date" className="field date-field" type="date" value={draft.publish_on} onChange={(e) => patch({ publish_on: e.target.value })} />
          </div>
        </div>
        <p className="caption cover-note">{t.postDateHelp}</p>
      </section>

      {msg && (
        <p className={`form-msg ${msg.ok ? 'is-info' : 'is-error'}`} role="status">
          {msg.text}
        </p>
      )}
      {dirty && !msg && <p className="caption">{t.autosaved}</p>}

      <div className="post-actions">
        <Pressable className="btn glass" onClick={() => setView('preview')}>
          <Eye size={18} strokeWidth={STROKE} /> {t.preview}
        </Pressable>
        {published ? (
          <>
            <Pressable className="btn glass" disabled={busy} onClick={() => void save('draft')}>
              <Undo2 size={18} strokeWidth={STROKE} /> {t.unpublish}
            </Pressable>
            <Pressable className="btn btn-primary" disabled={busy || !dirty} onClick={() => void save('published')}>
              <Send size={18} strokeWidth={STROKE} /> {t.saveChanges}
            </Pressable>
          </>
        ) : (
          <>
            <Pressable className="btn glass" disabled={busy || (!dirty && Boolean(draft.id))} onClick={() => void save('draft')}>
              <Feather size={18} strokeWidth={STROKE} /> {t.saveDraft}
            </Pressable>
            <Pressable className="btn btn-primary" disabled={busy} onClick={() => void save('published')}>
              <Send size={18} strokeWidth={STROKE} /> {t.publish}
            </Pressable>
          </>
        )}
      </div>
      <button className="link danger" onClick={() => setConfirmDelete(true)}>
        <Trash2 size={14} strokeWidth={STROKE} /> {t.deleteThought}
      </button>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} label={t.deleteThought}>
        <div className="mode-intro" lang={uiLang}>
          <div className="mode-intro-title">
            <IconTile horse="red" icon={Trash2} size={30} />
            <h2 className="title">{t.deleteThought}</h2>
          </div>
          <p>{t.deleteThoughtConfirm}</p>
          <Pressable className="btn btn-danger" disabled={busy} onClick={() => void remove()}>
            <Trash2 size={18} strokeWidth={STROKE} /> {t.deleteYes}
          </Pressable>
          <Pressable className="btn glass" onClick={() => setConfirmDelete(false)}>
            {t.cancel}
          </Pressable>
        </div>
      </Sheet>

      <ImageSheet
        open={imageFor !== null}
        onClose={() => setImageFor(null)}
        onInsert={(url, alt) => {
          const lang = imageFor;
          setImageFor(null);
          if (lang) format(lang, (s) => insertBlock(s, `![${alt.replace(/[[\]\n]/g, ' ').trim()}](${url})`));
        }}
      />
    </div>
  );
}

/** Choose a picture (shrunk and uploaded at once), describe it, insert it into the text. */
function ImageSheet({ open, onClose, onInsert }: { open: boolean; onClose: () => void; onInsert: (url: string, alt: string) => void }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<'idle' | 'busy' | 'failed'>('idle');
  const [url, setUrl] = useState<string | null>(null);
  const [alt, setAlt] = useState('');

  useEffect(() => {
    if (open) return;
    // Reset after the sheet has slid away.
    const timer = setTimeout(() => {
      setState('idle');
      setUrl(null);
      setAlt('');
    }, 400);
    return () => clearTimeout(timer);
  }, [open]);

  async function choose(file: File | undefined) {
    if (!file) return;
    setState('busy');
    try {
      setUrl(await uploadPostImage(file));
      setState('idle');
    } catch {
      setState('failed');
    }
  }

  return (
    <Sheet open={open} onClose={onClose} label={t.imageInsertTitle}>
      <div className="add-verse" lang={uiLang}>
        <h2 className="title">{t.imageInsertTitle}</h2>
        {url && <PostImage url={url} alt={alt} className="cover-preview" />}
        <Pressable className="btn glass" disabled={state === 'busy'} onClick={() => input.current?.click()}>
          <ImagePlus size={18} strokeWidth={STROKE} /> {t.imageChoose}
        </Pressable>
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            void choose(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {state === 'busy' && <p className="caption form-msg is-info">{t.imageUploading}</p>}
        {state === 'failed' && <p className="caption form-msg is-error">{t.imageFailed}</p>}
        <input className="field" maxLength={160} placeholder={t.imageAlt} aria-label={t.imageAlt} value={alt} onChange={(e) => setAlt(e.target.value)} />
        <p className="caption">{t.imageAltHelp}</p>
        <Pressable className="btn btn-primary" disabled={!url || !alt.trim()} onClick={() => url && onInsert(url, alt)}>
          <Plus size={18} strokeWidth={STROKE} /> {t.imageInsert}
        </Pressable>
      </div>
    </Sheet>
  );
}

/** Settings → Admin: what an admin can manage (more sections come later). */
export function Admin({ onExit, onThoughts, onFaqs, onTimeline }: { onExit: () => void; onThoughts: () => void; onFaqs: () => void; onTimeline: () => void }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  return (
    <div className="screen recall" lang={uiLang}>
      <header className="recall-head">
        <Pressable className="chip glass" onClick={onExit} aria-label={t.back}>
          <ChevronLeft size={20} strokeWidth={STROKE} />
        </Pressable>
        <h1 className="title grow">{t.admin}</h1>
      </header>
      <Pressable className="install-card glass" onClick={onThoughts}>
        <IconTile horse="pale" icon={Feather} size={38} />
        <div className="grow">
          <strong>{t.adminThoughts}</strong>
          <span className="caption">{t.adminThoughtsSub}</span>
        </div>
        <ChevronRight size={18} strokeWidth={STROKE} />
      </Pressable>
      <Pressable className="install-card glass" onClick={onFaqs}>
        <IconTile horse="white" icon={CircleHelp} size={38} />
        <div className="grow">
          <strong>{t.adminFaqs}</strong>
          <span className="caption">{t.adminFaqsSub}</span>
        </div>
        <ChevronRight size={18} strokeWidth={STROKE} />
      </Pressable>
      <Pressable className="install-card glass" onClick={onTimeline}>
        <IconTile horse="red" icon={History} size={38} />
        <div className="grow">
          <strong>{t.adminTimeline}</strong>
          <span className="caption">{t.adminTimelineSub}</span>
        </div>
        <ChevronRight size={18} strokeWidth={STROKE} />
      </Pressable>
    </div>
  );
}
