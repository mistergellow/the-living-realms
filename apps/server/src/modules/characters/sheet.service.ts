import {
  characterSkills,
  characters,
  items,
  worldEvents,
  type Character,
  type Database,
  type DbOrTx,
  type Item,
} from '@realms/db';
import {
  ABILITIES,
  abilityMultipliers,
  applyRead,
  ATTRIBUTE_NAMES,
  bookOfItem,
  booksForRank,
  getAbility,
  getOrigin,
  rankLabel,
  READ_RULES,
  readCheck,
  SKILL_RULES,
  SKILL_SCHOOL_NAMES,
  skillRankMultiplier,
  getSkillBook,
  asBaseAttributes,
  availableAbilities,
  computeStats,
  describeEffects,
  describeScaling,
  describeTargeting,
  validateAllocation,
  emptyEquipment,
  getItemDef,
  isBroken,
  planEquip,
  weaponInfo,
  type BaseAttributes,
  type OwnedItem,
} from '@realms/game-core';
import {
  ErrorCode,
  type Attributes,
  type CharacterAppearance,
  type BookInfoDto,
  type CharacterSheetDto,
  type EquipSlot,
  type ItemDto,
  type OriginDto,
  type ReadBookResultDto,
  type SkillDto,
} from '@realms/shared';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { randomInt } from 'node:crypto';
import { AppError, errors } from '../../lib/errors.js';
import { toCharacterDto } from './characters.service.js';
import { itemsRepository } from './items.repository.js';
import { riftsRepository } from '../rifts/rifts.repository.js';

/** Equipment and character changes are locked while inside a Rift. */
export async function assertNotInRift(db: DbOrTx, characterId: string): Promise<void> {
  if (await riftsRepository.activeRunIdFor(db, characterId))
    throw new AppError(409, ErrorCode.IN_RIFT, 'Not possible while inside a Rift.');
}

/**
 * BASE attributes of a character: creation + spent points, never equipment or
 * buffs. The single source of base stats for exploration tests (request #31).
 */
export const baseAttributesOf = (c: Character): BaseAttributes =>
  asBaseAttributes({
    might: c.attrMight,
    agility: c.attrAgility,
    precision: c.attrPrecision,
    endurance: c.attrEndurance,
    intellect: c.attrIntellect,
    will: c.attrWill,
  });

const toOwned = (i: Item): OwnedItem => ({
  id: i.id,
  defId: i.itemDefId,
  quality: i.quality,
  equippedSlot: i.equippedSlot as EquipSlot | null,
  upgradeLevel: i.upgradeLevel,
});

type Learned = { skillId: string; rank: number; progress: number };
const rankMap = (skills: Learned[]) => Object.fromEntries(skills.map((k) => [k.skillId, k.rank]));

/** What a skill book would do for this character (request #36). */
function bookInfo(
  defId: string,
  base: Attributes,
  ranks: Record<string, number>,
): BookInfoDto | null {
  const book = bookOfItem(defId);
  if (!book) return null;
  const rank = ranks[book.skillId] ?? 0;
  const check = readCheck(book, base, rank);
  return {
    skillId: book.skillId,
    skillName: ABILITIES[book.skillId].name,
    school: SKILL_SCHOOL_NAMES[book.school],
    requirement:
      book.minimum === undefined
        ? null
        : {
            attribute: book.studyAttribute,
            name: ATTRIBUTE_NAMES[book.studyAttribute],
            minimum: book.minimum,
          },
    readable: check.ok,
    reason: check.ok ? null : check.reason,
    chance: check.ok ? check.chance : 0,
    currentRank: rankLabel(rank),
  };
}

