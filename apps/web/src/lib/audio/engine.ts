import { create } from 'zustand';

/*
 * Request #87 (phase A, "feel like a game"): the audio engine.
 *
 * Everything is synthesised with the Web Audio API — no sound files, no
 * licences. Two buses (music, sfx) under a master gain, plus a shared reverb.
 * Browsers only allow sound after a user gesture: the context is created on
 * the first pointer/key press (`unlockAudio`). Sound is ON by default with a
 * mute button in the header (PROVISIONAL, A146). Settings live in
 * localStorage (a per-viewer convenience).
 */

export interface AudioSettings {
  muted: boolean;
  /** 0–1 */
  master: number;
  music: number;
  sfx: number;
}

const KEY = 'realms.audio';
export const DEFAULT_AUDIO: AudioSettings = { muted: false, master: 0.8, music: 0.5, sfx: 0.8 };

export function loadAudioSettings(storage: Pick<Storage, 'getItem'> | null): AudioSettings {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return { ...DEFAULT_AUDIO };
    const v = JSON.parse(raw) as Partial<AudioSettings>;
    const clamp = (n: unknown, d: number) =>
      typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : d;
    return {
      muted: typeof v.muted === 'boolean' ? v.muted : DEFAULT_AUDIO.muted,
      master: clamp(v.master, DEFAULT_AUDIO.master),
      music: clamp(v.music, DEFAULT_AUDIO.music),
      sfx: clamp(v.sfx, DEFAULT_AUDIO.sfx),
    };
  } catch {
    return { ...DEFAULT_AUDIO };
  }
}

const storage = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

interface AudioStore extends AudioSettings {
  set: (patch: Partial<AudioSettings>) => void;
  toggleMute: () => void;
}

export const useAudioSettings = create<AudioStore>((set, get) => ({
  ...loadAudioSettings(storage()),
  set: (patch) => {
    set(patch);
    persist(get());
    applyGains();
  },
  toggleMute: () => get().set({ muted: !get().muted }),
}));

function persist(s: AudioSettings) {
  try {
    storage()?.setItem(
      KEY,
      JSON.stringify({ muted: s.muted, master: s.master, music: s.music, sfx: s.sfx }),
    );
  } catch {
    /* private mode: settings just are not remembered */
  }
}

// ---------------------------------------------------------------------------
// The graph
// ---------------------------------------------------------------------------
interface Graph {
  ctx: AudioContext;
  master: GainNode;
  music: GainNode;
  sfx: GainNode;
  /** Send here for a sense of space (stone halls, open air). */
  reverb: GainNode;
}
let graph: Graph | null = null;
const listeners = new Set<(g: Graph) => void>();

/** A reverb impulse made of decaying noise (no file needed). */
function impulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay;
  }
  return buf;
}

function build(): Graph | null {
  const Ctor =
    typeof window === 'undefined'
      ? undefined
      : (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!Ctor) return null;
  const ctx = new Ctor();
  const master = ctx.createGain();
  master.connect(ctx.destination);
  const music = ctx.createGain();
  const sfx = ctx.createGain();
  music.connect(master);
  sfx.connect(master);
  const conv = ctx.createConvolver();
  conv.buffer = impulse(ctx, 3.2, 2.6);
  const reverb = ctx.createGain();
  reverb.gain.value = 0.6;
  reverb.connect(conv);
  conv.connect(master);
  return { ctx, master, music, sfx, reverb };
}

/** Set the bus volumes from the settings (smoothly). */
export function applyGains() {
  if (!graph) return;
  const s = useAudioSettings.getState();
  const t = graph.ctx.currentTime;
  graph.master.gain.setTargetAtTime(s.muted ? 0 : s.master, t, 0.05);
  graph.music.gain.setTargetAtTime(s.music, t, 0.05);
  graph.sfx.gain.setTargetAtTime(s.sfx, t, 0.05);
  // A muted game does not need to keep synthesising.
  if (s.muted && graph.ctx.state === 'running') void graph.ctx.suspend();
  if (!s.muted && graph.ctx.state === 'suspended') void graph.ctx.resume();
}

/** Create / resume the audio context. Call from a user gesture. */
export function unlockAudio() {
  if (!graph) {
    graph = build();
    if (!graph) return;
    applyGains();
    for (const fn of listeners) fn(graph);
  } else if (graph.ctx.state === 'suspended' && !useAudioSettings.getState().muted) {
    void graph.ctx.resume();
  }
}

/** The graph, once unlocked (null before the first gesture or without Web Audio). */
export const audio = (): Graph | null =>
  graph && !useAudioSettings.getState().muted ? graph : null;

/** Run `fn` as soon as the audio is unlocked (now, if it already is). */
export function onAudioReady(fn: (g: Graph) => void): () => void {
  if (graph) fn(graph);
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
