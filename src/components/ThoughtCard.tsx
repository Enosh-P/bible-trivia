import { motion } from 'motion/react';
import { ChevronRight, Feather } from 'lucide-react';
import { dayKey } from '../engine/picker';
import { excerpt } from '../engine/markdown';
import { postSections, type Post } from '../engine/posts';
import { usePosts } from '../online/posts';
import { useApp, useT } from '../store';
import { spring } from '../motion/springs';
import { IconTile, STROKE } from './icons';
import { Pressable } from './Pressable';
import { PostImage } from './Markdown';
import { postDate } from './PostView';

const NONE: string[] = [];

/**
 * Home: the newest Daily Thought (title, first lines, small cover) until it has
 * been opened; after that just a quiet link to the earlier ones.
 */
export function ThoughtCard({ onOpen, onShowAll }: { onOpen: (p: Post) => void; onShowAll: () => void }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const qLang = useApp((s) => s.qLang);
  const read = useApp((s) => s.readPosts ?? NONE);
  const latest = usePosts((s) => s.posts[0]);
  if (!latest) return null;

  if (read.includes(latest.id)) {
    return (
      <button className="link thought-more" onClick={onShowAll}>
        <Feather size={15} strokeWidth={STROKE} /> {t.thoughtsEarlier}
        <ChevronRight size={16} strokeWidth={STROKE} />
      </button>
    );
  }

  // In "both": the Tamil title (purple), then the English one; the first lines in the first language.
  const sections = postSections(latest, qLang);
  const titles = sections.filter((x) => x.title);
  const lead = sections.find((x) => x.body);
  const both = sections.length > 1;
  const today = latest.publish_on === dayKey();
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring.calm}>
      <Pressable className="thought-card glass" onClick={() => onOpen(latest)}>
        <div className="thought-card-head">
          <IconTile horse="pale" icon={Feather} size={34} />
          <span className="eyebrow">{today ? t.thoughtToday : `${t.thoughtDaily} · ${postDate(latest.publish_on, uiLang, 'short')}`}</span>
        </div>
        <div className="thought-card-body">
          <div className="grow">
            {titles.map((x, i) => (
              <h2 key={x.lang} className={`title ${i ? 'is-second' : ''} ${both && x.lang === 'ta' ? 'is-ta-both' : ''}`} lang={x.lang}>
                {x.title}
              </h2>
            ))}
            {lead && (
              <p className="caption thought-excerpt" lang={lead.lang}>
                {excerpt(lead.body, 160)}
              </p>
            )}
            <span className="daily-go" lang={uiLang}>
              {t.thoughtRead}
              <ChevronRight size={18} strokeWidth={STROKE} />
            </span>
          </div>
          {latest.cover_url && <PostImage url={latest.cover_url} alt="" className="thought-thumb" />}
        </div>
      </Pressable>
    </motion.div>
  );
}
