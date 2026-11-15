import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Clock, Copy, Share2, Swords, Trash2, UserPlus, Users, X, QrCode, ScanLine, Pencil } from 'lucide-react';
import {
  addFriend,
  allTimeBoard,
  friendsDailyBoard,
  standing,
  type AllTimeRow,
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
import { MyQRSheet, ScanSheet } from '../components/FriendQR';
import { NameForm } from '../components/EditName';
import { levelFromXp } from '../engine/scoring';
import { AvatarPicker } from '../components/AvatarPicker';
import { CartoonAvatar, isCartoonAvatar } from '../art/Avatars';
import { Pressable } from '../components/Pressable';
import { Sheet } from '../components/Sheet';
import { AuthForm } from '../components/AuthForm';
import { HorseHead, IconTile, MODE_ICON, STROKE } from '../components/icons';
import { FriendPage } from './FriendPage';

export { CHALLENGE_MODES } from '../engine/modes';
import { CHALLENGE_MODES } from '../engine/modes';

/** A cartoon avatar, or the original horse-colour tile for older profiles. */
export function Avatar({ horse, size = 36 }: { horse: Friend['avatar']; size?: number }) {
  if (isCartoonAvatar(horse)) return <CartoonAvatar id={horse} size={size} />;
  const colour = (['white', 'red', 'black', 'pale'] as const).find((h) => h === horse) ?? 'pale';
  return <IconTile horse={colour} icon={HorseHead} size={size} />;
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
  const { session, profile, friends, challenges, records, refresh } = useAccount();
  const [picking, setPicking] = useState<Friend | null>(null);
  const [viewing, setViewing] = useState<Friend | null>(null);
  const [tab, setTab] = useState<'friends' | 'challenges' | 'board'>(() => (useAccount.getState().challenges.some(myTurn) ? 'challenges' : 'friends'));
  const [adding, setAdding] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [scanning, setScanning] = useState(false);

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

  const modeSheet = (
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
  );

  if (viewing) {
    return (
      <>
        <FriendPage
          friend={viewing}
          onBack={() => setViewing(null)}
          onChallenge={() => setPicking(viewing)}
          onPlay={(h) =>
            onPlayChallenge({ id: h.challenge_id, mode: h.mode, question_ids: h.question_ids, created_at: h.created_at, expires_at: h.expires_at, created_by: h.created_by, players: [] })
          }
        />
        {modeSheet}
      </>
    );
  }

  const dot = <span className="seg-dot" aria-hidden />;
  return (
    <div className="screen" lang={uiLang}>
      <h1 className="display">{t.friendsTitle}</h1>

      {profile && <MyCard name={profile.display_name} avatar={profile.avatar} />}

      <div className="segmented" role="tablist">
        {(['friends', 'challenges', 'board'] as const).map((v) => (
          <button key={v} role="tab" aria-selected={tab === v} className={tab === v ? 'is-on' : ''} onClick={() => setTab(v)}>
            {tab === v && <motion.span layoutId="seg-friends" className="segmented-thumb" transition={spring.calm} />}
            <span>
              {v === 'friends' ? t.tabFriends : v === 'challenges' ? t.challenges : t.leaderboard}
              {((v === 'friends' && incoming.length > 0) || (v === 'challenges' && turn.length > 0)) && dot}
            </span>
          </button>
        ))}
      </div>

      {tab === 'friends' && (
        <>
          <Pressable className="btn btn-primary" onClick={() => setAdding(true)}>
            <UserPlus size={18} strokeWidth={STROKE} /> {t.addFriend}
          </Pressable>

          {incoming.length > 0 && (
            <section className="glass card-pad">
              <h2 className="eyebrow">{t.requests}</h2>
              {incoming.map((f) => (
                <div className="person" key={f.user_id}>
                  <Avatar horse={f.avatar} size={44} />
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

          <section className="glass card-pad">
            <h2 className="eyebrow">{t.yourFriends}</h2>
            {accepted.length === 0 && <p className="caption">{t.noFriends}</p>}
            {accepted.map((f) => {
              const r = records[f.user_id];
              return (
                <div className="person" key={f.user_id}>
                  <button className="person-open" onClick={() => setViewing(f)} aria-label={f.display_name}>
                    <Avatar horse={f.avatar} size={44} />
                    <div className="grow">
                      <strong>{f.display_name}</strong>
                      <span className="caption">
                        {f.xp ?? 0} XP · {f.streak ?? 0} {t.streak}
                      </span>
                      {r && r.wins + r.losses + r.ties > 0 && <span className={`caption record-line is-${standing(r)}`}>{t.recordLine(r.wins, r.losses, r.ties)}</span>}
                    </div>
                  </button>
                  <Pressable className="btn btn-primary small" onClick={() => setPicking(f)} aria-label={`${t.challenge}: ${f.display_name}`}>
                    <Swords size={16} strokeWidth={STROKE} /> {t.challenge}
                  </Pressable>
                </div>
              );
            })}
          </section>

          {outgoing.length > 0 && (
            <section className="glass card-pad">
              <h2 className="eyebrow">
                {t.sentRequests} ({outgoing.length})
              </h2>
              {outgoing.map((f) => (
                <div className="person" key={f.user_id}>
                  <Avatar horse={f.avatar} size={44} />
                  <div className="grow">
                    <strong>{f.display_name}</strong>
                    <span className="caption">{t.pendingSent}</span>
                  </div>
                  <Pressable className="btn glass small" onClick={() => removeFriend(f.user_id)}>
                    {t.cancel}
                  </Pressable>
                </div>
              ))}
            </section>
          )}
        </>
      )}

      {tab === 'challenges' && (
        <>
          {turn.length > 0 && (
            <section className="glass card-pad">
              <h2 className="eyebrow">{t.yourTurn}</h2>
              {turn.map((c) => (
                <ChallengeRow key={c.id} c={c} action={() => onPlayChallenge(c)} />
              ))}
            </section>
          )}
          {waiting.length > 0 && (
            <section className="glass card-pad">
              <h2 className="eyebrow">{t.waiting}</h2>
              {waiting.map((c) => (
                <ChallengeRow key={c.id} c={c} />
              ))}
            </section>
          )}
          {done.length > 0 && (
            <section className="glass card-pad">
              <h2 className="eyebrow">{t.finished}</h2>
              {done.map((c) => (
                <ChallengeRow key={c.id} c={c} />
              ))}
            </section>
          )}
          {turn.length + waiting.length + done.length === 0 && (
            <section className="glass card-pad">
              <p className="caption empty-note">{t.noChallenges}</p>
            </section>
          )}
        </>
      )}

      {tab === 'board' && <FamilyBoard />}

      {profile && (
        <>
          <Sheet open={adding} onClose={() => setAdding(false)} label={t.addFriend}>
            <div className="add-sheet" lang={uiLang}>
              <h2 className="title">{t.addFriend}</h2>
              <p className="caption">{t.addFriendLead}</p>
              <ShareCode code={profile.friend_code} />
              <div className="qr-actions">
                <Pressable
                  className="btn btn-primary"
                  onClick={() => {
                    setAdding(false);
                    setShowQr(true);
                  }}
                >
                  <QrCode size={18} strokeWidth={STROKE} /> {t.showQr}
                </Pressable>
                <Pressable
                  className="btn btn-primary"
                  onClick={() => {
                    setAdding(false);
                    setScanning(true);
                  }}
                >
                  <ScanLine size={18} strokeWidth={STROKE} /> {t.scan}
                </Pressable>
              </div>
              <AddFriend />
            </div>
          </Sheet>
          <MyQRSheet open={showQr} onClose={() => setShowQr(false)} name={profile.display_name} />
          <ScanSheet open={scanning} onClose={() => setScanning(false)} />
        </>
      )}

      {modeSheet}
    </div>
  );
}

/** You: picture, name and level. Tap the picture or the pencil to change them. */
function MyCard({ name, avatar }: { name: string; avatar: Friend['avatar'] }) {
  const t = useT();
  const xp = useApp((s) => s.xp);
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(false);
  return (
    <section className="glass card-pad my-code">
      <div className="person">
        <button className="avatar-edit" onClick={() => setPicking(true)} aria-label={t.chooseAvatar} title={t.chooseAvatar}>
          <Avatar horse={avatar} size={52} />
          <span className="avatar-edit-badge" aria-hidden>
            <Pencil size={11} strokeWidth={2.4} />
          </span>
        </button>
        <div className="grow">
          <strong>{name}</strong>
          <span className="caption">
            {xp} XP · {t.level} {levelFromXp(xp).level}
          </span>
        </div>
        <Pressable className="chip glass" onClick={() => setEditing(true)} aria-label={t.editName} title={t.editName}>
          <Pencil size={16} strokeWidth={STROKE} />
        </Pressable>
      </div>
      <AvatarPicker open={picking} onClose={() => setPicking(false)} />
      <Sheet open={editing} onClose={() => setEditing(false)} label={t.editName}>
        <h2 className="title">{t.editName}</h2>
        <NameForm autoFocus onSaved={() => setTimeout(() => setEditing(false), 700)} />
      </Sheet>
    </section>
  );
}

/** Your friend code in big letters, with a button to send it. */
function ShareCode({ code }: { code: string }) {
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
    <div className="share-code">
      <span className="caption">{t.yourCode}</span>
      <div className="code-row">
        <span className="friend-code">{code}</span>
        <Pressable className="btn glass small" onClick={share}>
          {copied ? <Check size={16} strokeWidth={STROKE} /> : typeof navigator.share === 'function' ? <Share2 size={16} strokeWidth={STROKE} /> : <Copy size={16} strokeWidth={STROKE} />}
          {t.shareCode}
        </Pressable>
      </div>
    </div>
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
    <form className="add-friend" onSubmit={submit}>
      <span className="caption">{t.orTypeCode}</span>
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
  const [view, setView] = useState<'today' | 'all'>('today');
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [allRows, setAllRows] = useState<AllTimeRow[] | null>(null);
  const dailyDone = useApp((s) => s.dailyDoneOn);
  const challenges = useAccount((s) => s.challenges);
  useEffect(() => {
    friendsDailyBoard().then(setRows).catch(() => setRows([]));
  }, [dailyDone]);
  useEffect(() => {
    if (view === 'all') allTimeBoard().then(setAllRows).catch(() => setAllRows([]));
  }, [view, challenges]);
  if (!rows) return null;
  return (
    <section className="glass card-pad">
      <div className="board-head">
        <h2 className="eyebrow">{t.familyBoard}</h2>
        <div className="segmented small" role="tablist">
          {(['today', 'all'] as const).map((v) => (
            <button key={v} role="tab" aria-selected={view === v} className={view === v ? 'is-on' : ''} onClick={() => setView(v)}>
              {view === v && <motion.span layoutId="seg-board" className="segmented-thumb" transition={spring.calm} />}
              <span>{v === 'today' ? t.today : t.allTime}</span>
            </button>
          ))}
        </div>
      </div>
      {view === 'today' && (
        <>
          {rows.length === 0 && <p className="caption">{t.familyBoardEmpty}</p>}
          {rows.map((r) => (
            <div className={`person board-row ${r.is_me ? 'is-me' : ''}`} key={r.user_id}>
              <span className="board-rank">{r.rank}</span>
              <Avatar horse={r.avatar} size={30} />
              <strong className="grow">{r.display_name}</strong>
              <span className="board-score">{r.score}</span>
            </div>
          ))}
        </>
      )}
      {view === 'all' &&
        (allRows ?? []).map((r) => (
          <div className={`person board-row ${r.is_me ? 'is-me' : ''}`} key={r.user_id}>
            <span className="board-rank">{r.rank}</span>
            <Avatar horse={r.avatar} size={30} />
            <div className="grow">
              <strong>{r.display_name}</strong>
              <span className="caption">
                {r.played} {t.playedShort} · {r.xp} XP
              </span>
            </div>
            <span className="board-score">
              {r.wins} <span className="caption">{t.winsShort}</span>
            </span>
          </div>
        ))}
    </section>
  );
}
