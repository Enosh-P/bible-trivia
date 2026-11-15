import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, ChevronLeft, ChevronRight, Download, Info, Languages, Monitor, Moon, Palette, ShieldCheck, Smartphone, Sun, Type, Vibrate, Volume2 } from 'lucide-react';
import { useApp, useT, type QuestionLang, type ThemePref } from '../store';
import { spring } from '../motion/springs';
import { Pressable } from '../components/Pressable';
import { IconTile, STROKE } from '../components/icons';
import { useInstallAction } from '../components/Install';
import { cachedBooks } from '../online/stock';
import { AccountCard, ProfileDetails } from '../components/AccountCard';
import { NotificationSettings } from '../components/NotificationsCard';
import { Sheet } from '../components/Sheet';
import { Avatar } from './Friends';
import type { Horse } from '../engine/modes';
import type { LucideIcon } from 'lucide-react';
import { useAccount } from '../online/account';
import { supabase } from '../online/supabase';
import { pushSupport } from '../online/push';

/** iOS-style segmented control with a gliding thumb. */
export function Segmented<T extends string>({
  id,
  value,
  options,
  onChange,
  label,
}: {
  id: string;
  value: T;
  options: { v: T; label: string; lang?: string; icon?: LucideIcon }[];
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.v} role="radio" aria-checked={value === o.v} className={value === o.v ? 'is-on' : ''} onClick={() => onChange(o.v)} lang={o.lang}>
          {value === o.v && <motion.span layoutId={`seg-${id}`} className="segmented-thumb" transition={spring.calm} />}
          <span>
            {o.icon && <o.icon size={16} strokeWidth={STROKE} />}
            {o.label}
          </span>
        </button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} className={`toggle ${on ? 'is-on' : ''}`} onClick={() => onChange(!on)}>
      <motion.span className="toggle-knob" layout transition={spring.flick} />
    </button>
  );
}

