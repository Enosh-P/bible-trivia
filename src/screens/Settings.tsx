import { useState } from 'react';
import { motion } from 'motion/react';
import { Download, Languages, MonitorSmartphone, Moon, PlusSquare, Share, Smartphone, Type, Vibrate, Volume2 } from 'lucide-react';
import { useApp, useT, type QuestionLang, type ThemePref } from '../store';
import { spring } from '../motion/springs';
import { Pressable } from '../components/Pressable';
import { Sheet } from '../components/Sheet';
import { IconTile, STROKE } from '../components/icons';
import { useInstall } from '../pwa/install';
import type { Horse } from '../engine/modes';
import type { LucideIcon } from 'lucide-react';

/** iOS-style segmented control with a gliding thumb. */
function Segmented<T extends string>({ id, value, options, onChange }: { id: string; value: T; options: { v: T; label: string; lang?: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((o) => (
        <button key={o.v} role="radio" aria-checked={value === o.v} className={value === o.v ? 'is-on' : ''} onClick={() => onChange(o.v)} lang={o.lang}>
          {value === o.v && <motion.span layoutId={`seg-${id}`} className="segmented-thumb" transition={spring.calm} />}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} className={`toggle ${on ? 'is-on' : ''}`} onClick={() => onChange(!on)}>
      <motion.span className="toggle-knob" layout transition={spring.flick} />
    </button>
  );
}

function Row({ horse, icon, label, children }: { horse: Horse; icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="row">
      <IconTile horse={horse} icon={icon} size={34} />
      <span className="row-label">{label}</span>
      <div className="row-control">{children}</div>
    </div>
  );
}

export function Settings() {
  const t = useT();
  const s = useApp();
  const { state: install, promptInstall } = useInstall();
  const [iosOpen, setIosOpen] = useState(false);

  return (
    <div className="screen" lang={s.uiLang}>
      <h1 className="display">{t.settingsTitle}</h1>

      {install !== 'unavailable' && (
        <Pressable
          className="install-card glass"
          disabled={install === 'installed'}
          onClick={() => (install === 'native' ? promptInstall() : setIosOpen(true))}
        >
          <IconTile horse="pale" icon={install === 'installed' ? Smartphone : Download} size={46} />
          <div className="grow">
            <strong>{install === 'installed' ? t.installed : t.install}</strong>
            <span className="caption">{t.installSub}</span>
          </div>
        </Pressable>
      )}

      <section className="glass group">
        <div className="row-stack">
          <Row horse="pale" icon={Languages} label={t.language}>
            {null}
          </Row>
          <Segmented<QuestionLang>
            id="q"
            value={s.qLang}
            onChange={(v) => s.set({ qLang: v })}
            options={[
              { v: 'en', label: 'English' },
              { v: 'ta', label: 'தமிழ்', lang: 'ta' },
              { v: 'both', label: t.both },
            ]}
          />
        </div>
        {s.qLang === 'both' && (
          <Row horse="white" icon={Languages} label={t.uiLanguage}>
            <Segmented
              id="ui"
              value={s.uiLang}
              onChange={(v) => s.set({ uiLang: v })}
              options={[
                { v: 'en', label: 'English' },
                { v: 'ta', label: 'தமிழ்', lang: 'ta' },
              ]}
            />
          </Row>
        )}
      </section>

      <section className="glass group">
        <div className="row-stack">
          <Row horse="black" icon={Moon} label={t.theme}>
            {null}
          </Row>
          <Segmented<ThemePref>
            id="theme"
            value={s.theme}
            onChange={(v) => s.set({ theme: v })}
            options={[
              { v: 'light', label: t.themeLight },
              { v: 'dark', label: t.themeDark },
              { v: 'system', label: t.themeSystem },
            ]}
          />
        </div>
        <Row horse="white" icon={Type} label={t.textSize}>
          <input
            type="range"
            min={0.9}
            max={1.3}
            step={0.05}
            value={s.textScale}
            onChange={(e) => s.set({ textScale: Number(e.target.value) })}
            aria-label={t.textSize}
          />
        </Row>
        <Row horse="red" icon={Volume2} label={t.sound}>
          <Toggle on={s.sound} onChange={(v) => s.set({ sound: v })} label={t.sound} />
        </Row>
        <Row horse="pale" icon={Vibrate} label={t.haptics}>
          <Toggle on={s.haptics} onChange={(v) => s.set({ haptics: v })} label={t.haptics} />
        </Row>
      </section>

      <p className="caption credit">
        <MonitorSmartphone size={14} strokeWidth={STROKE} /> {t.credit}
      </p>

      <Sheet open={iosOpen} onClose={() => setIosOpen(false)} label={t.iosInstallTitle}>
        <h2 className="title">{t.iosInstallTitle}</h2>
        <ol className="ios-steps">
          <li>
            <IconTile horse="white" icon={Share} size={36} /> {t.iosStep1}
          </li>
          <li>
            <IconTile horse="pale" icon={PlusSquare} size={36} /> {t.iosStep2}
          </li>
          <li>
            <IconTile horse="black" icon={Smartphone} size={36} /> {t.iosStep3}
          </li>
        </ol>
        <Pressable className="btn btn-primary" onClick={() => setIosOpen(false)}>
          {t.close}
        </Pressable>
      </Sheet>
    </div>
  );
}
