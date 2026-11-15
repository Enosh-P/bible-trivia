import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { excerpt } from '../engine/markdown';
import { postSummary, type Post } from '../engine/posts';
import { findPosts, usePosts } from '../online/posts';
import { postTarget } from '../online/reports';
import { markPostRead, useApp, useT } from '../store';
import { Pressable } from '../components/Pressable';
import { STROKE } from '../components/icons';
import { LangToggle } from '../components/LangToggle';
import { PostImage } from '../components/Markdown';
import { PostView, postDate } from '../components/PostView';
import { ReportButton } from '../components/Report';

const NONE: string[] = [];

/** One Daily Thought, full screen. Opening it marks it as read. */
export function Thought({ post, onExit, onShowAll }: { post: Post; onExit: () => void; onShowAll?: () => void }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  // A newer copy may have arrived (the author fixed a typo).
  const fresh = usePosts((s) => s.posts.find((p) => p.id === post.id)) ?? post;
  useEffect(() => markPostRead(post.id), [post.id]);

  return (
    <div className="screen recall thought-screen" lang={uiLang}>
      <header className="recall-head">
        <Pressable className="chip glass" onClick={onExit} aria-label={t.back}>
          <ChevronLeft size={20} strokeWidth={STROKE} />
        </Pressable>
        <p className="eyebrow grow">{t.thoughtDaily}</p>
        <LangToggle compact />
        <ReportButton target={postTarget(fresh)} />
      </header>
      <PostView post={fresh} />
      {onShowAll && (
        <Pressable className="btn glass" onClick={onShowAll}>
          {t.thoughtsEarlier}
          <ChevronRight size={18} strokeWidth={STROKE} />
        </Pressable>
      )}
    </div>
  );
}

/** Earlier thoughts: newest first, with a word search. */
export function Thoughts({ onExit, onOpen }: { onExit: () => void; onOpen: (p: Post) => void }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const qLang = useApp((s) => s.qLang);
  const read = useApp((s) => s.readPosts ?? NONE);
  const cached = usePosts((s) => s.posts);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<{ query: string; posts: Post[]; offline: boolean } | null>(null);

  // The saved posts show at once; the full list (or the search) follows from the server.
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(
      () => {
        void findPosts(query).then((r) => alive && setFound({ query, ...r }));
      },
      query ? 350 : 0,
    );
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query, cached]);

  const offline = found?.offline ?? false;
  const posts = found && found.query === query ? found.posts : query ? null : cached;

  return (
    <div className="screen recall" lang={uiLang}>
      <header className="recall-head">
        <Pressable className="chip glass" onClick={onExit} aria-label={t.back}>
          <ChevronLeft size={20} strokeWidth={STROKE} />
        </Pressable>
        <div className="grow">
          <p className="eyebrow">{t.thoughtDaily}</p>
          <h1 className="title">{t.thoughtsEarlier}</h1>
        </div>
        <LangToggle compact />
      </header>

      <label className="search-field">
        <Search size={18} strokeWidth={STROKE} aria-hidden />
        <input className="field" type="search" enterKeyHint="search" placeholder={t.thoughtsSearch} aria-label={t.thoughtsSearch} value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      {offline && typeof navigator !== 'undefined' && !navigator.onLine && <p className="caption form-msg is-info">{t.thoughtsOffline}</p>}

      <div className="memory-list" aria-busy={posts === null}>
        {posts?.map((p) => {
          const s = postSummary(p, qLang, uiLang);
          return (
            <Pressable key={p.id} className="thought-item glass" onClick={() => onOpen(p)}>
              <div className="grow" lang={s.lang}>
                <span className="eyebrow" lang={uiLang}>
                  {postDate(p.publish_on, uiLang, 'short')}
                  {!read.includes(p.id) && <span className="tag-new">{t.thoughtNew}</span>}
                </span>
                <strong>{s.title || t.postUntitled}</strong>
                {s.body && <span className="caption thought-excerpt">{excerpt(s.body, 120)}</span>}
              </div>
              {p.cover_url && <PostImage url={p.cover_url} alt="" className="thought-thumb is-small" />}
            </Pressable>
          );
        })}
        {posts?.length === 0 && <p className="caption empty-note">{query.trim() ? t.thoughtsNoMatch : t.thoughtsEmpty}</p>}
      </div>
    </div>
  );
}
