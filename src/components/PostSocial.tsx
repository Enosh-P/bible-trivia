import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Heart, MessageCircle, Send, Trash2 } from 'lucide-react';
import { addComment, deleteComment, getLikes, listComments, setLiked, type PostComment } from '../online/postSocial';
import { useAccount } from '../online/account';
import { commentTarget } from '../online/reports';
import { useApp, useT } from '../store';
import { spring } from '../motion/springs';
import { cue } from '../feedback';
import { Pressable } from './Pressable';
import { STROKE } from './icons';
import { ReportButton } from './Report';
import { Avatar } from '../screens/Friends';
import type { Friend } from '../online/account';

const MAX = 1000;

/** Under a Daily Thought: ♥ like with a count, and the comments. */
export function PostSocial({ postId }: { postId: string }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const isAdmin = useAccount((s) => Boolean(s.profile?.is_admin));
  const [likes, setLikes] = useState<{ count: number; mine: boolean } | null>(null);
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const load = () => {
    void getLikes(postId).then((l) => l && setLikes(l));
    void listComments(postId).then((c) => {
      if (c) setComments(c);
      else setFailed(true);
    });
  };
  useEffect(load, [postId]);

  async function toggleLike() {
    if (!likes) return;
    const next = !likes.mine;
    setLikes({ count: likes.count + (next ? 1 : -1), mine: next });
    if (next) cue('correct');
    try {
      await setLiked(postId, next);
    } catch {
      setLikes(likes);
    }
  }

  async function send() {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      await addComment(postId, body);
      setText('');
      setComments(await listComments(postId));
    } catch (e) {
      setMsg(/too many/.test((e as Error).message) ? t.commentTooMany : t.commentFailed);
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: PostComment) {
    if (!confirm(t.commentDeleteConfirm)) return;
    try {
      await deleteComment(c.id);
      setComments((cs) => cs?.filter((x) => x.id !== c.id) ?? null);
    } catch {
      setMsg(t.commentFailed);
    }
  }

  // Offline (or before the database is set up): say so quietly.
  if (failed && !likes) return <p className="caption post-social-off">{t.commentsOffline}</p>;

  const when = (iso: string) =>
    new Date(iso).toLocaleString(uiLang === 'ta' ? 'ta-IN' : undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

  return (
    <section className="post-social">
      <div className="post-social-bar">
        <button className={`like-btn glass ${likes?.mine ? 'is-on' : ''}`} onClick={() => void toggleLike()} aria-pressed={likes?.mine ?? false} disabled={!likes}>
          <motion.span key={String(likes?.mine)} initial={{ scale: likes?.mine ? 0.5 : 1 }} animate={{ scale: 1 }} transition={spring.flick} style={{ display: 'inline-flex' }}>
            <Heart size={20} strokeWidth={STROKE} fill={likes?.mine ? 'currentColor' : 'none'} />
          </motion.span>
          <span>{likes ? t.likesN(likes.count) : t.like}</span>
        </button>
        <span className="caption comment-count">
          <MessageCircle size={16} strokeWidth={STROKE} /> {t.commentsN(comments?.length ?? 0)}
        </span>
      </div>

      <div className="comments">
        {comments?.map((c) => (
          <div key={c.id} className="comment glass">
            <Avatar horse={c.avatar as Friend['avatar']} size={32} />
            <div className="grow">
              <div className="comment-head">
                <strong>{c.display_name}</strong>
                <span className="caption">{when(c.created_at)}</span>
              </div>
              <p className="comment-body">{c.body}</p>
            </div>
            <div className="comment-actions">
              {(c.mine || isAdmin) && (
                <button className="icon-btn" aria-label={t.commentDelete} title={t.commentDelete} onClick={() => void remove(c)}>
                  <Trash2 size={15} strokeWidth={STROKE} />
                </button>
              )}
              {!c.mine && <ReportButton target={commentTarget(c)} compact />}
            </div>
          </div>
        ))}
      </div>

      <div className="comment-new glass">
        <textarea
          className="field"
          rows={2}
          maxLength={MAX}
          placeholder={t.commentPlaceholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label={t.commentPlaceholder}
        />
        <div className="comment-send">
          <span className="caption">{text.length > MAX - 100 ? `${text.length}/${MAX}` : ''}</span>
          <Pressable className="btn btn-primary small" disabled={!text.trim() || busy} onClick={() => void send()}>
            <Send size={16} strokeWidth={STROKE} /> {t.commentSend}
          </Pressable>
        </div>
      </div>
      {msg && <p className="caption form-msg is-error">{msg}</p>}
    </section>
  );
}
