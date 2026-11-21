import { defineConfig, devices } from '@playwright/test';

/*
 * End-to-end tests: real browser -> Vite -> API server -> PostgreSQL/Redis.
 * Uses separate ports (5174/3100) and the TEST database so it never touches
 * your development data. Requires Postgres and Redis running (pnpm infra:up).
 */
const API_PORT = 3100;
const WEB_PORT = 5174;
const env = {
  ...process.env,
  NODE_ENV: 'test',
  LOG_LEVEL: 'warn',
  PORT: String(API_PORT),
  DATABASE_URL:
    process.env.TEST_DATABASE_URL ?? 'postgres://realms:realms@localhost:5432/living_realms_test',
  REDIS_URL: process.env.TEST_REDIS_URL ?? 'redis://localhost:6379/15',
  WEB_ORIGIN: `http://localhost:${WEB_PORT}`,
  WEB_PORT: String(WEB_PORT),
  API_URL: `http://localhost:${API_PORT}`,
  WORLD_TICK_MS: '1000',
  // Every test registers/logs in from the same IP: keep the auth rate limit out of the way.
  AUTH_RATE_LIMIT: '100',
  // Admin tools (request #41): e2e/admin.spec.ts logs in with this account.
  ADMIN_EMAILS: 'e2e-admin@example.com',
} as Record<string, string>;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://localhost:${WEB_PORT}`, trace: 'off' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command:
        'pnpm --filter @realms/db migrate && pnpm --filter @realms/server exec tsx src/main.ts',
      url: `http://localhost:${API_PORT}/readyz`,
      env,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter @realms/worker exec tsx src/main.ts',
      env: { ...env, LOG_LEVEL: 'info', NODE_ENV: 'production' },
      wait: { stdout: /leader acquired|standing by/ },
      reuseExistingServer: false,
    },
    {
      command: 'pnpm --filter @realms/web exec vite',
      url: `http://localhost:${WEB_PORT}`,
      env,
      reuseExistingServer: false,
    },
  ],
});
