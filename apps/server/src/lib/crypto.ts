import { createHash, randomBytes } from 'node:crypto';

/** 256-bit opaque token, URL-safe. */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
