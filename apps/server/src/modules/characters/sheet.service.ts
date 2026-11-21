import { characters, type Character, type Database, type DbOrTx, type Item } from '@realms/db';
import {
  abilityMultipliers,
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
  type CharacterSheetDto,
  type EquipSlot,
  type ItemDto,
} from '@realms/shared';
import { and, eq, isNull } from 'drizzle-orm';
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

function toItemDto(i: Item): ItemDto {
  const def = getItemDef(i.itemDefId);
  return {
    id: i.id,
    defId: i.itemDefId,
    name: (def?.name ?? i.itemDefId) + (i.upgradeLevel > 0 ? ` +${i.upgradeLevel}` : ''),
    kind: def?.kind ?? 'accessory',
    description: def?.description ?? '',
    quality: i.quality,
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
  };
}

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
      itemsRepository.learnedSkillIds(db, c.id),
    ]);
    const owned = rows.map(toOwned);
    return {
      appearance: c.appearance as CharacterAppearance,
      baseAttributes: baseAttributesOf(c),
      ...computeStats(baseAttributesOf(c), owned),
      abilityIds: availableAbilities(owned, skills).map((a) => a.ability.id),
      abilityMultipliers: abilityMultipliers(owned),
    };
  }

  /** Admin tools (request #41): the sheet of any living character. */
  async sheetOf(db: DbOrTx, c: Character): Promise<CharacterSheetDto> {
    return this.buildSheet(db, c);
  }

  private async buildSheet(db: DbOrTx, c: Character): Promise<CharacterSheetDto> {
    const [rows, skills] = await Promise.all([
      itemsRepository.listByCharacter(db, c.id),
      itemsRepository.learnedSkillIds(db, c.id),
    ]);
    const owned = rows.map(toOwned);
    const base = baseAttributesOf(c);
    const { attributes, stats } = computeStats(base, owned);

    const equipment = emptyEquipment<ItemDto>();
    const inventory: ItemDto[] = [];
    for (const row of rows) {
      const dto = toItemDto(row);
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
      abilities: availableAbilities(owned, skills).map(({ ability, grantedBy }) => ({
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
      })),
      reputation: c.reputation,
      attributePoints: c.attributePoints,
    };
  }
}
