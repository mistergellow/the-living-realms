import { z } from 'zod';
import type { CharacterAppearance } from './api.js';
import type { RiftRoomDto } from './combat.js';

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
  riftName: string;
  rooms: RiftRoomDto[];
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
  slot: z.number().int().min(0).max(5),
});
export const lobbyReadySchema = z.object({ characterId: z.uuid(), ready: z.boolean() });
export const lobbyKickSchema = z.object({ characterId: z.uuid(), targetCharacterId: z.uuid() });
