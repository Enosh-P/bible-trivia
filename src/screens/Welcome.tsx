import { motion } from 'motion/react';
import { AuthForm } from '../components/AuthForm';
import { ThemeToggle } from '../components/ThemeToggle';
import { useApp, useT } from '../store';
import { spring } from '../motion/springs';

/** Shown until the player signs in: everything else needs an account. */
export function Welcome() {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const set = useApp((s) => s.set);

  return (
    <div className="screen welcome" lang={uiLang}>
      <div className="welcome-top">
        <div className="lang-switch" role="radiogroup" aria-label={t.language}>
          {(['en', 'ta'] as const).map((l) => (
            <button key={l} role="radio" aria-checked={uiLang === l} className={uiLang === l ? 'is-on' : ''} onClick={() => set({ qLang: l })} lang={l}>
              {l === 'en' ? 'English' : 'தமிழ்'}
            </button>
          ))}
        </div>
        <ThemeToggle />
      </div>

      <motion.div className="welcome-hero" initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={spring.calm}>
        <img src="/favicon.svg" alt="" width={96} height={96} className="welcome-icon" />
        <h1 className="display">{t.appName}</h1>
        <p className="caption">{t.tagline}</p>
      </motion.div>

      <motion.section
        className="glass card-pad welcome-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.calm, delay: 0.08 }}
      >
        <h2 className="title">{t.welcomeTitle}</h2>
        <p className="caption">{t.welcomeLead}</p>
        <AuthForm />
      </motion.section>
    </div>
  );
}

/** While the saved sign-in is being checked. */
export function Splash() {
  return (
    <div className="splash" aria-busy="true">
      <motion.img src="/favicon.svg" alt="" width={88} height={88} animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
    </div>
  );
}
