import type { CharacterDto, PresencePlayer, WorldDto } from '@realms/shared';
import { describe, expect, it } from 'vitest';
import {
  applyServerMessage,
  applyStatus,
  initialWorldState,
} from '../src/features/world/world-state';

const appearance = { version: 1, color: '#c0392b', emblem: 'circle' } as const;
const player = (id: string, name: string): PresencePlayer => ({
  characterId: id,
  name,
  appearance,
  position: { q: 0, r: 0 },
});
const world: WorldDto = { id: 'w', slug: 'main', name: 'Realm', tick: 7, lastTickAt: null };
const self: CharacterDto = {
  id: 'a',
  name: 'Alda',
  appearance,
  position: { q: 0, r: 0 },
  createdAt: '',
  lastPlayedAt: null,
};

describe('world state reducer', () => {
  it('tracks players joining and leaving', () => {
    let s = applyServerMessage(initialWorldState, {
      type: 'world.entered',
      data: { world, character: self, players: [player('a', 'Alda')], chat: [] },
    });
    expect(s.tick).toBe(7);
    s = applyServerMessage(s, { type: 'player.joined', data: { player: player('b', 'Brann') } });
    expect(Object.keys(s.players).sort()).toEqual(['a', 'b']);
    s = applyServerMessage(s, { type: 'player.left', data: { characterId: 'b' } });
    expect(Object.keys(s.players)).toEqual(['a']);
    expect(s.log.map((l) => l.text)).toEqual([
      'Brann departed.',
      'Brann arrived.',
      'Alda entered Realm.',
    ]);
  });

  it('ignores leaves for unknown players and updates ticks', () => {
    const s = applyServerMessage(initialWorldState, {
      type: 'player.left',
      data: { characterId: 'x' },
    });
    expect(s).toBe(initialWorldState);
    expect(applyServerMessage(s, { type: 'world.tick', data: { tick: 3, at: '' } }).tick).toBe(3);
  });

  it('keeps the hex chat: history on entering, new messages appended once', () => {
    const msg = (id: string, text: string) => ({
      id,
      characterId: 'b',
      name: 'Brann',
      text,
      at: '',
      hex: { q: 0, r: 0 },
    });
    let s = applyServerMessage(initialWorldState, {
      type: 'world.entered',
      data: { world, character: self, players: [], chat: [msg('1', 'hello')] },
    });
    s = applyServerMessage(s, { type: 'chat.message', data: { message: msg('2', 'anyone?') } });
    s = applyServerMessage(s, { type: 'chat.message', data: { message: msg('2', 'anyone?') } });
    expect(s.chat.map((m) => m.text)).toEqual(['hello', 'anyone?']);
    expect(applyServerMessage(s, { type: 'world.left' }).chat).toEqual([]);
  });

  it('logs notable connection status changes', () => {
    const s = applyStatus(initialWorldState, 'replaced');
    expect(s.status).toBe('replaced');
    expect(s.log[0]?.tone).toBe('warn');
  });
});
