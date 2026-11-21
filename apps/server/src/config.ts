import { z } from 'zod';

const bool = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');

/** Configuration is validated once at startup; the process refuses to boot if invalid. */
export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  WEB_ORIGIN: z
    .string()
    .default('http://localhost:5173')
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),
  COOKIE_SECURE: bool.default(false),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  TRUST_PROXY: bool.default(false),
  WEB_DIST_DIR: z.string().optional(),
  /** Apply pending DB migrations at startup (advisory-locked; safe with many instances). */
  MIGRATE_ON_START: bool.default(true),
  WORLD_SLUG: z.string().min(1).default('main'),
  MAX_CHARACTERS_PER_ACCOUNT: z.coerce.number().int().min(1).max(50).default(5),
  /** Max auth attempts (login/register) per IP per minute. */
  AUTH_RATE_LIMIT: z.coerce.number().int().min(1).default(10),
  /**
   * Admin tools (request #41): comma-separated account emails allowed to use
   * /api/admin (create items/abilities, grant them to characters). Empty = no admin.
   */
  ADMIN_EMAILS: z
    .string()
    .default('')
    .transform((s) =>
      s
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = configSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid configuration:\n${issues}`);
  }
  return parsed.data;
}
