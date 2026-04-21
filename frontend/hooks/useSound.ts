/**
 * Plays synthesised UI sounds via Web Audio API — no external files needed.
 * Safe to call on the server (no-ops if window is undefined).
 */

type Ctx = AudioContext;

function getCtx(): Ctx | null {
  if (typeof window === 'undefined') return null;
  try {
    return new (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  } catch {
    return null;
  }
}

function tone(
  ctx: Ctx,
  freq: number,
  startAt: number,
  duration: number,
  volume = 0.22,
) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}

/** Major-chord arpeggio (C5-E5-G5-C6) — creation / success */
export function playSuccess() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Arpeggio up a C major chord
  tone(ctx, 523.25, t,        0.14, 0.20); // C5
  tone(ctx, 659.25, t + 0.09, 0.14, 0.18); // E5
  tone(ctx, 783.99, t + 0.18, 0.14, 0.16); // G5
  tone(ctx, 1046.5, t + 0.27, 0.22, 0.14); // C6
}

/** Duration of playSuccess in ms — use to delay page reloads */
export const SOUND_DURATION_MS = 520;

/** Single descending tone — deletion */
export function playDelete() {
  const ctx = getCtx();
  if (!ctx) return;
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(380, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(210, ctx.currentTime + 0.25);
  gain.gain.setValueAtTime(0.22, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.32);
}
