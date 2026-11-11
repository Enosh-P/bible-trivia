import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Clock, Copy, Share2, Swords, Trash2, UserPlus, Users, X } from 'lucide-react';
import {
  addFriend,
  friendsDailyBoard,
  myTurn,
  removeFriend,
  respondToFriend,
  useAccount,
  type BoardRow,
  type Challenge,
  type Friend,
} from '../online/account';
import { supabase } from '../online/supabase';
import { MODES, type ModeId } from '../engine/modes';
import { useApp, useT } from '../store';
import { spring } from '../motion/springs';
import { Pressable } from '../components/Pressable';
import { Sheet } from '../components/Sheet';
import { AuthForm } from '../components/AuthForm';
import { HorseHead, IconTile, MODE_ICON, STROKE } from '../components/icons';

/** Modes that make a fair, fixed-length challenge. */
export const CHALLENGE_MODES: ModeId[] = ['classic', 'truefalse', 'who', 'book', 'blank'];

export function Avatar({ horse, size = 36 }: { horse: Friend['avatar']; size?: number }) {
  return <IconTile horse={horse} icon={HorseHead} size={size} />;
}

export function Friends({
  onStartChallenge,
  onPlayChallenge,
}: {
  onStartChallenge: (mode: ModeId, friendIds: string[]) => void;
  onPlayChallenge: (c: Challenge) => void;
}) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const { session, profile, friends, challenges, refresh } = useAccount();
  const [picking, setPicking] = useState<Friend | null>(null);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!supabase || !session) {
    return (
      <div className="screen" lang={uiLang}>
        <h1 className="display">{t.friendsTitle}</h1>
        <section className="glass card-pad signin-card">
          <IconTile horse="pale" icon={Users} size={44} />
          <h2 className="title">{t.signInTitle}</h2>
          <p className="caption">{t.signInSub}</p>
          <AuthForm />
        </section>
      </div>
    );
  }

  const accepted = friends.filter((f) => f.status === 'accepted');
  const incoming = friends.filter((f) => f.status === 'pending' && f.incoming);
  const outgoing = friends.filter((f) => f.status === 'pending' && !f.incoming);
  const turn = challenges.filter(myTurn);
  const waiting = challenges.filter((c) => !myTurn(c) && c.players.some((p) => !p.finished_at) && new Date(c.expires_at) > new Date());
  const done = challenges.filter((c) => c.players.every((p) => p.finished_at)).slice(0, 8);

  return (
    <div className="screen" lang={uiLang}>
      <h1 className="display">{t.friendsTitle}</h1>

      {profile && <MyCode code={profile.friend_code} name={profile.display_name} avatar={profile.avatar} />}
      <AddFriend />

      {incoming.length > 0 && (
        <section className="glass card-pad">
          <h2 className="eyebrow">{t.requests}</h2>
          {incoming.map((f) => (
            <div className="person" key={f.user_id}>
              <Avatar horse={f.avatar} />
              <strong className="grow">{f.display_name}</strong>
              <Pressable className="btn btn-primary small" onClick={() => respondToFriend(f.user_id, true)}>
                <Check size={16} strokeWidth={STROKE} /> {t.accept}
              </Pressable>
              <Pressable className="chip glass" aria-label={t.decline} onClick={() => respondToFriend(f.user_id, false)}>
                <X size={16} strokeWidth={STROKE} />
              </Pressable>
            </div>
          ))}
        </section>
      )}

      {turn.length > 0 && (
        <section className="glass card-pad">
          <h2 className="eyebrow">{t.yourTurn}</h2>
          {turn.map((c) => (
            <ChallengeRow key={c.id} c={c} action={() => onPlayChallenge(c)} />
          ))}
        </section>
      )}

      <FamilyBoard />

      <section className="glass card-pad">
        <h2 className="eyebrow">{t.yourFriends}</h2>
        {accepted.length === 0 && <p className="caption">{t.noFriends}</p>}
        {accepted.map((f) => (
          <div className="person" key={f.user_id}>
            <Avatar horse={f.avatar} />
            <div className="grow">
              <strong>{f.display_name}</strong>
              <span className="caption">
                {' '}
                · {f.xp ?? 0} XP · {f.streak ?? 0} {t.streak}
              </span>
            </div>
            <Pressable className="btn btn-primary small" onClick={() => setPicking(f)}>
              <Swords size={16} strokeWidth={STROKE} /> {t.challenge}
            </Pressable>
          </div>
        ))}
        {outgoing.map((f) => (
          <div className="person is-pending" key={f.user_id}>
            <Avatar horse={f.avatar} />
            <div className="grow">
              <strong>{f.display_name}</strong>
              <span className="caption"> · {t.pendingSent}</span>
            </div>
            <Pressable className="chip glass" aria-label={t.cancel} onClick={() => removeFriend(f.user_id)}>
              <X size={16} strokeWidth={STROKE} />
            </Pressable>
          </div>
        ))}
      </section>

      {(waiting.length > 0 || done.length > 0) && (
        <section className="glass card-pad">
          <h2 className="eyebrow">{t.challenges}</h2>
          {waiting.map((c) => (
            <ChallengeRow key={c.id} c={c} />
          ))}
          {done.map((c) => (
            <ChallengeRow key={c.id} c={c} />
          ))}
        </section>
      )}

      <Sheet open={!!picking} onClose={() => setPicking(null)} label={t.chooseMode}>
        <h2 className="title">
          {t.challenge}: {picking?.display_name}
        </h2>
        <p className="caption">{t.chooseMode}</p>
        <div className="mode-pick">
          {CHALLENGE_MODES.map((m) => (
            <Pressable
              key={m}
              className={`mode-pick-item glass horse-${MODES[m].horse}`}
              onClick={() => {
                const f = picking!;
                setPicking(null);
                onStartChallenge(m, [f.user_id]);
              }}
            >
              <IconTile horse={MODES[m].horse} icon={MODE_ICON[m]} size={32} />
              <span>{t.modeName[m]}</span>
            </Pressable>
          ))}
        </div>
        {picking && (
          <button
            className="link danger"
            onClick={() => {
              void removeFriend(picking.user_id);
              setPicking(null);
            }}
          >
            <Trash2 size={14} strokeWidth={STROKE} /> {t.removeFriend}
          </button>
        )}
      </Sheet>
    </div>
  );
}

