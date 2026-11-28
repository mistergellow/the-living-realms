import { describe, expect, it } from 'vitest';
import { DEFAULT_AUDIO, loadAudioSettings } from '../src/lib/audio/engine';
import { clickSoundFor } from '../src/lib/audio/ui-sounds';

/** A stand-in for a DOM element (the tests run without a DOM). */
const el = (o: { sfx?: string; disabled?: boolean; ariaDisabled?: boolean; role?: string }) =>
  ({
    dataset: o.sfx ? { sfx: o.sfx } : {},
    disabled: o.disabled ?? false,
    getAttribute: (n: string) =>
      n === 'aria-disabled'
        ? o.ariaDisabled
          ? 'true'
          : null
        : n === 'role'
          ? (o.role ?? null)
          : null,
  }) as unknown as Element;

describe('audio settings (request #87)', () => {
  it('sound is on by default', () => {
    expect(loadAudioSettings(null)).toEqual(DEFAULT_AUDIO);
    expect(DEFAULT_AUDIO.muted).toBe(false);
  });

  it('reads saved settings and ignores nonsense', () => {
    const store = (v: string) => ({ getItem: () => v });
    expect(loadAudioSettings(store('{"muted":true,"music":0.2}'))).toMatchObject({
      muted: true,
      music: 0.2,
      sfx: DEFAULT_AUDIO.sfx,
    });
    expect(loadAudioSettings(store('{"music":7,"sfx":"loud"}'))).toMatchObject({
      music: 1,
      sfx: DEFAULT_AUDIO.sfx,
    });
    expect(loadAudioSettings(store('not json'))).toEqual(DEFAULT_AUDIO);
  });
});

describe('interface sounds (request #87)', () => {
  it('a control clicks, a tab flips, a disabled one refuses, data-sfx overrides', () => {
    expect(clickSoundFor(el({}))).toBe('click');
    expect(clickSoundFor(el({ role: 'tab' }))).toBe('tab');
    expect(clickSoundFor(el({ ariaDisabled: true }))).toBe('error');
    expect(clickSoundFor(el({ sfx: 'coin' }))).toBe('coin');
    expect(clickSoundFor(el({ sfx: 'none' }))).toBeNull();
    expect(clickSoundFor(el({ sfx: 'not-a-sound' }))).toBe('click');
  });
});
