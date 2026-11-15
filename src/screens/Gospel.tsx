import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Baby,
  BookMarked,
  ChevronDown,
  CircleHelp,
  Compass,
  Cross,
  DoorOpen,
  Footprints,
  Globe,
  Hand,
  HeartHandshake,
  Search,
  Unlink,
  type LucideIcon,
} from 'lucide-react';
import { GOSPEL_STEPS, SOURCE_BY_ID } from '../engine/gospel';
import { FAQ_TOPICS, faqMatches, faqText, type FaqTopic, type GospelFaq } from '../engine/faqs';
import { syncFaqs, useFaqs } from '../online/faqs';
import { Markdown } from '../components/Markdown';
import { PostVerse } from '../components/PostView';
import { parseVerseRef } from '../engine/verseRef';
import { VERSES } from '../engine/verses';
import { useApp, useT } from '../store';
import { spring } from '../motion/springs';
import { IconTile, STROKE } from '../components/icons';
import { VerseText } from '../components/VerseCard';
import type { Lang } from '../engine/types';
import { ReportButton } from '../components/Report';
import { faqTarget } from '../online/reports';
import { Thoughts } from './Thoughts';
import type { Post } from '../engine/posts';

const ICONS: Record<string, LucideIcon> = {
  compass: Compass,
  globe: Globe,
  hand: Hand,
  unlink: Unlink,
  baby: Baby,
  cross: Cross,
  door: DoorOpen,
  'heart-handshake': HeartHandshake,
};

const VERSE_BY_ID = Object.fromEntries(VERSES.map((v) => [v.id, v]));

export type GospelSection = 'way' | 'faq' | 'thoughts';

/** Gospel tab: "The Way of Life" step by step, and answers to common questions. */
export function Gospel({
  section = 'way',
  onSection,
  onOpenPost,
}: {
  section?: GospelSection;
  onSection?: (s: GospelSection) => void;
  onOpenPost?: (p: Post) => void;
}) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const [own, setOwn] = useState<GospelSection>(section);
  const current = onSection ? section : own;
  const setSection = onSection ?? setOwn;

  return (
    <div className="screen" lang={uiLang}>
      <h1 className="display">{t.gospelTitle}</h1>
      <p className="caption">{t.gospelIntro}</p>

      <div className="segmented" role="tablist">
        {(onOpenPost ? (['way', 'faq', 'thoughts'] as const) : (['way', 'faq'] as const)).map((s) => (
          <button key={s} role="tab" aria-selected={current === s} className={current === s ? 'is-on' : ''} onClick={() => setSection(s)}>
            {current === s && <motion.span layoutId="seg-gospel" className="segmented-thumb" transition={spring.calm} />}
            <span>{s === 'way' ? t.wayOfLife : s === 'faq' ? t.faqTitle : t.thoughtsTab}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={current}
          initial={{ opacity: 0, x: current === 'way' ? -16 : 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: current === 'way' ? -16 : 16 }}
          transition={spring.calm}
          className="gospel-list"
        >
          {current === 'way' ? <Way lang={uiLang} /> : current === 'faq' ? <Questions lang={uiLang} /> : <Thoughts embedded onOpen={(p) => onOpenPost?.(p)} />}
        </motion.div>
      </AnimatePresence>

      {current !== 'thoughts' && (
        <p className="caption credit">
          <BookMarked size={14} strokeWidth={STROKE} /> {t.gospelCredit}
        </p>
      )}
    </div>
  );
}

function Way({ lang }: { lang: Lang }) {
  const t = useT();
  return (
    <ol className="steps">
      {GOSPEL_STEPS.map((step, i) => (
        <motion.li
          key={step.id}
          className="step glass"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring.calm, delay: i * 0.04 }}
        >
          <div className="step-head">
            <IconTile horse={step.horse} icon={ICONS[step.icon] ?? Footprints} size={40} />
            <div className="grow">
              <span className="eyebrow">
                {t.step} {i + 1}
              </span>
              <h2 className="title" lang={lang}>
                {step.title[lang]}
              </h2>
            </div>
          </div>
          <p className="step-body" lang={lang}>
            {step.body[lang]}
          </p>
          {step.prayer && (
            <p className="prayer verse" lang={lang}>
              {step.prayer[lang]}
            </p>
          )}
          {step.verses.map((id) => VERSE_BY_ID[id] && <VerseText key={id} verse={VERSE_BY_ID[id]} size="sm" />)}
          {step.next && (
            <p className="caption" lang={lang}>
              {step.next[lang]}
            </p>
          )}
        </motion.li>
      ))}
    </ol>
  );
}

