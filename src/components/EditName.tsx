import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { updateProfile, useAccount } from '../online/account';
import { useT } from '../store';
import { Pressable } from './Pressable';
import { STROKE } from './icons';

/** Change your name (what friends see). Saves on Enter or the button; says when it worked. */
export function NameForm({ onSaved, autoFocus = false }: { onSaved?: () => void; autoFocus?: boolean }) {
  const t = useT();
  const current = useAccount((s) => s.profile?.display_name ?? '');
  const [name, setName] = useState(current);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  useEffect(() => setName(current), [current]);

  const trimmed = name.trim().replace(/\s+/g, ' ');
  const changed = trimmed.length > 0 && trimmed !== current;

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    if (!changed) return;
    setState('saving');
    try {
      await updateProfile({ display_name: trimmed.slice(0, 32) });
      setState('saved');
      onSaved?.();
    } catch {
      setState('error');
    }
  }

  return (
    <form className="name-form" onSubmit={save}>
      <label className="caption" htmlFor="display-name">
        {t.yourNameLabel}
      </label>
      <div className="code-row">
        <input
          id="display-name"
          className="field"
          value={name}
          maxLength={32}
          autoComplete="nickname"
          autoFocus={autoFocus}
          onChange={(e) => {
            setName(e.target.value);
            setState('idle');
          }}
        />
        <Pressable className="btn btn-primary small" type="submit" disabled={!changed || state === 'saving'}>
          {t.save}
        </Pressable>
      </div>
      {state === 'saved' && (
        <p className="caption form-msg is-info">
          <Check size={14} strokeWidth={STROKE} /> {t.nameSaved}
        </p>
      )}
      {state === 'error' && <p className="caption form-msg is-error">{t.nameError}</p>}
      <p className="caption">{t.nameHelp}</p>
    </form>
  );
}
