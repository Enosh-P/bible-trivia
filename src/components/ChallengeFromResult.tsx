import { useState } from 'react';
import { Check, Swords } from 'lucide-react';
import { createChallenge, submitChallenge, useAccount } from '../online/account';
import { CHALLENGE_MODES, Avatar } from '../screens/Friends';
import type { RoundResult } from '../screens/Game';
import { useT } from '../store';
import { Pressable } from './Pressable';
import { Sheet } from './Sheet';
import { STROKE } from './icons';

/** After a round: send the same questions to friends; your score counts already. */
export function ChallengeFromResult({ result }: { result: RoundResult }) {
  const t = useT();
  const { session, friends } = useAccount();
  const accepted = friends.filter((f) => f.status === 'accepted');
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');

  if (!session || result.challengeId || !CHALLENGE_MODES.includes(result.mode) || !accepted.length) return null;

  async function send() {
    setState('sending');
    try {
      const id = await createChallenge(result.mode, result.log.map((l) => l.q.id), picked);
      await submitChallenge(id, result.score, result.correct, result.total);
      setState('sent');
      setTimeout(() => setOpen(false), 900);
    } catch (e) {
      alert((e as Error).message);
      setState('idle');
    }
  }

  return (
    <>
      <Pressable className="btn glass" onClick={() => setOpen(true)} disabled={state === 'sent'}>
        {state === 'sent' ? <Check size={18} strokeWidth={STROKE} /> : <Swords size={18} strokeWidth={STROKE} />} {t.challengeFriends}
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} label={t.chooseFriends}>
        <h2 className="title">{t.chooseFriends}</h2>
        <div className="pick-friends">
          {accepted.map((f) => {
            const on = picked.includes(f.user_id);
            return (
              <button
                key={f.user_id}
                className={`person pick-friend ${on ? 'is-on' : ''}`}
                role="checkbox"
                aria-checked={on}
                onClick={() => setPicked(on ? picked.filter((x) => x !== f.user_id) : [...picked, f.user_id].slice(0, 10))}
              >
                <Avatar horse={f.avatar} />
                <strong className="grow">{f.display_name}</strong>
                <span className="pick-box">{on && <Check size={16} strokeWidth={2} />}</span>
              </button>
            );
          })}
        </div>
        <Pressable className="btn btn-primary" disabled={!picked.length || state !== 'idle'} onClick={send}>
          {state === 'sent' ? <Check size={18} strokeWidth={STROKE} /> : <Swords size={18} strokeWidth={STROKE} />} {state === 'sent' ? t.challengeSent : t.send}
        </Pressable>
      </Sheet>
    </>
  );
}
