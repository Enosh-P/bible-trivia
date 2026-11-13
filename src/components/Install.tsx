import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Download, EllipsisVertical, PlusSquare, Share, Smartphone, X } from 'lucide-react';
import { useInstall } from '../pwa/install';
import { useT } from '../store';
import { spring } from '../motion/springs';
import { Pressable } from './Pressable';
import { Sheet } from './Sheet';
import { IconTile, STROKE } from './icons';

/**
 * Install the app:
 * - Android and computers (Chrome, Edge, Samsung Internet): the browser's own install prompt
 * - iPhone and iPad: there is no prompt, so a short "Add to Home Screen" guide
 * - other browsers: the menu steps
 */
export function useInstallAction() {
  const { state, promptInstall } = useInstall();
  const [guide, setGuide] = useState<'ios' | 'menu' | null>(null);
  const install = () => (state === 'native' ? void promptInstall() : setGuide(state === 'ios' ? 'ios' : 'menu'));
  const sheet = <InstallGuide kind={guide} onClose={() => setGuide(null)} />;
  return { state, install, sheet } as const;
}

function InstallGuide({ kind, onClose }: { kind: 'ios' | 'menu' | null; onClose: () => void }) {
  const t = useT();
  const steps =
    kind === 'ios'
      ? [
          { icon: Share, horse: 'white' as const, text: t.iosStep1 },
          { icon: PlusSquare, horse: 'pale' as const, text: t.iosStep2 },
          { icon: Smartphone, horse: 'black' as const, text: t.iosStep3 },
        ]
      : [
          { icon: EllipsisVertical, horse: 'white' as const, text: t.menuStep1 },
          { icon: Download, horse: 'pale' as const, text: t.menuStep2 },
          { icon: Smartphone, horse: 'black' as const, text: t.iosStep3 },
        ];
  return (
    <Sheet open={kind !== null} onClose={onClose} label={t.iosInstallTitle}>
      <div className="install-guide">
        <img src="/favicon.svg" alt="" width={72} height={72} className="welcome-icon" />
        <h2 className="title">{t.iosInstallTitle}</h2>
        <ol className="ios-steps">
          {steps.map((s) => (
            <li key={s.text}>
              <IconTile horse={s.horse} icon={s.icon} size={36} /> {s.text}
            </li>
          ))}
        </ol>
        <Pressable className="btn btn-primary" onClick={onClose}>
          {t.close}
        </Pressable>
      </div>
    </Sheet>
  );
}

/** A small "Install app" button (sign-in screen, desktop sidebar). Hidden once installed. */
export function InstallButton({ className = 'btn glass small' }: { className?: string }) {
  const t = useT();
  const { state, install, sheet } = useInstallAction();
  if (state === 'installed') return null;
  return (
    <>
      <Pressable className={className} onClick={install}>
        <Download size={16} strokeWidth={STROKE} /> {t.install}
      </Pressable>
      {sheet}
    </>
  );
}

const DISMISS_KEY = 'bt-install-dismissed';

/** Home: a friendly banner until the app is installed or the banner is closed. */
export function InstallBanner() {
  const t = useT();
  const { state, install, sheet } = useInstallAction();
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  // Only where installing is possible: the prompt is ready, or an iPhone/iPad.
  const show = !hidden && (state === 'native' || state === 'ios');
  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.div
            className="install-banner glass"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: -12 }}
            transition={spring.calm}
          >
            <img src="/favicon.svg" alt="" width={42} height={42} className="brand-icon" />
            <div className="grow">
              <strong>{t.installTitle}</strong>
              <span className="caption">{t.installSub}</span>
            </div>
            <Pressable className="btn btn-primary small" onClick={install}>
              {t.installShort}
            </Pressable>
            <button
              className="icon-btn"
              aria-label={t.close}
              onClick={() => {
                setHidden(true);
                try {
                  localStorage.setItem(DISMISS_KEY, '1');
                } catch {
                  /* storage blocked */
                }
              }}
            >
              <X size={16} strokeWidth={STROKE} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {sheet}
    </>
  );
}
