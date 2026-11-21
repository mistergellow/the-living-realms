import { z } from 'zod';
import type { CharacterAppearance } from './api.js';

/* ---------------------------------------------------------------------------
 * Friends (A25: between characters) and Rift lobbies (up to 6 players).
 * Every request carries the acting characterId (the character being played).
 * ------------------------------------------------------------------------- */

export interface CharacterRefDto {
  characterId: string;
  name: string;
  appearance: CharacterAppearance;
  /** In the world right now. */
  online: boolean;
}

export interface FriendsDto {
  friends: CharacterRefDto[];
  /** Requests others sent to me. */
  incoming: CharacterRefDto[];
  /** Requests I sent. */
  outgoing: CharacterRefDto[];
}

export const characterScopedSchema = z.object({ characterId: z.uuid() });

export const friendRequestSchema = z.object({
  characterId: z.uuid(),
  /** Name of the character to befriend. */
  name: z.string().min(1).max(40),
});

// ---- Lobbies ----
export const LOBBY_MAX_MEMBERS = 6;
/** PvP arena lobbies (request #33, test mode): two teams of up to 6. */
export const PVP_ARENA_ID = 'pvp_arena';
export const PVP_MAX_MEMBERS = 12;
/** PvP slots: 0–5 = team A formation, 6–11 = team B formation (slot − 6). */
export const PVP_TEAM_B_OFFSET = 6;
export type LobbyVisibility = 'public' | 'private';
export type LobbyStatus = 'open' | 'started' | 'closed';

export interface LobbyMemberDto extends Omit<CharacterRefDto, 'online'> {
  slot: number;
  ready: boolean;
  isLeader: boolean;
  /** Short build summary, e.g. "Training Sword + Wooden Shield". */
  build: string;
}

export interface LobbyDto {
  id: string;
  riftId: string;
  /** 'pvp' = arena lobby: members split into team A (slots 0–5) and B (6–11). */
  mode: 'rift' | 'pvp';
  riftName: string;
  /** Rooms on any path to the boss (boss included). */
  depth: number;
  visibility: LobbyVisibility;
  status: LobbyStatus;
  leaderCharacterId: string;
  members: LobbyMemberDto[];
  maxMembers: number;
  /** Set once the leader starts: everyone goes to this run. */
  runId: string | null;
}

export interface LobbySummaryDto {
  id: string;
  riftName: string;
  leaderName: string;
  memberCount: number;
  maxMembers: number;
}

export interface LobbyInviteDto {
  lobbyId: string;
  riftName: string;
  from: string;
  memberCount: number;
}

export interface LobbyOverviewDto {
  /** The lobby this character is in, if any. */
  mine: LobbyDto | null;
  invites: LobbyInviteDto[];
  publicLobbies: LobbySummaryDto[];
}

export const createLobbySchema = z.object({
  characterId: z.uuid(),
  riftId: z.string().max(64),
  visibility: z.enum(['public', 'private']),
});

export const lobbyInviteSchema = z.object({ characterId: z.uuid(), friendCharacterId: z.uuid() });
export const lobbySlotSchema = z.object({
  characterId: z.uuid(),
  slot: z
    .number()
    .int()
    .min(0)
    .max(PVP_MAX_MEMBERS - 1),
});
export const lobbyReadySchema = z.object({ characterId: z.uuid(), ready: z.boolean() });
export const lobbyKickSchema = z.object({ characterId: z.uuid(), targetCharacterId: z.uuid() });
