import { audio } from './engine';

/*
 * Request #87: the game's sound effects, synthesised. Each name is an event
 * of the interface; to use a recorded sound later, replace its recipe here
 * (same name) with a buffer player — callers do not change.
 */
export const SFX_NAMES = [
  'hover',
  'click',
  'open',
  'close',
  'tab',
  'coin',
  'spend',
  'error',
  'loot',
  'success',
  'hurt',
  'heal',
  'travel',
] as const;
export type SfxName = (typeof SFX_NAMES)[number];

type G = NonNullable<ReturnType<typeof audio>>;

/** One oscillator with an attack/decay envelope and an optional pitch glide. */
function tone(
  g: G,
  o: {
    freq: number;
    to?: number;
    type?: OscillatorType;
    at?: number;
    attack?: number;
    decay: number;
    gain: number;
    reverb?: number;
    detune?: number;
  },
) {
  const { ctx } = g;
  const t = ctx.currentTime + (o.at ?? 0);
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + o.decay);
  if (o.detune) osc.detune.value = o.detune;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(o.gain, t + (o.attack ?? 0.005));
  env.gain.exponentialRampToValueAtTime(0.0001, t + (o.attack ?? 0.005) + o.decay);
  osc.connect(env);
  env.connect(g.sfx);
  if (o.reverb) {
    const send = ctx.createGain();
    send.gain.value = o.reverb;
    env.connect(send);
    send.connect(g.reverb);
  }
  osc.start(t);
  osc.stop(t + (o.attack ?? 0.005) + o.decay + 0.05);
}

let noiseBuf: AudioBuffer | null = null;
function noiseBuffer(ctx: AudioContext) {
  if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
  const len = ctx.sampleRate * 2;
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

/** Filtered noise: whooshes, thuds, clicks. */
function noise(
  g: G,
  o: {
    type: BiquadFilterType;
    from: number;
    to?: number;
    q?: number;
    at?: number;
    attack?: number;
    decay: number;
    gain: number;
    reverb?: number;
  },
) {
  const { ctx } = g;
  const t = ctx.currentTime + (o.at ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const f = ctx.createBiquadFilter();
  f.type = o.type;
  f.Q.value = o.q ?? 1;
  f.frequency.setValueAtTime(o.from, t);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + (o.attack ?? 0.01) + o.decay);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(o.gain, t + (o.attack ?? 0.01));
  env.gain.exponentialRampToValueAtTime(0.0001, t + (o.attack ?? 0.01) + o.decay);
  src.connect(f);
  f.connect(env);
  env.connect(g.sfx);
  if (o.reverb) {
    const send = ctx.createGain();
    send.gain.value = o.reverb;
    env.connect(send);
    send.connect(g.reverb);
  }
  src.start(t, Math.random());
  src.stop(t + (o.attack ?? 0.01) + o.decay + 0.05);
}

/** A struck bell: a few inharmonic partials, long decay. */
function bell(g: G, freq: number, at = 0, gain = 0.09) {
  tone(g, { freq, at, decay: 1.4, gain, reverb: 0.5 });
  tone(g, { freq: freq * 2.76, at, decay: 0.7, gain: gain * 0.35, reverb: 0.4 });
  tone(g, { freq: freq * 5.4, at, decay: 0.3, gain: gain * 0.15 });
}

// Notes of D minor pentatonic, for chimes that always sound right together.
const PENTA = [587.33, 698.46, 783.99, 880, 1046.5, 1174.66, 1396.91];

const RECIPES: Record<SfxName, (g: G, i: number) => void> = {
  hover: (g) => tone(g, { freq: 1800, to: 2100, decay: 0.035, gain: 0.018, type: 'sine' }),
  click: (g) => {
    tone(g, { freq: 240, to: 110, type: 'triangle', decay: 0.07, gain: 0.16 });
    noise(g, { type: 'highpass', from: 3000, decay: 0.02, gain: 0.05 });
  },
  tab: (g) => {
    tone(g, { freq: 420, to: 300, type: 'triangle', decay: 0.06, gain: 0.1 });
    noise(g, { type: 'bandpass', from: 1800, q: 2, decay: 0.05, gain: 0.04 });
  },
  open: (g) => {
    noise(g, {
      type: 'bandpass',
      from: 260,
      to: 2400,
      q: 1.4,
      attack: 0.08,
      decay: 0.3,
      gain: 0.1,
      reverb: 0.3,
    });
    tone(g, { freq: 196, to: 294, type: 'sine', attack: 0.05, decay: 0.3, gain: 0.05 });
  },
  close: (g) =>
    noise(g, { type: 'bandpass', from: 2200, to: 300, q: 1.4, attack: 0.02, decay: 0.22, gain: 0.07 }),
  coin: (g) => {
    tone(g, { freq: 1318.5, type: 'triangle', decay: 0.18, gain: 0.08, reverb: 0.2 });
    tone(g, { freq: 1760, type: 'triangle', at: 0.06, decay: 0.32, gain: 0.08, reverb: 0.3 });
  },
  spend: (g) => tone(g, { freq: 140, to: 70, type: 'sine', decay: 0.18, gain: 0.12 }),
  error: (g) => {
    tone(g, { freq: 110, type: 'sawtooth', decay: 0.18, gain: 0.05 });
    tone(g, { freq: 116.5, type: 'sawtooth', decay: 0.18, gain: 0.05 });
  },
  loot: (g, i) => bell(g, PENTA[i % PENTA.length]!, 0, 0.08),
  success: (g) => [0, 2, 4].forEach((n, k) => bell(g, PENTA[n]!, k * 0.09, 0.07)),
  hurt: (g) => {
    noise(g, { type: 'lowpass', from: 600, to: 120, decay: 0.25, gain: 0.25 });
    tone(g, { freq: 70, to: 40, decay: 0.3, gain: 0.25 });
  },
  heal: (g) =>
    [0, 1, 2, 3].forEach((n, k) =>
      tone(g, {
        freq: PENTA[n + 2]!,
        at: k * 0.07,
        attack: 0.03,
        decay: 0.6,
        gain: 0.04,
        reverb: 0.6,
      }),
    ),
  travel: (g) => {
    noise(g, { type: 'lowpass', from: 400, decay: 0.12, gain: 0.12 });
    noise(g, { type: 'lowpass', from: 380, at: 0.28, decay: 0.12, gain: 0.1 });
  },
};

const last = new Map<SfxName, number>();

/**
 * Play a sound effect. `index` varies it (e.g. the nth item of a loot reveal
 * climbs the scale). Silently does nothing before the first gesture or when
 * muted. The same sound is not repeated within 30 ms.
 */
export function playSfx(name: SfxName, index = 0) {
  const g = audio();
  if (!g) return;
  const now = performance.now();
  if (now - (last.get(name) ?? 0) < 30) return;
  last.set(name, now);
  try {
    RECIPES[name](g, index);
  } catch {
    /* a sound must never break the game */
  }
}
