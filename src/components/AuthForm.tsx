import { useState } from 'react';
import { LogIn, UserPlus } from 'lucide-react';
import { resetPassword, signIn, signInWithGoogle, signUp } from '../online/account';
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

  async function google() {
    setMessage(null);
    try {
      await signInWithGoogle(); // the page goes to Google and comes back signed in
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <Pressable className="btn google-btn" type="button" onClick={google}>
        <GoogleMark />
        {t.continueWithGoogle}
      </Pressable>
      <div className="or-line">
        <span>{t.orEmail}</span>
      </div>
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

/** Google's "G" mark, as Google's sign-in branding asks for. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
