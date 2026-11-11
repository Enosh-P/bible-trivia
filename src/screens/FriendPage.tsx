import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Clock, Swords, Trash2, Trophy } from 'lucide-react';
import { friendHistory, removeFriend, standing, useAccount, type Friend, type HistoryRow } from '../online/account';
import { MODES } from '../engine/modes';
import { useApp, useT } from '../store';
import { spring } from '../motion/springs';
import { Pressable } from '../components/Pressable';
import { IconTile, MODE_ICON, STROKE } from '../components/icons';
import { Avatar } from './Friends';

/** One friend: all-time record, best scores, and every challenge you shared. */
export function FriendPage({
  friend,
  onBack,
  onChallenge,
  onPlay,
}: {
  friend: Friend;
  onBack: () => void;
  onChallenge: () => void;
  onPlay: (row: HistoryRow) => void;
}) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const record = useAccount((s) => s.records[friend.user_id]);
  const [rows, setRows] = useState<HistoryRow[] | null>(null);

  useEffect(() => {
    friendHistory(friend.user_id).then(setRows).catch(() => setRows([]));
  }, [friend.user_id]);

  const r = record ?? { wins: 0, losses: 0, ties: 0 };
  const s = standing(record);
  const finished = (rows ?? []).filter((h) => h.my_finished_at && h.their_finished_at);
  const myBest = Math.max(0, ...finished.map((h) => h.my_score ?? 0));
  const theirBest = Math.max(0, ...finished.map((h) => h.their_score ?? 0));
  const date = (iso: string) => new Date(iso).toLocaleDateString(uiLang === 'ta' ? 'ta-IN' : undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="screen" lang={uiLang}>
      <header className="recall-head">
        <Pressable className="chip glass" onClick={onBack} aria-label={t.back}>
          <ChevronLeft size={20} strokeWidth={STROKE} />
        </Pressable>
        <Avatar horse={friend.avatar} size={44} />
        <div className="grow">
          <h1 className="title">{friend.display_name}</h1>
          <span className="caption">
            {friend.xp ?? 0} XP · {friend.streak ?? 0} {t.streak}
          </span>
        </div>
      </header>

      <motion.section className="glass card-pad record-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring.calm}>
        <span className="eyebrow">{t.record}</span>
        <div className="record-big" aria-label={`${t.recordWLT}: ${r.wins}, ${r.losses}, ${r.ties}`}>
          <span className="w">{r.wins}</span>–<span className="l">{r.losses}</span>–<span className="t">{r.ties}</span>
        </div>
        <span className="caption">{t.recordWLT}</span>
        <span className={`standing is-${s}`}>{s === 'new' ? t.noRecord : s === 'ahead' ? t.ahead : s === 'behind' ? t.behind : t.even}</span>
        <Pressable className="btn btn-primary" onClick={onChallenge}>
          <Swords size={18} strokeWidth={STROKE} /> {t.challenge}
        </Pressable>
      </motion.section>

      {finished.length > 0 && (
        <section className="glass card-pad">
          <h2 className="eyebrow">{t.bestScores}</h2>
          <div className="best-row">
            <div>
              <IconTile horse="pale" icon={Trophy} size={30} />
              <strong>{myBest}</strong>
              <span className="caption">{t.you}</span>
            </div>
            <div>
              <IconTile horse="red" icon={Trophy} size={30} />
              <strong>{theirBest}</strong>
              <span className="caption">{friend.display_name}</span>
            </div>
          </div>
        </section>
      )}

      <section className="glass card-pad">
        <h2 className="eyebrow">{t.history}</h2>
        {rows && rows.length === 0 && <p className="caption">{t.noHistory}</p>}
        {(rows ?? []).map((h) => {
          const done = Boolean(h.my_finished_at && h.their_finished_at);
          const expired = !done && new Date(h.expires_at) < new Date();
          const result = done ? ((h.my_score ?? 0) > (h.their_score ?? 0) ? 'win' : (h.my_score ?? 0) < (h.their_score ?? 0) ? 'loss' : 'tie') : null;
          const myTurn = !h.my_finished_at && !expired;
          return (
            <div className="person history-row" key={h.challenge_id}>
              <IconTile horse={MODES[h.mode]?.horse ?? 'white'} icon={MODE_ICON[h.mode] ?? Swords} size={32} />
              <div className="grow">
                <strong>
                  {t.modeName[h.mode] ?? h.mode}
                  {h.players > 2 && <span className="caption"> · {h.players}</span>}
                </strong>
                <span className="caption">{date(h.created_at)}</span>
              </div>
              <div className="history-score">
                <span className={result ? `is-${result}` : ''}>{h.my_finished_at ? h.my_score : <Clock size={14} strokeWidth={STROKE} />}</span>
                <span className="caption"> : </span>
                <span>{h.their_finished_at ? h.their_score : expired ? t.expired : <Clock size={14} strokeWidth={STROKE} />}</span>
              </div>
              {myTurn && (
                <Pressable className="btn btn-primary small" onClick={() => onPlay(h)}>
                  {t.play}
                </Pressable>
              )}
            </div>
          );
        })}
      </section>

      <button
        className="link danger"
        onClick={async () => {
          await removeFriend(friend.user_id);
          onBack();
        }}
      >
        <Trash2 size={14} strokeWidth={STROKE} /> {t.removeFriend}
      </button>
    </div>
  );
}