function toSkillDto(k: Learned): SkillDto | null {
  const a = getAbility(k.skillId);
  if (!a) return null;
  const book = getSkillBook(k.skillId);
  const next = k.rank < SKILL_RULES.maxRank ? k.rank + 1 : null;
  return {
    id: a.id,
    name: a.name,
    school: book ? SKILL_SCHOOL_NAMES[book.school] : '',
    rank: k.rank,
    rankLabel: rankLabel(k.rank),
    progress: k.progress,
    needed: next ? booksForRank(next) : 0,
    nextRankLabel: next ? rankLabel(next) : null,
    power: Math.round(skillRankMultiplier(k.rank) * 100),
  };
}

export function toOriginDto(id: string | null): OriginDto | null {
  const o = getOrigin(id);
  return o ? { id: o.id, name: o.name, description: o.description, language: o.language } : null;
}

function toItemDto(
  i: Item,
  base: Attributes = asBaseAttributes(BASE_FALLBACK),
  ranks: Record<string, number> = {},
): ItemDto {
  const def = getItemDef(i.itemDefId);
  return {
    id: i.id,
    defId: i.itemDefId,
    name: (def?.name ?? i.itemDefId) + (i.upgradeLevel > 0 ? ` +${i.upgradeLevel}` : ''),
    kind: def?.kind ?? 'accessory',
    description: def?.description ?? '',
    quality: i.quality,
    quantity: i.quantity,
    broken: isBroken(i.quality),
    equippedSlot: i.equippedSlot as EquipSlot | null,
    slots: def?.slots ?? [],
    twoHanded: def?.twoHanded ?? false,
    bonuses: def?.bonuses ?? {},
    armor: def?.armor ?? 0,
    magicResist: def?.magicResist ?? 0,
    weapon: weaponInfo(def?.weaponType, {
      upgradeLevel: i.upgradeLevel,
      specials: i.specials,
      runeSlots: i.runeSlots,
    }),
    book: bookInfo(i.itemDefId, base, ranks),
  };
}

const BASE_FALLBACK: Attributes = {
  might: 5,
  agility: 5,
  precision: 5,
  endurance: 5,
  intellect: 5,
  will: 5,
};

/** Assembles the character sheet and applies equipment changes. */
export class CharacterSheetService {
  constructor(private readonly db: Database) {}

  async getSheet(accountId: string, characterId: string): Promise<CharacterSheetDto> {
    return this.buildSheet(this.db, await this.getOwnedCharacter(this.db, accountId, characterId));
  }

  async equip(accountId: string, characterId: string, itemId: string, slot: EquipSlot) {
    return this.db.transaction(async (tx) => {
      const c = await this.getOwnedCharacter(tx, accountId, characterId, true);
      await assertNotInRift(tx, c.id);
      const owned = (await itemsRepository.listByCharacter(tx, c.id)).map(toOwned);
      const plan = planEquip(owned, itemId, slot);
      if (!plan.ok) throw new AppError(400, ErrorCode.INVALID_EQUIPMENT, plan.reason);
      // Free the slots first (unique slot index), then place the item.
      await itemsRepository.unequip(tx, plan.unequip);
      await itemsRepository.setSlot(tx, itemId, slot);
      return this.buildSheet(tx, c);
    });
  }

  /** Spend unspent attribute points (same per-attribute cap as creation). */
  async allocate(accountId: string, characterId: string, add: Partial<Attributes>) {
    return this.db.transaction(async (tx) => {
      const c = await this.getOwnedCharacter(tx, accountId, characterId, true);
      await assertNotInRift(tx, c.id);
      const res = validateAllocation(baseAttributesOf(c), add, c.attributePoints);
      if (!res.ok) throw errors.validation(res.reason, [{ path: 'add', message: res.reason }]);
      const r = res.result;
      const [updated] = await tx
        .update(characters)
        .set({
          attrMight: r.might,
          attrAgility: r.agility,
          attrPrecision: r.precision,
          attrEndurance: r.endurance,
          attrIntellect: r.intellect,
          attrWill: r.will,
          attributePoints: c.attributePoints - res.used,
        })
        .where(eq(characters.id, c.id))
        .returning();
      return this.buildSheet(tx, updated!);
    });
  }

