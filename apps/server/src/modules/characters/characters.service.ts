import { accounts, worldEvents, type Character, type Database } from '@realms/db';
import { validateCharacterName } from '@realms/game-core';
import {
  ErrorCode,
  type CharacterAppearance,
  type CharacterDto,
  type CreateCharacterRequest,
} from '@realms/shared';
import { eq } from 'drizzle-orm';
import type { AppContext } from '../../context.js';
import { AppError, errors, isUniqueViolation } from '../../lib/errors.js';
import { charactersRepository as repo } from './characters.repository.js';

export function toCharacterDto(c: Character): CharacterDto {
  return {
    id: c.id,
    name: c.name,
    appearance: c.appearance as CharacterAppearance,
    position: { q: c.hexQ, r: c.hexR },
    createdAt: c.createdAt.toISOString(),
    lastPlayedAt: c.lastPlayedAt?.toISOString() ?? null,
  };
}

export class CharactersService {
  private readonly db: Database;
  constructor(private readonly ctx: AppContext) {
    this.db = ctx.db;
  }

  get limit(): number {
    return this.ctx.config.MAX_CHARACTERS_PER_ACCOUNT;
  }

  list(accountId: string) {
    return repo.listByAccount(this.db, accountId);
  }

  async getOwned(accountId: string, id: string): Promise<Character> {
    const c = await repo.findOwned(this.db, accountId, id);
    if (!c) throw errors.notFound('Character');
    return c;
  }

  async create(accountId: string, input: CreateCharacterRequest): Promise<Character> {
    const name = validateCharacterName(input.name);
    if (!name.ok) throw errors.validation(name.reason, [{ path: 'name', message: name.reason }]);

    const { world } = this.ctx;
    try {
      return await this.db.transaction(async (tx) => {
        // Lock the account row: serializes concurrent creations so the limit can't be raced.
        await tx
          .select({ id: accounts.id })
          .from(accounts)
          .where(eq(accounts.id, accountId))
          .for('update');
        if ((await repo.countByAccount(tx, accountId)) >= this.limit)
          throw new AppError(
            409,
            ErrorCode.CHARACTER_LIMIT_REACHED,
            `You can have at most ${this.limit} characters.`,
          );

        const character = await repo.insert(tx, {
          accountId,
          worldId: world.id,
          name: name.name,
          appearance: input.appearance,
          hexQ: world.spawnQ,
          hexR: world.spawnR,
        });
        await tx.insert(worldEvents).values({
          worldId: world.id,
          type: 'character.created',
          actorAccountId: accountId,
          actorCharacterId: character.id,
          payload: { name: character.name },
        });
        return character;
      });
    } catch (err) {
      if (isUniqueViolation(err, 'characters_world_name_uq'))
        throw new AppError(409, ErrorCode.CHARACTER_NAME_TAKEN, 'That name is already taken.');
      throw err;
    }
  }

  async delete(accountId: string, id: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const c = await repo.findOwned(tx, accountId, id);
      if (!c) throw errors.notFound('Character');
      await repo.softDelete(tx, id);
      await tx.insert(worldEvents).values({
        worldId: c.worldId,
        type: 'character.deleted',
        actorAccountId: accountId,
        actorCharacterId: id,
        payload: { name: c.name },
      });
    });
  }
}
