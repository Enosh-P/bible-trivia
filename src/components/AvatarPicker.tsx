import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { AVATARS, AVATAR_IDS, CartoonAvatar } from '../art/Avatars';
import { updateProfile, useAccount } from '../online/account';
import { useApp, useT } from '../store';
import { spring } from '../motion/springs';
import { Sheet } from './Sheet';

/** Choose your picture from the 20 cartoon avatars. Saved straight away. */
export function AvatarPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const current = useAccount((s) => s.profile?.avatar);
  return (
    <Sheet open={open} onClose={onClose} label={t.chooseAvatar}>
      <h2 className="title">{t.chooseAvatar}</h2>
      <p className="caption">{t.chooseAvatarHelp}</p>
      <AvatarGrid
        current={current}
        lang={uiLang}
        onPick={async (id) => {
          await updateProfile({ avatar: id }).catch(() => {});
          setTimeout(onClose, 350);
        }}
      />
    </Sheet>
  );
}

export function AvatarGrid({ current, lang, onPick }: { current?: string; lang: 'en' | 'ta'; onPick: (id: string) => void }) {
  return (
    <div className="avatar-grid" role="radiogroup">
      {AVATAR_IDS.map((id, i) => (
        <motion.button
          key={id}
          role="radio"
          aria-checked={current === id}
          aria-label={AVATARS[id].name[lang]}
          title={AVATARS[id].name[lang]}
          className={`avatar-choice ${current === id ? 'is-on' : ''}`}
          onClick={() => onPick(id)}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...spring.flick, delay: i * 0.015 }}
          whileTap={{ scale: 0.9 }}
        >
          <CartoonAvatar id={id} size={56} />
          {current === id && (
            <span className="avatar-check">
              <Check size={12} strokeWidth={3} />
            </span>
          )}
          <span className="avatar-name" lang={lang}>
            {AVATARS[id].name[lang]}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