  async unequip(accountId: string, characterId: string, slot: EquipSlot) {
    return this.db.transaction(async (tx) => {
      const c = await this.getOwnedCharacter(tx, accountId, characterId, true);
      await assertNotInRift(tx, c.id);
      const item = (await itemsRepository.listByCharacter(tx, c.id)).find(
        (i) => i.equippedSlot === slot,
      );
      if (item) await itemsRepository.setSlot(tx, item.id, null);
      return this.buildSheet(tx, c);
    });
  }

  /** Loads a living character owned by the account; `lock` serialises concurrent changes. */
  async getOwnedCharacter(
    db: DbOrTx,
    accountId: string,
    id: string,
    lock = false,
  ): Promise<Character> {
    const q = db
      .select()
      .from(characters)
      .where(
        and(
          eq(characters.id, id),
          eq(characters.accountId, accountId),
          isNull(characters.deletedAt),
        ),
      );
    const [c] = lock ? await q.for('update') : await q;
    if (!c) throw errors.notFound('Character');
    return c;
  }

  /** What the combat engine needs to know about a character. */
  async combatProfile(db: DbOrTx, c: Character) {
    const [rows, skills] = await Promise.all([
      itemsRepository.listByCharacter(db, c.id),
      itemsRepository.learnedSkills(db, c.id),
    ]);
    const owned = rows.map(toOwned);
    return {
      appearance: c.appearance as CharacterAppearance,
      baseAttributes: baseAttributesOf(c),
      ...computeStats(baseAttributesOf(c), owned),
      abilityIds: availableAbilities(
        owned,
        skills.map((k) => k.skillId),
      ).map((a) => a.ability.id),
      abilityMultipliers: abilityMultipliers(owned, rankMap(skills)),
    };
  }

  /**
   * Read a skill book (request #36): using an item from the inventory. Costs
   * time (AP later), needs the book's BASE attribute minimum, may fail, and
   * the book is consumed either way.
   */
  async readBook(
    accountId: string,
    characterId: string,
    itemId: string,
  ): Promise<ReadBookResultDto> {
    return this.db.transaction(async (tx) => {
      const c = await this.getOwnedCharacter(tx, accountId, characterId, true);
      await assertNotInRift(tx, c.id);
      const [item] = await tx
        .select()
        .from(items)
        .where(and(eq(items.id, itemId), eq(items.characterId, c.id)))
        .for('update');
      const book = item && bookOfItem(item.itemDefId);
      if (!item || !book) throw this.invalid('That is not a book you own.');
      if (c.readReadyAt && c.readReadyAt.getTime() > Date.now()) {
        const s = Math.ceil((c.readReadyAt.getTime() - Date.now()) / 1000);
        throw this.invalid(`You need a moment before reading again (${s}s).`);
      }
      const skills = await itemsRepository.learnedSkills(tx, c.id);
      const current = skills.find((k) => k.skillId === book.skillId);
      const check = readCheck(book, baseAttributesOf(c), current?.rank ?? 0);
      if (!check.ok) throw this.invalid(check.reason);

      // The book is consumed, success or not.
      if (item.quantity > 1)
        await tx
          .update(items)
          .set({ quantity: sql`${items.quantity} - 1` })
          .where(eq(items.id, item.id));
      else await tx.delete(items).where(eq(items.id, item.id));

      const outcome = applyRead(
        { rank: current?.rank ?? 0, progress: current?.progress ?? 0 },
        check.chance,
        randomInt(100),
      );
      if (outcome.success)
        await tx
          .insert(characterSkills)
          .values({
            characterId: c.id,
            skillId: book.skillId,
            rank: outcome.rank,
            progress: outcome.progress,
          })
          .onConflictDoUpdate({
            target: [characterSkills.characterId, characterSkills.skillId],
            set: { rank: outcome.rank, progress: outcome.progress, updatedAt: new Date() },
          });
      const [updated] = await tx
        .update(characters)
        .set({ readReadyAt: new Date(Date.now() + READ_RULES.cooldownSeconds * 1000) })
        .where(eq(characters.id, c.id))
        .returning();
      const learned = outcome.rankedUp && outcome.rank === 1;
      if (outcome.rankedUp)
        await tx.insert(worldEvents).values({
          worldId: c.worldId,
          type: learned ? 'skill.learned' : 'skill.rank_up',
          actorAccountId: accountId,
          actorCharacterId: c.id,
          payload: { skillId: book.skillId, rank: outcome.rank },
        });

      const name = ABILITIES[book.skillId].name;
      const need = booksForRank(outcome.rank + 1);
      const message = !outcome.success
        ? `You could not make sense of the book. It crumbles to dust.`
        : learned
          ? `You learned ${name}!`
          : outcome.rankedUp
            ? `${name} is now rank ${rankLabel(outcome.rank)}!`
            : `Progress on ${name}: ${outcome.progress} / ${need} towards rank ${rankLabel(outcome.rank + 1)}.`;
      return {
        success: outcome.success,
        chance: outcome.chance,
        message,
        rankedUp: outcome.rankedUp,
        learned,
        sheet: await this.buildSheet(tx, updated!),
      };
    });
  }