function MyCode({ code, name, avatar }: { code: string; name: string; avatar: Friend['avatar'] }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  async function share() {
    const text = `${t.shareCodeText} ${code}\n${location.origin}`;
    try {
      if (typeof navigator.share === 'function') await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      /* cancelled */
    }
  }
  return (
    <section className="glass card-pad my-code">
      <div className="person">
        <Avatar horse={avatar} size={44} />
        <div className="grow">
          <strong>{name}</strong>
          <span className="caption">{t.yourCode}</span>
        </div>
      </div>
      <div className="code-row">
        <span className="friend-code" aria-label={t.yourCode}>
          {code}
        </span>
        <Pressable className="btn glass small" onClick={share}>
          {copied ? <Check size={16} strokeWidth={STROKE} /> : typeof navigator.share === 'function' ? <Share2 size={16} strokeWidth={STROKE} /> : <Copy size={16} strokeWidth={STROKE} />}
          {t.shareCode}
        </Pressable>
      </div>
    </section>
  );
}

function AddFriend() {
  const t = useT();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().length < 6) return;
    setBusy(true);
    try {
      const r = await addFriend(code);
      setMsg(t.friendResult[r]);
      if (r === 'sent' || r === 'accepted') setCode('');
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="glass card-pad add-friend" onSubmit={submit}>
      <h2 className="eyebrow">{t.addFriend}</h2>
      <div className="code-row">
        <input
          className="field code-input"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 6))}
          placeholder={t.addFriendHint}
          aria-label={t.addFriendHint}
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
        />
        <Pressable className="btn btn-primary small" type="submit" disabled={busy || code.length < 6}>
          <UserPlus size={16} strokeWidth={STROKE} /> {t.add}
        </Pressable>
      </div>
      <AnimatePresence>
        {msg && (
          <motion.p className="caption" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring.snappy}>
            {msg}
          </motion.p>
        )}
      </AnimatePresence>
    </form>
  );
}

function ChallengeRow({ c, action }: { c: Challenge; action?: () => void }) {
  const t = useT();
  const me = c.players.find((p) => p.me);
  const others = c.players.filter((p) => !p.me);
  const allDone = c.players.every((p) => p.finished_at);
  let verdict = '';
  if (allDone && me) {
    const best = Math.max(...others.map((o) => o.score ?? 0));
    verdict = (me.score ?? 0) > best ? t.won : (me.score ?? 0) === best ? t.tie : t.lost;
  }
  return (
    <div className="person challenge-row">
      <IconTile horse={MODES[c.mode]?.horse ?? 'white'} icon={MODE_ICON[c.mode] ?? Swords} size={36} />
      <div className="grow">
        <strong>
          {t.modeName[c.mode] ?? c.mode} · {t.vs} {others.map((o) => o.name).join(', ')}
        </strong>
        <div className="caption scores">
          {c.players.map((p) => (
            <span key={p.user_id} className={p.me ? 'is-me' : ''}>
              {p.name}: {p.finished_at ? p.score : <Clock size={12} strokeWidth={STROKE} />}
            </span>
          ))}
          {verdict && <span className="verdict">{verdict}</span>}
        </div>
      </div>
      {action && (
        <Pressable className="btn btn-primary small" onClick={action}>
          {t.play}
        </Pressable>
      )}
    </div>
  );
}

function FamilyBoard() {
  const t = useT();
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const dailyDone = useApp((s) => s.dailyDoneOn);
  useEffect(() => {
    friendsDailyBoard().then(setRows).catch(() => setRows([]));
  }, [dailyDone]);
  if (!rows) return null;
  return (
    <section className="glass card-pad">
      <h2 className="eyebrow">{t.familyBoard}</h2>
      {rows.length === 0 && <p className="caption">{t.familyBoardEmpty}</p>}
      {rows.map((r) => (
        <div className={`person board-row ${r.is_me ? 'is-me' : ''}`} key={r.user_id}>
          <span className="board-rank">{r.rank}</span>
          <Avatar horse={r.avatar} size={30} />
          <strong className="grow">{r.display_name}</strong>
          <span className="board-score">{r.score}</span>
        </div>
      ))}
    </section>
  );
}
