import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createTestApp,
  registerUser,
  resetState,
  sessionCookie,
  TEST_ORIGIN,
  type TestApp,
} from './helpers.js';

let t: TestApp;
beforeAll(async () => (t = await createTestApp()));
beforeEach(() => resetState(t));
afterAll(() => t.close());

describe('health', () => {
  it('reports liveness and readiness', async () => {
    expect((await t.app.inject('/healthz')).json()).toEqual({ status: 'ok' });
    const ready = await t.app.inject('/readyz');
    expect(ready.statusCode).toBe(200);
    expect(ready.json().checks).toEqual({ database: true, redis: true });
  });

  it('returns structured 404s with a request id', async () => {
    const res = await t.app.inject('/api/nope');
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
    expect(res.headers['x-request-id']).toBeTruthy();
  });
});

describe('registration', () => {
  it('registers, sets a secure session cookie and logs in automatically', async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: '  Hero@Example.COM ', password: 'correct horse battery' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().account.email).toBe('hero@example.com');
    const cookie = res.cookies.find((c) => c.name === 'lr_session')!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe('Lax');

    const me = await t.app.inject({ url: '/api/auth/me', headers: { cookie: sessionCookie(res) } });
    expect(me.statusCode).toBe(200);
    expect(me.json().account.email).toBe('hero@example.com');
  });

  it('stores an argon2id hash, never the password', async () => {
    await registerUser(t.app, 'hash@example.com');
    const [row] = await t.dbHandle
      .sql`select password_hash from accounts where email = 'hash@example.com'`;
    expect(row!.password_hash).toMatch(/^\$argon2id\$/);
  });

  it('rejects duplicate emails (case-insensitive)', async () => {
    await registerUser(t.app, 'dup@example.com');
    const res = await t.app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'DUP@example.com', password: 'another password' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('EMAIL_TAKEN');
  });

  it('validates email and password', async () => {
    const bad = await t.app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'not-an-email', password: 'short' },
    });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error.code).toBe('VALIDATION_FAILED');
    expect(bad.json().error.details.length).toBeGreaterThanOrEqual(2);
  });
});

describe('login / logout', () => {
  it('logs in with correct credentials only', async () => {
    await registerUser(t.app, 'login@example.com');
    const wrong = await t.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'login@example.com', password: 'wrong password' },
    });
    expect(wrong.statusCode).toBe(401);
    expect(wrong.json().error.code).toBe('INVALID_CREDENTIALS');

    const unknown = await t.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'ghost@example.com', password: 'whatever pass' },
    });
    expect(unknown.statusCode).toBe(401);
    expect(unknown.json().error.code).toBe('INVALID_CREDENTIALS');

    const ok = await t.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'LOGIN@example.com', password: 'correct horse battery' },
    });
    expect(ok.statusCode).toBe(200);
  });

  it('revokes the session on logout', async () => {
    const { cookie } = await registerUser(t.app);
    const out = await t.app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie },
    });
    expect(out.statusCode).toBe(204);
    const me = await t.app.inject({ url: '/api/auth/me', headers: { cookie } });
    expect(me.statusCode).toBe(401);
  });

  it('rejects forged session tokens', async () => {
    const me = await t.app.inject({
      url: '/api/auth/me',
      headers: { cookie: 'lr_session=forged' },
    });
    expect(me.statusCode).toBe(401);
  });
});

describe('security', () => {
  it('blocks state-changing requests from foreign origins (CSRF)', async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { origin: 'https://evil.example' },
      payload: { email: 'a@example.com', password: 'whatever pass' },
    });
    expect(res.statusCode).toBe(403);
    const allowed = await t.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { origin: TEST_ORIGIN },
      payload: { email: 'a@example.com', password: 'whatever pass' },
    });
    expect(allowed.statusCode).toBe(401);
  });

  it('sends security headers', async () => {
    const res = await t.app.inject('/healthz');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeTruthy();
  });

  it('rate limits authentication attempts', async () => {
    const limited = await createTestApp({ AUTH_RATE_LIMIT: '3' });
    try {
      const attempt = () =>
        limited.app.inject({
          method: 'POST',
          url: '/api/auth/login',
          payload: { email: 'x@example.com', password: 'whatever pass' },
        });
      for (let i = 0; i < 3; i++) expect((await attempt()).statusCode).toBe(401);
      const blocked = await attempt();
      expect(blocked.statusCode).toBe(429);
      expect(blocked.json().error.code).toBe('RATE_LIMITED');
    } finally {
      await limited.close();
    }
  });
});
