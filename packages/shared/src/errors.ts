/**
 * Stable, machine-readable error codes shared by server and client.
 * The client must branch on `code`, never on the human message.
 */
export const ErrorCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  CHARACTER_NAME_TAKEN: 'CHARACTER_NAME_TAKEN',
  CHARACTER_LIMIT_REACHED: 'CHARACTER_LIMIT_REACHED',
  INVALID_EQUIPMENT: 'INVALID_EQUIPMENT',
  IN_RIFT: 'IN_RIFT',
  IN_LOBBY: 'IN_LOBBY',
  LOBBY_FULL: 'LOBBY_FULL',
  NOT_LEADER: 'NOT_LEADER',
  NOT_READY: 'NOT_READY',
  ALREADY_FRIENDS: 'ALREADY_FRIENDS',
  INVALID_ACTION: 'INVALID_ACTION',
  NOT_YOUR_TURN: 'NOT_YOUR_TURN',
  RATE_LIMITED: 'RATE_LIMITED',
  /** You must stand on a certain hex (a Rift entrance, the world boss — request #43). */
  NOT_HERE: 'NOT_HERE',
  /** Not enough Action Points (request #50). */
  NOT_ENOUGH_AP: 'NOT_ENOUGH_AP',
  /** Request #50. */
  BAG_FULL: 'BAG_FULL',
  NOT_ENOUGH_GOLD: 'NOT_ENOUGH_GOLD',
  /** The world boss allows one fight per character per day (request #43). */
  NO_ATTEMPTS_LEFT: 'NO_ATTEMPTS_LEFT',
  INTERNAL: 'INTERNAL',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ApiErrorBody {
  error: { code: ErrorCode; message: string; details?: unknown; requestId?: string };
}
