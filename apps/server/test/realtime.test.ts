import { publishToWorld } from '@realms/server-kit';
import { WsCloseCode } from '@realms/shared';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  connectWs,
  createCharacter,
  createTestApp,
  registerUser,
  resetState,
  type TestApp,
  type TestSocket,
} from './helpers.js';

let t: TestApp;
let baseUrl: string;
const sockets: TestSocket[] = [];

beforeAll(async () => {
  t = await createTestApp();
  baseUrl = await t.app.listen({ host: '127.0.0.1', port: 0 });
});
beforeEach(() => resetState(t));
afterEach(() => {
  sockets.splice(0).forEach((s) => s.close());
});
afterAll(() => t.close());

async function playerWithCharacter(name: string) {
  const user = await registerUser(t.app);
  const { character } = (await createCharacter(t.app, user.cookie, name)).json();
  return { ...user, character };
}

async function open(cookie?: string) {
  const s = await connectWs(baseUrl, cookie);
  sockets.push(s);
  return s;
}

describe('realtime gateway', () => {
  it('closes unauthenticated connections with 4001', async () => {
    const s = await open();
    expect(await s.closed).toBe(WsCloseCode.UNAUTHENTICATED);
  });

  it('rejects handshakes from foreign origins', async () => {
    const { cookie } = await registerUser(t.app);
    await expect(connectWs(baseUrl, cookie, 'https://evil.example')).rejects.toThrow('HTTP 403');
  });

  it('welcomes, answers pings and rejects malformed messages', async () => {
    const { cookie } = await registerUser(t.app);
    const s = await open(cookie);
    expect((await s.next('welcome')).data.protocolVersion).toBe(1);
    s.send({ type: 'ping', data: { t: 42 } });
    expect((await s.next('pong')).data.t).toBe(42);
    s.send('not json');
    expect((await s.next('error')).data.code).toBe('VALIDATION_FAILED');
    s.send({ type: 'world.enter', data: { characterId: 'nope' } });
    expect((await s.next('error')).data.code).toBe('VALIDATION_FAILED');
  });

  it("does not let a player enter with someone else's character", async () => {
    const owner = await playerWithCharacter('Owned');
    const thief = await registerUser(t.app);
    const s = await open(thief.cookie);
    s.send({ type: 'world.enter', data: { characterId: owner.character.id } });
    expect((await s.next('error')).data.code).toBe('NOT_FOUND');
  });

  it('enters the world and sees other players join and leave', async () => {
    const a = await playerWithCharacter('Alda');
    const b = await playerWithCharacter('Brann');

    const sa = await open(a.cookie);
    sa.send({ type: 'world.enter', data: { characterId: a.character.id } });
    const entered = await sa.next('world.entered');
    expect(entered.data.character.name).toBe('Alda');
    expect(entered.data.players.map((p) => p.name)).toEqual(['Alda']);

    const sb = await open(b.cookie);
    sb.send({ type: 'world.enter', data: { characterId: b.character.id } });
    expect((await sb.next('world.entered')).data.players.map((p) => p.name).sort()).toEqual([
      'Alda',
      'Brann',
    ]);
    expect((await sa.next('player.joined')).data.player.name).toBe('Brann');

    sb.close();
    expect((await sa.next('player.left')).data.characterId).toBe(b.character.id);
  });

  it('allows only one active character per account (newest connection wins)', async () => {
    const user = await playerWithCharacter('Solo');
    const { character: second } = (await createCharacter(t.app, user.cookie, 'Second')).json();

    const first = await open(user.cookie);
    first.send({ type: 'world.enter', data: { characterId: user.character.id } });
    await first.next('world.entered');

    const other = await open(user.cookie);
    other.send({ type: 'world.enter', data: { characterId: second.id } });
    const entered = await other.next('world.entered');

    expect(await first.closed).toBe(WsCloseCode.SESSION_REPLACED);
    expect(entered.data.players.map((p) => p.name)).toEqual(['Second']);
  });

  it('closes in-world connections when the session logs out', async () => {
    const user = await playerWithCharacter('Leaver');
    const s = await open(user.cookie);
    s.send({ type: 'world.enter', data: { characterId: user.character.id } });
    await s.next('world.entered');
    await t.app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: user.cookie },
    });
    expect(await s.closed).toBe(WsCloseCode.UNAUTHENTICATED);
  });

  it('relays world broadcasts from the bus (e.g. worker ticks) to players in the world', async () => {
    const user = await playerWithCharacter('Watcher');
    const s = await open(user.cookie);
    s.send({ type: 'world.enter', data: { characterId: user.character.id } });
    await s.next('world.entered');
    await publishToWorld(t.redis, t.ctx.world.id, {
      message: { type: 'world.tick', data: { tick: 99, at: new Date().toISOString() } },
    });
    expect((await s.next('world.tick')).data.tick).toBe(99);
  });
  it('hex chat: players on the same hex hear each other; history on arrival', async () => {
    const a = await playerWithCharacter('Talker');
    const b = await playerWithCharacter('Hearer');
    const sa = await open(a.cookie);
    sa.send({ type: 'world.enter', data: { characterId: a.character.id } });
    expect((await sa.next('world.entered')).data.chat).toEqual([]);
    const sb = await open(b.cookie);
    sb.send({ type: 'world.enter', data: { characterId: b.character.id } });
    await sb.next('world.entered');

    sa.send({ type: 'chat.send', data: { text: '  Well met!\u0007 ' } });
    const heard = (await sb.next('chat.message')).data.message;
    expect(heard).toMatchObject({ name: 'Talker', text: 'Well met!', hex: { q: -14, r: 2 } }); // the West capital (#43)
    expect((await sa.next('chat.message')).data.message.id).toBe(heard.id);

    // A newcomer gets the recent chat of the hex.
    const c = await playerWithCharacter('Latecomer');
    const sc = await open(c.cookie);
    sc.send({ type: 'world.enter', data: { characterId: c.character.id } });
    expect((await sc.next('world.entered')).data.chat.map((m) => m.text)).toEqual(['Well met!']);
  });

  it('hex chat: rejects empty or too long messages and chatting outside the world', async () => {
    const a = await playerWithCharacter('Quiet');
    const s = await open(a.cookie);
    s.send({ type: 'chat.send', data: { text: 'hello' } });
    expect((await s.next('error')).data.code).toBe('VALIDATION_FAILED');
    s.send({ type: 'world.enter', data: { characterId: a.character.id } });
    await s.next('world.entered');
    s.send({ type: 'chat.send', data: { text: '   ' } });
    expect((await s.next('error')).data.code).toBe('VALIDATION_FAILED');
    s.send({ type: 'chat.send', data: { text: 'x'.repeat(201) } });
    expect((await s.next('error')).data.code).toBe('VALIDATION_FAILED');
  });
});