/** One line of the settings menu: icon, name, a short note, and where it leads. */
function MenuRow({
  horse,
  icon,
  label,
  sub,
  value,
  onClick,
  disabled,
  children,
}: {
  horse: Horse;
  icon: LucideIcon;
  label: string;
  sub?: string;
  value?: string;
  onClick?: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  const inner = (
    <>
      <IconTile horse={horse} icon={icon} size={36} />
      <span className="menu-text">
        <strong>{label}</strong>
        {sub && <span className="caption">{sub}</span>}
      </span>
      {value && <span className="menu-value">{value}</span>}
      {children}
      {onClick && !disabled && <ChevronRight size={18} strokeWidth={STROKE} className="menu-chevron" />}
    </>
  );
  // A row with its own control (a switch) is not itself a button.
  if (!onClick) return <div className="menu-row">{inner}</div>;
  return (
    <button className="menu-row" onClick={onClick} disabled={disabled}>
      {inner}
    </button>
  );
}

type Page = 'profile' | 'notifications' | 'appearance';

const TEXT_SIZES = [0.9, 1, 1.15, 1.3];

export function Settings({ onAdmin }: { onAdmin: () => void }) {
  const t = useT();
  // Shown to admins only; the database checks again on every change they make.
  const isAdmin = useAccount((a) => Boolean(a.session && a.profile?.is_admin));
  const session = useAccount((a) => a.session);
  const profile = useAccount((a) => a.profile);
  const s = useApp();
  const { state: install, install: doInstall, sheet: installSheet } = useInstallAction();
  const [saved, setSaved] = useState(0);
  const [page, setPage] = useState<Page | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  useEffect(() => {
    void cachedBooks().then((b) => setSaved(b.size));
  }, []);
  // Each page starts at its top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  const themeName: Record<ThemePref, string> = { light: t.themeLight, dark: t.themeDark, system: t.themeSystem };
  const pageTitle: Record<Page, string> = { profile: t.profile, notifications: t.notifications, appearance: t.appearance };
  const sizeIndex = TEXT_SIZES.reduce((best, v, i) => (Math.abs(v - s.textScale) < Math.abs(TEXT_SIZES[best] - s.textScale) ? i : best), 0);

  return (
    <div className="screen settings" lang={s.uiLang}>
      <AnimatePresence mode="wait" initial={false}>
        {page === null ? (
          <motion.div key="menu" className="settings-page" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={spring.calm}>
            <h1 className="display">{t.settingsTitle}</h1>

            {supabase && session ? (
              <Pressable className="profile-row glass" onClick={() => setPage('profile')}>
                <Avatar horse={profile?.avatar ?? 'pale'} size={52} />
                <span className="menu-text">
                  <strong>{profile?.display_name ?? session.user.email}</strong>
                  <span className="caption">{t.editProfile}</span>
                </span>
                <ChevronRight size={18} strokeWidth={STROKE} className="menu-chevron" />
              </Pressable>
            ) : (
              <AccountCard />
            )}

            <section className="glass setting-card">
              <div className="setting-head">
                <IconTile horse="pale" icon={Languages} size={36} />
                <span className="menu-text">
                  <strong>{t.language}</strong>
                  <span className="caption">{t.langQuestion}</span>
                </span>
              </div>
              <Segmented<QuestionLang>
                id="q"
                label={t.language}
                value={s.qLang}
                onChange={(v) => s.set({ qLang: v })}
                options={[
                  { v: 'en', label: 'English', lang: 'en' },
                  { v: 'ta', label: 'தமிழ்', lang: 'ta' },
                  { v: 'both', label: t.both },
                ]}
              />
              <p className="caption setting-note">{t.langBothHelp}</p>
              {s.qLang === 'both' && (
                <div className="setting-sub">
                  <span className="setting-sub-label">{t.uiLanguage}</span>
                  <Segmented
                    id="ui"
                    label={t.uiLanguage}
                    value={s.uiLang}
                    onChange={(v) => s.set({ uiLang: v })}
                    options={[
                      { v: 'en', label: 'English', lang: 'en' },
                      { v: 'ta', label: 'தமிழ்', lang: 'ta' },
                    ]}
                  />
                </div>
              )}
            </section>

            <section className="glass menu">
              {pushSupport() !== 'not-configured' && (
                <MenuRow horse="pale" icon={Bell} label={t.notifications} value={session && s.pushWanted ? t.on : t.off} onClick={() => setPage('notifications')} />
              )}
              <MenuRow horse="black" icon={Palette} label={t.appearance} value={themeName[s.theme]} onClick={() => setPage('appearance')} />
            </section>

            <section className="glass menu">
              <MenuRow horse="red" icon={Volume2} label={t.sound} sub={t.soundSub}>
                <Toggle on={s.sound} onChange={(v) => s.set({ sound: v })} label={t.sound} />
              </MenuRow>
              <MenuRow horse="pale" icon={Vibrate} label={t.vibration} sub={t.vibrationSub}>
                <Toggle on={s.haptics} onChange={(v) => s.set({ haptics: v })} label={t.vibration} />
              </MenuRow>
            </section>

            <section className="glass menu">
              <MenuRow
                horse="pale"
                icon={install === 'installed' ? Smartphone : Download}
                label={install === 'installed' ? t.installed : t.install}
                sub={saved > 0 ? t.offlineReady(saved) : t.installSub}
                onClick={doInstall}
                disabled={install === 'installed'}
              />
              {isAdmin && <MenuRow horse="black" icon={ShieldCheck} label={t.admin} sub={t.adminSub} onClick={onAdmin} />}
              <MenuRow horse="white" icon={Info} label={t.about} sub={t.aboutSub} onClick={() => setAboutOpen(true)} />
            </section>
          </motion.div>
        ) : (
          <motion.div key={page} className="settings-page" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={spring.calm}>
            <header className="recall-head">
              <Pressable className="chip glass" onClick={() => setPage(null)} aria-label={t.back}>
                <ChevronLeft size={20} strokeWidth={STROKE} />
              </Pressable>
              <div className="grow">
                <p className="eyebrow">{t.settingsTitle}</p>
                <h1 className="title">{pageTitle[page]}</h1>
              </div>
            </header>

            {page === 'profile' && <ProfileDetails />}
            {page === 'notifications' && <NotificationSettings />}
            {page === 'appearance' && (
              <>
                <section className="glass setting-card">
                  <div className="setting-head">
                    <IconTile horse="black" icon={Moon} size={36} />
                    <span className="menu-text">
                      <strong>{t.theme}</strong>
                    </span>
                  </div>
                  <Segmented<ThemePref>
                    id="theme"
                    label={t.theme}
                    value={s.theme}
                    onChange={(v) => s.set({ theme: v })}
                    options={[
                      { v: 'light', label: t.themeLight, icon: Sun },
                      { v: 'dark', label: t.themeDark, icon: Moon },
                      { v: 'system', label: t.themeSystem, icon: Monitor },
                    ]}
                  />
                </section>
                <section className="glass setting-card">
                  <div className="setting-head">
                    <IconTile horse="white" icon={Type} size={36} />
                    <span className="menu-text">
                      <strong>{t.textSize}</strong>
                      <span className="caption">{t.textSizeNames[sizeIndex]}</span>
                    </span>
                  </div>
                  <div className="size-pick" role="radiogroup" aria-label={t.textSize}>
                    {TEXT_SIZES.map((v, i) => (
                      <button key={v} role="radio" aria-checked={i === sizeIndex} aria-label={t.textSizeNames[i]} className={i === sizeIndex ? 'is-on' : ''} onClick={() => s.set({ textScale: v })}>
                        <span style={{ fontSize: `${14 + i * 5}px` }}>{s.uiLang === 'ta' ? 'அ' : 'A'}</span>
                      </button>
                    ))}
                  </div>
                </section>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={aboutOpen} onClose={() => setAboutOpen(false)} label={t.about}>
        <div className="about-sheet" lang={s.uiLang}>
          <img src="/favicon.svg" alt="" width={64} height={64} className="welcome-icon" />
          <h2 className="title">{t.appName}</h2>
          <p>{t.credit}</p>
          <Pressable className="btn btn-primary" onClick={() => setAboutOpen(false)}>
            {t.close}
          </Pressable>
        </div>
      </Sheet>

      {installSheet}
    </div>
  );
}
