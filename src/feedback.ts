import { useApp } from './store';

/*
 * Multimodal feedback: sound + haptic fire on the same frame as the visual.
 * Sounds are synthesized (no audio files to download). Haptics use the
 * Vibration API, which Android supports and iOS Safari does not.
 */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freqs: number[], dur = 0.12, type: OscillatorType = 'sine', gap = 0.07, vol = 0.12) {
  const a = audio();
  if (!a) return;
  freqs.forEach((f, i) => {
    const t = a.currentTime + i * gap;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(a.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  });
}

function vibrate(pattern: number | number[]) {
  if ('vibrate' in navigator) navigator.vibrate(pattern);
}

export type Cue = 'tap' | 'correct' | 'wrong' | 'complete' | 'tick';

export function cue(kind: Cue) {
  const { sound, haptics } = useApp.getState();
  if (sound) {
    if (kind === 'correct') tone([660, 880], 0.16, 'sine', 0.08);
    else if (kind === 'wrong') tone([220, 180], 0.18, 'triangle', 0.09, 0.1);
    else if (kind === 'complete') tone([523, 659, 784, 1047], 0.22, 'sine', 0.1);
    else if (kind === 'tick') tone([1200], 0.04, 'square', 0, 0.03);
    else tone([440], 0.04, 'sine', 0, 0.05);
  }
  if (haptics) {
    if (kind === 'correct') vibrate(18);
    else if (kind === 'wrong') vibrate([30, 40, 30]);
    else if (kind === 'complete') vibrate([20, 30, 20, 30, 40]);
    else if (kind === 'tap') vibrate(8);
  }
}
