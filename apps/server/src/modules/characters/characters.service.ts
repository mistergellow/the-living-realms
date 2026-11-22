import {
  accounts,
  characters,
  characterSkills,
  worldEvents,
  type Character,
  type Database,
} from '@realms/db';
import {
  AP_RULES,
  apFullAt,
  checkMove,
  BASE_ATTRIBUTES,
  capitalOf,
  currentAp,
  getItemDef,
  getStarterKit,
  STARTER_ARMOR,
  STARTER_TOOLS,
  STARTER_OFFHANDS,
  STARTER_WEAPONS,
  validateCharacterName,
  validateCreationAttributes,
} from '@realms/game-core';
import {
  ErrorCode,
  type CharacterAppearance,
  type CharacterDto,
  MAX_PREPARED_SKILLS,
  type CreateCharacterRequest,
  type HexCoord,
  type NationId,
} from '@realms/shared';
import { and, eq, isNull } from 'drizzle-orm';
import { publishControl, publishToWorld } from '@realms/server-kit';
import type { AppContext } from '../../context.js';
import { AppError, errors, isUniqueViolation } from '../../lib/errors.js';
import { charactersRepository as repo } from './characters.repository.js';
import { itemsRepository } from './items.repository.js';
import { assertNotInRift } from './sheet.service.js';

export function toCharacterDto(c: Character, now: Date = new Date()): CharacterDto {
  const ap = currentAp(c.ap, c.apUpdatedAt, now);
  return {
    id: c.id,
    name: c.name,
    appearance: c.appearance as CharacterAppearance,
    position: { q: c.hexQ, r: c.hexR },
    nation: (c.nation as NationId | null) ?? null,
    ap: {
      current: Math.floor(ap),
      max: AP_RULES.max,
      perHour: AP_RULES.perHour,
      fullAt: apFullAt(ap, now)?.toISOString() ?? null,
    },
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

    // Request #43: points may stay unspent at creation (spend them on the sheet).
    const attrs = validateCreationAttributes(input.attributes ?? BASE_ATTRIBUTES);
    if (!attrs.ok)
      throw errors.validation(attrs.reason, [{ path: 'attributes', message: attrs.reason }]);
    // Request #43: a starting kit (sword, bow, dagger, or wand + Fireball);
    // `startingWeapon` is the older form, still accepted.
    const kit = input.starterKit ? getStarterKit(input.starterKit) : undefined;
    const startingWeapon = kit?.weapon ?? input.startingWeapon;
    const skills: readonly string[] = kit?.skills ?? [];
    if (!startingWeapon || !(STARTER_WEAPONS as string[]).includes(startingWeapon))
      throw errors.validation('Choose one of the starting kits.', [
        { path: 'starterKit', message: 'Choose one of the starting kits.' },
      ]);
    if (input.startingOffhand) {
      const offhandOk =
        (STARTER_OFFHANDS as string[]).includes(input.startingOffhand) &&
        !getItemDef(startingWeapon)!.twoHanded;
      if (!offhandOk)
        throw errors.validation('That off-hand cannot be used with this weapon.', [
          { path: 'startingOffhand', message: 'That off-hand cannot be used with this weapon.' },
        ]);
    }

    const { world } = this.ctx;
    const a = input.attributes ?? BASE_ATTRIBUTES;
    // Request #43: you start in the capital of your nation.
    const spawn = capitalOf(input.nation);
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
          hexQ: spawn.q,
          hexR: spawn.r,
          nation: input.nation,
          attrMight: a.might,
          attrAgility: a.agility,
          attrPrecision: a.precision,
          attrEndurance: a.endurance,
          attrIntellect: a.intellect,
          attrWill: a.will,
          attributePoints: attrs.unspent,
        });
        // Starter kit: the chosen weapon + basic armor, equipped.
        const kit: Array<{ defId: string; slot: string }> = [
          { defId: startingWeapon, slot: 'mainHand' },
          ...(input.startingOffhand ? [{ defId: input.startingOffhand, slot: 'offHand' }] : []),
          ...STARTER_ARMOR.map((defId) => ({ defId, slot: getItemDef(defId)!.slots[0]! })),
        ];
        await itemsRepository.insertMany(
          tx,
          kit.map(({ defId, slot }) => ({
            characterId: character.id,
            itemDefId: defId,
            equippedSlot: slot,
            source: 'starter',
          })),
        );
        // Basic profession tools, in the bag (request #51).
        await itemsRepository.insertMany(
          tx,
          STARTER_TOOLS.map((defId) => ({
            characterId: character.id,
            itemDefId: defId,
            equippedSlot: null,
            source: 'starter',
          })),
        );
        // Starting spells (the Fireball kit): learned and prepared.
        if (skills.length)
          await tx.insert(characterSkills).values(
            skills.slice(0, MAX_PREPARED_SKILLS).map((skillId, i) => ({
              characterId: character.id,
              skillId,
              loadoutSlot: i,
            })),
          );
        await tx.insert(worldEvents).values({
          worldId: world.id,
          type: 'character.created',
          actorAccountId: accountId,
          actorCharacterId: character.id,
          payload: {
            name: character.name,
            nation: input.nation,
            starterKit: input.starterKit ?? null,
            startingWeapon,
            startingOffhand: input.startingOffhand ?? null,
          },
        });
        return character;
      });
    } catch (err) {
      if (isUniqueViolation(err, 'characters_world_name_uq'))
        throw new AppError(409, ErrorCode.CHARACTER_NAME_TAKEN, 'That name is already taken.');
      throw err;
    }
  }

  /**
   * Travel (request #43): straight to any land hex, paying AP per hex. The
   * position changes at once; the other players see it through the bus.
   */
  async move(accountId: string, id: string, to: HexCoord): Promise<Character> {
    const moved = await this.db.transaction(async (tx) => {
      const [c] = await tx
        .select()
        .from(characters)
        .where(
          and(
            eq(characters.id, id),
            eq(characters.accountId, accountId),
            isNull(characters.deletedAt),
          ),
        )
        .for('update');
      if (!c) throw errors.notFound('Character');
      await assertNotInRift(tx, c.id);
      const now = new Date();
      const ap = currentAp(c.ap, c.apUpdatedAt, now);
      const check = checkMove({ q: c.hexQ, r: c.hexR }, to, ap);
      if (!check.ok) throw errors.validation(check.reason, [{ path: 'to', message: check.reason }]);
      const [row] = await tx
        .update(characters)
        .set({ hexQ: to.q, hexR: to.r, ap: ap - check.cost, apUpdatedAt: now })
        .where(eq(characters.id, c.id))
        .returning();
      return row!;
    });
    const position = { q: moved.hexQ, r: moved.hexR };
    await publishControl(this.ctx.redis, {
      kind: 'character.moved',
      characterId: moved.id,
      position,
    });
    await publishToWorld(this.ctx.redis, this.ctx.world.id, {
      message: { type: 'player.moved', data: { characterId: moved.id, position } },
    });
    return moved;
  }

  async delete(accountId: string, id: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const c = await repo.findOwned(tx, accountId, id);
      if (!c) throw errors.notFound('Character');
      await assertNotInRift(tx, id);
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
