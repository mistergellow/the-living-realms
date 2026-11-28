import { useEffect } from 'react';
import { onAudioReady, type audio } from './engine';

/*
 * Request #87: ambience and music per kind of place, generated live.
 *
 * - a BED of filtered noise (wind in the wilds, a low murmur in the capital,
 *   a humming drone at a Rift), slowly breathing;
 * - MUSIC: slow, soft chords of a dark progression, a new chord every few
 *   seconds, and now and then a bell note from the scale.
 * Changing place cross-fades over two seconds. PLACEHOLDER until real music
 * and recorded ambience arrive (swap `startScene` for buffer players).
 */
export type AmbienceScene = 'town' | 'wilds' | 'rift' | 'combat' | 'menu';

type G = NonNullable<ReturnType<typeof audio>>;

interface Running {
  scene: AmbienceScene;
  out: GainNode;
  stop: () => void;
}

const SCENE: Record<
  AmbienceScene,
  {
    /** noise bed: filter centre (Hz), level, breathing speed (Hz) */
    bed: { freq: number; q: number; gain: number; lfo: number };
    /** root of the drone (Hz); 0 = none */
    drone: number;
    /** chords as semitone offsets from D3 */
    chords: number[][];
    chordSeconds: number;
    musicGain: number;
  }
> = {
  wilds: {
    bed: { freq: 500, q: 0.7, gain: 0.05, lfo: 0.06 },
    drone: 0,
    chords: [
      [0, 3, 7, 12],
      [-2, 2, 5, 10],
      [-4, 0, 3, 8],
      [-5, 2, 5, 10],
    ],
    chordSeconds: 7,
    musicGain: 0.05,
  },
  town: {
    bed: { freq: 380, q: 1.6, gain: 0.04, lfo: 0.15 },
    drone: 0,
    chords: [
      [0, 3, 7, 10],
      [5, 8, 12, 15],
      [3, 7, 10, 14],
      [-2, 2, 5, 9],
    ],
    chordSeconds: 6,
    musicGain: 0.05,
  },
  rift: {
    bed: { freq: 220, q: 2.5, gain: 0.05, lfo: 0.03 },
    drone: 73.42,
    chords: [
      [0, 1, 7, 13],
      [-1, 3, 6, 11],
    ],
    chordSeconds: 9,
    musicGain: 0.04,
  },
  combat: {
    bed: { freq: 300, q: 1.2, gain: 0.03, lfo: 0.1 },
    drone: 73.42,
    chords: [
      [0, 3, 7, 12],
      [1, 5, 8, 13],
      [-2, 3, 7, 10],
      [0, 3, 6, 12],
    ],
    chordSeconds: 4,
    musicGain: 0.05,
  },
  menu: {
    bed: { freq: 450, q: 0.8, gain: 0.03, lfo: 0.05 },
    drone: 0,
    chords: [
      [0, 3, 7, 12],
      [-4, 0, 3, 8],
      [-2, 2, 5, 10],
      [-5, -1, 2, 7],
    ],
    chordSeconds: 8,
    musicGain: 0.05,
  },
};

const D3 = 146.83;
const semis = (n: number) => D3 * 2 ** (n / 12);
// D minor pentatonic, two octaves up, for the bell notes.
const BELLS = [0, 3, 5, 7, 10, 12, 15, 17].map((n) => semis(n + 12));

function startScene(g: G, scene: AmbienceScene): Running {
  const { ctx } = g;
  const def = SCENE[scene];
  const out = ctx.createGain();
  out.gain.value = 0.0001;
  out.connect(g.music);
  out.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 2.5);
  const stops: Array<() => void> = [];

  // --- the bed: looping noise through a breathing band-pass
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b = 0;
  for (let i = 0; i < len; i++) {
    // brown-ish noise: softer than white
    b = (b + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = b * 3.5;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const filt = ctx.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.value = def.bed.freq;
  filt.Q.value = def.bed.q;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = def.bed.lfo;
  const lfoAmt = ctx.createGain();
  lfoAmt.gain.value = def.bed.freq * 0.45;
  lfo.connect(lfoAmt);
  lfoAmt.connect(filt.frequency);
  const bedGain = ctx.createGain();
  bedGain.gain.value = def.bed.gain;
  src.connect(filt);
  filt.connect(bedGain);
  bedGain.connect(out);
  src.start();
  lfo.start();
  stops.push(() => {
    src.stop();
    lfo.stop();
  });

  // --- a drone under the Rifts and fights
  if (def.drone) {
    for (const det of [0, 0.4]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = def.drone + det;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 260;
      const gn = ctx.createGain();
      gn.gain.value = 0.018;
      o.connect(lp);
      lp.connect(gn);
      gn.connect(out);
      o.start();
      stops.push(() => o.stop());
    }
  }

  // --- music: soft chords, and now and then a bell
  const pad = ctx.createBiquadFilter();
  pad.type = 'lowpass';
  pad.frequency.value = 1100;
  const padGain = ctx.createGain();
  padGain.gain.value = def.musicGain;
  pad.connect(padGain);
  padGain.connect(out);
  const send = ctx.createGain();
  send.gain.value = 0.7;
  padGain.connect(send);
  send.connect(g.reverb);

  let step = 0;
  const playChord = () => {
    const t = ctx.currentTime;
    const chord = def.chords[step++ % def.chords.length]!;
    const hold = def.chordSeconds;
    for (const n of chord) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = semis(n);
      o.detune.value = (Math.random() - 0.5) * 8;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(0.25, t + 2);
      env.gain.setValueAtTime(0.25, t + hold - 0.5);
      env.gain.exponentialRampToValueAtTime(0.0001, t + hold + 2.5);
      o.connect(env);
      env.connect(pad);
      o.start(t);
      o.stop(t + hold + 2.6);
    }
    // a bell, two times out of five
    if (Math.random() < 0.4) {
      const f = BELLS[Math.floor(Math.random() * BELLS.length)]!;
      const at = t + 1 + Math.random() * (hold - 1);
      const o = ctx.createOscillator();
      o.frequency.value = f;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, at);
      env.gain.exponentialRampToValueAtTime(0.06, at + 0.01);
      env.gain.exponentialRampToValueAtTime(0.0001, at + 2.2);
      o.connect(env);
      env.connect(padGain);
      o.start(at);
      o.stop(at + 2.3);
    }
  };
  playChord();
  const timer = window.setInterval(playChord, def.chordSeconds * 1000);
  stops.push(() => clearInterval(timer));

  return {
    scene,
    out,
    stop: () => {
      const t = ctx.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), t);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 2);
      window.setTimeout(() => {
        for (const s of stops) s();
        out.disconnect();
      }, 2200);
    },
  };
}

let wanted: AmbienceScene | null = null;
let running: Running | null = null;
let graphRef: G | null = null;

function sync() {
  if (!graphRef) return;
  if (running?.scene === wanted) return;
  running?.stop();
  running = wanted ? startScene(graphRef, wanted) : null;
}

onAudioReady((g) => {
  graphRef = g;
  sync();
});

/** Ask for the ambience of a scene (the latest call wins). */
export function setAmbience(scene: AmbienceScene | null) {
  wanted = scene;
  sync();
}

/** React: play this scene's ambience while the component is shown. */
export function useAmbience(scene: AmbienceScene | null) {
  useEffect(() => {
    setAmbience(scene);
  }, [scene]);
}
