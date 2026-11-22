import { z } from 'zod';
import type { ItemDto } from './api.js';

/* Guilds (request #57). */

export interface GuildMemberDto {
  characterId: string;
  name: string;
  role: 'leader' | 'member';
  joinedAt: string;
}

export interface GuildDto {
  id: string;
  name: string;
  icon: string;
  color: string;
  reputation: number;
  /** Gold in the guild bank. */
  gold: number;
  members: GuildMemberDto[];
  maxMembers: number;
  land: { q: number; r: number } | null;
  storage: ItemDto[];
  storageSlots: number;
  /** Characters invited and not yet answered (leader's view). */
  invited: Array<{ characterId: string; name: string }>;
}

export interface GuildInviteDto {
  guildId: string;
  guildName: string;
  icon: string;
  color: string;
  members: number;
  invitedBy: string | null;
}

/** Everything the guild screen needs for one character. */
export interface GuildViewDto {
  guild: GuildDto | null;
  /** Your role in it. */
  role: 'leader' | 'member' | null;
  /** Invitations you can accept (when you have no guild). */
  invites: GuildInviteDto[];
  /** Guild storage can be used here (a capital or the guild's land). */
  storageHere: boolean;
  /** Why the guild cannot buy the hex you stand on (null = it can). */
  landHere: string | null;
  /** Your gold and bag, for deposits. */
  gold: number;
  bag: ItemDto[];
  rules: {
    maxMembers: number;
    createCost: number;
    landCost: number;
    storageSlots: number;
    icons: readonly string[];
    colors: readonly string[];
  };
  /** Result of the last action, if any. */
  message: string | null;
}

export const createGuildSchema = z.object({
  name: z.string().trim().min(3).max(24),
  icon: z.string().max(32),
  color: z.string().max(16),
});
export const updateGuildSchema = z.object({
  icon: z.string().max(32).optional(),
  color: z.string().max(16).optional(),
});
export const guildInviteSchema = z.object({ name: z.string().trim().min(1).max(40) });
export const guildGoldSchema = z.object({ amount: z.number().int().min(1).max(1_000_000_000) });
export const guildItemSchema = z.object({ itemId: z.uuid() });
export const guildMemberSchema = z.object({ characterId: z.uuid() });
