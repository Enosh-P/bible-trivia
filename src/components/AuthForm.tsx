import { useState } from 'react';
import { LogIn, UserPlus } from 'lucide-react';
import { resetPassword, signIn, signUp } from '../online/account';
import { supabase } from '../online/supabase';
import { useT } from '../store';
import { Pressable } from './Pressable';
import { STROKE } from './icons';

/** Email + password sign in / create account. */
export function AuthForm({ onDone }: { onDone?: () => void }) {
  const t = useT();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);

  if (!supabase) return <p className="caption">{t.accountOffline}</p>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === 'signup') {
        const { needsConfirmation } = await signUp(email.trim(), password, name || email.split('@')[0]);
        if (needsConfirmation) {
          setMessage({ kind: 'info', text: t.confirmEmail });
          setMode('signin');
        } else onDone?.();
      } else {
        await signIn(email.trim(), password);
        onDone?.();
      }
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    if (!email.trim()) return setMessage({ kind: 'error', text: t.email });
    try {
      await resetPassword(email.trim());
      setMessage({ kind: 'info', text: t.resetSent });
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      {mode === 'signup' && (
        <input className="field" type="text" autoComplete="nickname" maxLength={32} placeholder={t.yourName} value={name} onChange={(e) => setName(e.target.value)} required />
      )}
      <input className="field" type="email" autoComplete="email" inputMode="email" placeholder={t.email} value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input
        className="field"
        type="password"
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        minLength={6}
        placeholder={t.password}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {message && <p className={`caption form-msg is-${message.kind}`}>{message.text}</p>}
      <Pressable className="btn btn-primary" type="submit" disabled={busy}>
        {mode === 'signup' ? <UserPlus size={18} strokeWidth={STROKE} /> : <LogIn size={18} strokeWidth={STROKE} />}
        {mode === 'signup' ? t.signUp : t.signIn}
      </Pressable>
      <div className="auth-links">
        <button type="button" className="link" onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
          {mode === 'signup' ? t.haveAccount : t.noAccount}
        </button>
        {mode === 'signin' && (
          <button type="button" className="link" onClick={forgot}>
            {t.forgotPassword}
          </button>
        )}
      </div>
    </form>
  );
}
