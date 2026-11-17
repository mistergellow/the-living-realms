import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Loads the repository-root `.env` (if present) into process.env without
 * overriding variables that are already set. In production, configuration
 * comes from the real environment and no file is needed.
 */
export function loadEnv(): void {
  const candidates = [
    process.env.ENV_FILE,
    resolve(process.cwd(), '.env'),
    resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env'),
  ].filter((p): p is string => !!p);
  const file = candidates.find((p) => existsSync(p));
  if (!file) return;
  const before = { ...process.env };
  process.loadEnvFile(file);
  // process.loadEnvFile does not override existing vars on Node >= 22, but be explicit.
  for (const [k, v] of Object.entries(before)) process.env[k] = v;
}
