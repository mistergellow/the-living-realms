/**
 * @realms/game-core: pure, deterministic game rules.
 *
 * Rules for this package:
 *  - No I/O (no database, network, clock or randomness unless injected).
 *  - Usable by the server (authoritative) and by the client (previews only).
 */
export * from './hex.js';
export * from './character.js';