  /** Characters made before origins existed choose theirs once (request #36). */
  async setOrigin(accountId: string, characterId: string, origin: string) {
    return this.db.transaction(async (tx) => {
      const c = await this.getOwnedCharacter(tx, accountId, characterId, true);
      if (c.origin) throw this.invalid('Your country of origin is chosen only once.');
      if (!getOrigin(origin))
        throw errors.validation('Choose your country of origin.', [
          { path: 'origin', message: 'Choose your country of origin.' },
        ]);
      const [updated] = await tx
        .update(characters)
        .set({ origin })
        .where(eq(characters.id, c.id))
        .returning();
      return this.buildSheet(tx, updated!);
    });
  }

  private invalid(message: string) {
    return new AppError(400, ErrorCode.INVALID_ACTION, message);
  }

  private async buildSheet(db: DbOrTx, c: Character): Promise<CharacterSheetDto> {
    const [rows, skills] = await Promise.all([
      itemsRepository.listByCharacter(db, c.id),
      itemsRepository.learnedSkills(db, c.id),
    ]);
    const owned = rows.map(toOwned);
    const base = baseAttributesOf(c);
    const { attributes, stats } = computeStats(base, owned);
    const ranks = rankMap(skills);

    const equipment = emptyEquipment<ItemDto>();
    const inventory: ItemDto[] = [];
    for (const row of rows) {
      const dto = toItemDto(row, base, ranks);
      if (dto.equippedSlot) equipment[dto.equippedSlot] = dto;
      else inventory.push(dto);
    }

    return {
      character: toCharacterDto(c),
      baseAttributes: base,
      attributes,
      stats,
      equipment,
      inventory,
      abilities: availableAbilities(
        owned,
        skills.map((k) => k.skillId),
      ).map(({ ability, grantedBy }) => ({
        id: ability.id,
        name: ability.name,
        description: ability.description,
        source: ability.source,
        grantedBy,
        focusCost: ability.focusCost,
        manaCost: ability.manaCost,
        targeting: describeTargeting(ability.targeting),
        effects: describeEffects(ability),
        scaling: describeScaling(ability.scaling),
        rank: ranks[ability.id] ? rankLabel(ranks[ability.id]!) : null,
      })),
      reputation: c.reputation,
      attributePoints: c.attributePoints,
      skills: skills.flatMap((k) => toSkillDto(k) ?? []),
      origin: toOriginDto(c.origin),
      readReadyAt:
        c.readReadyAt && c.readReadyAt.getTime() > Date.now() ? c.readReadyAt.toISOString() : null,
    };
  }
}
