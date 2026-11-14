import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { loadSnapshots, type GameSnapshot } from '../engine/resume';
import { useApp, useT } from '../store';
import { Pressable } from '../components/Pressable';
import { STROKE } from '../components/icons';
import { SavedGameRow } from './Home';

/** Every unfinished game, newest first. */
export function SavedGames({ onBack, onResume }: { onBack: () => void; onResume: (s: GameSnapshot) => void }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const [games, setGames] = useState(() => loadSnapshots());
  return (
    <div className="screen" lang={uiLang}>
      <header className="recall-head">
        <Pressable className="chip glass" onClick={onBack} aria-label={t.back}>
          <ChevronLeft size={20} strokeWidth={STROKE} />
        </Pressable>
        <div className="grow">
          <h1 className="title">{t.unfinishedGames}</h1>
        </div>
      </header>
      {games.length === 0 && <p className="caption">{t.noUnfinishedGames}</p>}
      <div className="saved-games">
        <AnimatePresence initial={false}>
          {games.map((g) => (
            <SavedGameRow key={g.id} game={g} onResume={onResume} onDiscard={() => setGames(loadSnapshots())} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
