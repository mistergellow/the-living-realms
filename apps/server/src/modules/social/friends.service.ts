import { characters, friendships, type Database } from '@realms/db';
import {
  ErrorCode,
  type CharacterAppearance,
  type CharacterRefDto,
  type FriendsDto,
} from '@realms/shared';
import { and, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import type { AppContext } from '../../context.js';
import { AppError, errors } from '../../lib/errors.js';
import type { CharacterSheetService } from '../characters/sheet.service.js';
import { onlineCharacterIds } from './presence-status.js';

/** Friendships are stored once per pair with ordered ids. */
const pair = (x: string, y: string) => (x < y ? { a: x, b: y } : { a: y, b: x });

export class FriendsService {
  private readonly db: Database;
  constructor(
    private readonly ctx: AppContext,
    private readonly sheets: CharacterSheetService,
  ) {
    this.db = ctx.db;
  }

  async list(accountId: string, characterId: string): Promise<FriendsDto> {
    await this.sheets.getOwnedCharacter(this.db, accountId, characterId);
    const rows = await this.db
      .select()
      .from(friendships)
      .where(or(eq(friendships.characterA, characterId), eq(friendships.characterB, characterId)));
    const otherOf = (r: (typeof rows)[number]) =>
      r.characterA === characterId ? r.characterB : r.characterA;
    const otherIds = rows.map(otherOf);
    const others = otherIds.length
      ? await this.db
          .select({ id: characters.id, name: characters.name, appearance: characters.appearance })
          .from(characters)
          .where(and(inArray(characters.id, otherIds), isNull(characters.deletedAt)))
      : [];
    const online = await onlineCharacterIds(
      this.ctx,
      this.db,
      others.map((o) => o.id),
    );
    const ref = (id: string): CharacterRefDto | null => {
      const o = others.find((x) => x.id === id);
      return o
        ? {
            characterId: o.id,
            name: o.name,
            appearance: o.appearance as CharacterAppearance,
            online: online.has(o.id),
          }
        : null;
    };
    const out: FriendsDto = { friends: [], incoming: [], outgoing: [] };
    for (const r of rows) {
      const other = ref(otherOf(r));
      if (!other) continue;
      if (r.status === 'accepted') out.friends.push(other);
      else if (r.requestedBy === characterId) out.outgoing.push(other);
      else out.incoming.push(other);
    }
    const byName = (x: CharacterRefDto, y: CharacterRefDto) =>
      Number(y.online) - Number(x.online) || x.name.localeCompare(y.name);
    out.friends.sort(byName);
    return out;
  }

  /** Send a request by character name. A crossed request is accepted at once. */
  async request(accountId: string, characterId: string, name: string): Promise<FriendsDto> {
    await this.sheets.getOwnedCharacter(this.db, accountId, characterId);
    const [target] = await this.db
      .select({ id: characters.id, accountId: characters.accountId })
      .from(characters)
      .where(
        and(
          eq(characters.worldId, this.ctx.world.id),
          sql`lower(${characters.name}) = lower(${name.trim()})`,
          isNull(characters.deletedAt),
        ),
      );
    if (!target) throw errors.notFound('Character');
    if (target.id === characterId) throw errors.validation('You cannot add yourself.');
    if (target.accountId === accountId)
      throw errors.validation('That is one of your own characters.');

    const { a, b } = pair(characterId, target.id);
    await this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(friendships)
        .where(and(eq(friendships.characterA, a), eq(friendships.characterB, b)))
        .for('update');
      if (existing?.status === 'accepted')
        throw new AppError(409, ErrorCode.ALREADY_FRIENDS, 'You are already friends.');
      if (existing && existing.requestedBy === characterId)
        throw new AppError(409, ErrorCode.CONFLICT, 'Friend request already sent.');
      if (existing) {
        await tx
          .update(friendships)
          .set({ status: 'accepted', acceptedAt: new Date() })
          .where(and(eq(friendships.characterA, a), eq(friendships.characterB, b)));
      } else {
        await tx
          .insert(friendships)
          .values({ characterA: a, characterB: b, requestedBy: characterId });
      }
    });
    return this.list(accountId, characterId);
  }

  async accept(accountId: string, characterId: string, otherId: string): Promise<FriendsDto> {
    await this.sheets.getOwnedCharacter(this.db, accountId, characterId);
    const { a, b } = pair(characterId, otherId);
    const updated = await this.db
      .update(friendships)
      .set({ status: 'accepted', acceptedAt: new Date() })
      .where(
        and(
          eq(friendships.characterA, a),
          eq(friendships.characterB, b),
          eq(friendships.status, 'pending'),
          eq(friendships.requestedBy, otherId),
        ),
      )
      .returning();
    if (updated.length === 0) throw errors.notFound('Friend request');
    return this.list(accountId, characterId);
  }

  /** Decline, cancel or unfriend. */
  async remove(accountId: string, characterId: string, otherId: string): Promise<FriendsDto> {
    await this.sheets.getOwnedCharacter(this.db, accountId, characterId);
    const { a, b } = pair(characterId, otherId);
    await this.db
      .delete(friendships)
      .where(and(eq(friendships.characterA, a), eq(friendships.characterB, b)));
    return this.list(accountId, characterId);
  }

  async areFriends(x: string, y: string): Promise<boolean> {
    const { a, b } = pair(x, y);
    const [row] = await this.db
      .select({ s: friendships.status })
      .from(friendships)
      .where(and(eq(friendships.characterA, a), eq(friendships.characterB, b)));
    return row?.s === 'accepted';
  }
}