function Questions({ lang }: { lang: Lang }) {
  const t = useT();
  const faqs = useFaqs((st) => st.faqs);
  const [topic, setTopic] = useState<FaqTopic | 'all'>('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    void syncFaqs();
  }, []);
  const topics = FAQ_TOPICS.filter((tp) => faqs.some((f) => f.topic === tp));
  const shown = faqs.filter((f) => (topic === 'all' || f.topic === topic) && faqMatches(f, query));
  const first = shown[0]?.id ?? null;
  return (
    <div className="faqs">
      <label className="search-field">
        <Search size={18} strokeWidth={STROKE} aria-hidden />
        <input className="field" type="search" enterKeyHint="search" placeholder={t.faqSearch} aria-label={t.faqSearch} value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      {topics.length > 1 && (
        <div className="topic-chips" role="tablist" aria-label={t.faqTopicLabel}>
          {(['all', ...topics] as const).map((tp) => (
            <button key={tp} role="tab" aria-selected={topic === tp} className={`topic-chip ${topic === tp ? 'is-on' : ''}`} onClick={() => setTopic(tp)}>
              {tp === 'all' ? t.faqAll : t.faqTopic[tp]}
            </button>
          ))}
        </div>
      )}
      {shown.map((f) => {
        const isOpen = open === f.id || (open === null && f.id === first && !query);
        return <FaqItem key={f.id} faq={f} lang={lang} open={isOpen} onToggle={() => setOpen(isOpen ? '' : f.id)} />;
      })}
      {!shown.length && <p className="caption empty-note">{t.faqNone}</p>}
    </div>
  );
}

/** One question with its answer, verses and further reading (also the admin's preview). */
export function FaqItem({ faq, lang, open, onToggle, preview = false }: { faq: GospelFaq; lang: Lang; open: boolean; onToggle: () => void; preview?: boolean }) {
  const t = useT();
  const text = faqText(faq, lang);
  return (
    <motion.div layout transition={spring.calm} className={`faq glass ${open ? 'is-open' : ''}`}>
      <button className="faq-q" onClick={onToggle} aria-expanded={open}>
        <IconTile horse={open ? 'pale' : 'white'} icon={CircleHelp} size={34} />
        <span className="grow" lang={text.qLang}>
          {text.q}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={spring.snappy} className="faq-chevron">
          <ChevronDown size={20} strokeWidth={STROKE} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="faq-a"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring.calm}
          >
            <div className="faq-a-inner">
              <div className="faq-a-head">
                <div className="grow">
                  <Markdown text={text.a} lang={text.aLang} />
                </div>
                {!preview && <ReportButton target={faqTarget(faq)} compact />}
              </div>
              {faq.verse_refs.map((ref) => {
                const v = parseVerseRef(ref);
                return v ? <PostVerse key={ref} verse={v} /> : null;
              })}
              {faq.reading.length > 0 && (
                <div className="reading">
                  <span className="eyebrow">{t.furtherReading}</span>
                  <ul>
                    {faq.reading.map((id) => {
                      const s = SOURCE_BY_ID[id];
                      return s ? (
                        <li key={id}>
                          <em>{s.title}</em> — <span lang={lang}>{s.author[lang]}</span>
                        </li>
                      ) : null;
                    })}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
