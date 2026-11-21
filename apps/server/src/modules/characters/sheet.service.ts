import { characters, type Character, type Database, type DbOrTx, type Item } from '@realms/db';
import {
  abilityMultipliers,
  asBaseAttributes,
  availableAbilities,
  checkRequirements,
  computeStats,
  describeAffix,
  describeEffects,
  describeScaling,
  describeTargeting,
  validateAllocation,
  emptyEquipment,
  getAbility,
  getItemDef,
  planLoadout,
  isBroken,
  isGear,
  itemRequirements,
  normalizeAffixes,
  planEquip,
  rarityOf,
  weaponInfo,
  type BaseAttributes,
  type AbilityDef,
  type OwnedItem,
} from '@realms/game-core';
import {
  ErrorCode,
  MAX_PREPARED_SKILLS,
  type AbilityDto,
  type Attributes,
  type CharacterAppearance,
  type CharacterSheetDto,
  type EquipSlot,
  type ItemAffixDto,
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
  affixes: isGear(getItemDef(i.itemDefId)?.kind) ? normalizeAffixes(i.specials) : [],
});

/** `base`: the viewer's BASE attributes, to mark which requirements are met. */
export function toItemDto(i: Item, base?: Attributes): ItemDto {
  const def = getItemDef(i.itemDefId);
  const gear = isGear(def?.kind);
  const affixes = gear
    ? normalizeAffixes(i.specials)
        .map(describeAffix)
        .filter((a): a is ItemAffixDto => !!a)
    : [];
  const slots = Array.isArray(i.runeSlots)
    ? (i.runeSlots as Array<{ unlocked?: boolean; runeId?: string | null }>)
    : [];
  const unlocked = slots.filter((r) => r?.unlocked);
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
    rarity: rarityOf(affixes.length),
    affixes,
    requirements: def ? checkRequirements(itemRequirements(def), base) : [],
    runeSlots:
      gear && unlocked.length > 0
        ? { used: unlocked.filter((r) => !!r.runeId).length, total: unlocked.length }
        : null,
    grantsAbilities: (def?.abilities ?? []).flatMap((id) => getAbility(id)?.name ?? []),
  };
}

function toAbilityDto(ability: AbilityDef, grantedBy: string | null): AbilityDto {
  return {
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
  };
}

type LearnedSkill = { id: string; loadoutSlot: number | null };

/** Prepared skill ids by loadout slot (length MAX_PREPARED_SKILLS). */
function loadoutOf(skills: LearnedSkill[]): Array<string | null> {
  const out: Array<string | null> = Array.from({ length: MAX_PREPARED_SKILLS }, () => null);
  for (const s of skills)
    if (s.loadoutSlot !== null && s.loadoutSlot < MAX_PREPARED_SKILLS) out[s.loadoutSlot] = s.id;
  return out;
}
const preparedIds = (skills: LearnedSkill[]) =>
  loadoutOf(skills).filter((id): id is string => id !== null);

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
      const plan = planEquip(owned, itemId, slot, baseAttributesOf(c));
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

  /** Choose which learned skills are prepared for combat (request #39). */
  async setLoadout(accountId: string, characterId: string, slots: Array<string | null>) {
    return this.db.transaction(async (tx) => {
      const c = await this.getOwnedCharacter(tx, accountId, characterId, true);
      await assertNotInRift(tx, c.id);
      const learned = await itemsRepository.learnedSkills(tx, c.id);
      const plan = planLoadout(
        learned.map((s) => s.id),
        slots,
      );
      if (!plan.ok) throw errors.validation(plan.reason, [{ path: 'slots', message: plan.reason }]);
      await itemsRepository.setLoadout(tx, c.id, plan.slots);
      return this.buildSheet(tx, c);
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
      abilityIds: availableAbilities(owned, preparedIds(skills)).map((a) => a.ability.id),
      abilityMultipliers: abilityMultipliers(owned),
    };
  }

  private async buildSheet(db: DbOrTx, c: Character): Promise<CharacterSheetDto> {
    const [rows, skills] = await Promise.all([
      itemsRepository.listByCharacter(db, c.id),
      itemsRepository.learnedSkills(db, c.id),
    ]);
    const owned = rows.map(toOwned);
    const base = baseAttributesOf(c);
    const { attributes, stats } = computeStats(base, owned);

    const equipment = emptyEquipment<ItemDto>();
    const inventory: ItemDto[] = [];
    for (const row of rows) {
      const dto = toItemDto(row, base);
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
      abilities: availableAbilities(owned, preparedIds(skills)).map(({ ability, grantedBy }) =>
        toAbilityDto(ability, grantedBy),
      ),
      learnedSkills: skills.flatMap((sk) => {
        const a = getAbility(sk.id);
        return a ? [toAbilityDto(a, null)] : [];
      }),
      loadout: loadoutOf(skills),
      reputation: c.reputation,
      attributePoints: c.attributePoints,
    };
  }
}
