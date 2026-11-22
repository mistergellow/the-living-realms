import type { HexCoord } from '@realms/shared';
import { hexDistance } from '../hex.js';
import { REGIONS, REGION_IDS, mapHexAt } from './world-map.js';

/*
 * Guilds (request #57). Up to 16 members; the leader invites and removes
 * members. A guild has an emblem (icon + colour), reputation earned by doing
 * things together (Rifts with other members), a gold bank, a shared storage
 * and can buy a plot of land on the map. PROVISIONAL numbers (A123).
 */
export const GUILD_RULES = {
  maxMembers: 16,
  /** Gold the founder pays. */
  createCost: 500,
  /** Gold the guild bank pays for its land. */
  landCost: 2000,
  /** Items (stacks count as one) the guild storage holds. */
  storageSlots: 40,
  nameMin: 3,
  nameMax: 24,
  /** Guild members needed in a victorious party for the guild to earn reputation. */
  membersForReputation: 2,
  /** Land is never this close to a capital. */
  landCapitalDistance: 3,
} as const;

export const GUILD_ICONS = [
  'shield',
  'sword',
  'crown',
  'tower',
  'dragon',
  'wolf',
  'eagle',
  'star',
  'flame',
  'skull',
  'tree',
  'anchor',
] as const;
export type GuildIcon = (typeof GUILD_ICONS)[number];

export const GUILD_COLORS = [
  '#c9a227',
  '#b3261e',
  '#2e7d32',
  '#1565c0',
  '#6a1b9a',
  '#ef6c00',
  '#00838f',
  '#546e7a',
  '#ad1457',
  '#6d4c41',
] as const;

/** Null when the name is fine, otherwise why not. */
export function checkGuildName(name: string): string | null {
  const n = name.trim();
  if (n.length < GUILD_RULES.nameMin || n.length > GUILD_RULES.nameMax)
    return `A guild name has ${GUILD_RULES.nameMin} to ${GUILD_RULES.nameMax} characters.`;
  if (!/^[A-Za-z0-9' -]+$/.test(n)) return "Use letters, numbers, spaces, - and ' only.";
  return null;
}

/** Null when a guild may claim this hex, otherwise why not. */
export function checkGuildLand(hex: HexCoord): string | null {
  const h = mapHexAt(hex);
  if (!h) return 'That is the sea.';
  if (h.terrain === 'city') return 'Capitals belong to the crown.';
  if (h.terrain === 'river') return 'You cannot build on a river.';
  for (const id of REGION_IDS) {
    const cap = REGIONS[id].capital;
    if (cap && hexDistance(cap.hex, hex) < GUILD_RULES.landCapitalDistance)
      return 'Too close to a capital.';
  }
  return null;
}

/**
 * Reputation a guild earns from one victorious run: what its members in the
 * party earned, if at least `membersForReputation` of them fought together.
 */
export function guildRunReputation(memberReputations: number[]): number {
  if (memberReputations.length < GUILD_RULES.membersForReputation) return 0;
  return memberReputations.reduce((s, r) => s + Math.max(0, r), 0);
}
