import {
  characters,
  characterSkills,
  items,
  worldEvents,
  type Character,
  type Database,
  type DbOrTx,
  type Item,
} from '@realms/db';
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
  ATTRIBUTE_NAMES,
  gearReputationBonusPct,
  getItemDef,
  getSkill,
  SKILL_RULES,
  skillLevelMultiplier,
  skillAtLevel,
  skillExtraTurns,
  skillLevelLabel,
  planLoadout,
  isBroken,
  isGear,
  itemRequirements,
  normalizeAffixes,
  namedEffects,
  planEquip,
  rarityOf,
  gradeName,
  rankName,
  TOOL_TYPE_NAMES,
  weaponInfo,
  type BaseAttributes,
  type AbilityDef,
  type OwnedItem,
} from '@realms/game-core';
import {
  ErrorCode,
  MAX_PREPARED_SKILLS,
  type AttributeKey,
  type AbilityDto,
  type Attributes,
  type CharacterAppearance,
  type CharacterSheetDto,
  type EquipSlot,
  type ItemAffixDto,
  type ItemDto,
} from '@realms/shared';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { AppError, errors } from '../../lib/errors.js';
import { toCharacterDto } from './characters.service.js';
import { assertBagRoom, ensureSlots, firstFreeSlot } from './bag.js';
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
/** A learned skill at its level (request #53): leveled numbers and the label (1 … M10, P). */
const leveledSkillDto = (a: AbilityDef, level: number) => ({
  ...toAbilityDto(skillAtLevel(a, level), null),
  level,
  levelLabel: skillLevelLabel(level),
});

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
    slot: i.equippedSlot ? null : i.slot,
    named: def?.named
      ? {
          baseName: getItemDef(def.named.base)?.name ?? def.named.base,
          effects: namedEffects(def, i.upgradeLevel)
            .map(describeAffix)
            .filter((a): a is ItemAffixDto => !!a),
        }
      : null,
    armorClass: def?.armorClass ?? null,
    grade: i.grade === null ? null : { value: i.grade, name: gradeName(i.grade) },
    tool: def?.tool
      ? {
          type: def.tool.type,
          typeName: TOOL_TYPE_NAMES[def.tool.type],
          tier: def.tool.tier,
          minRank: def.tool.minRank,
          rankName: rankName(def.tool.minRank),
        }
      : null,
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
    requirements: Object.entries(getSkill(ability.id)?.requirements ?? {}).map(([k, v]) => ({
      attribute: k as AttributeKey,
      value: v ?? 0,
    })),
  };
}

/** Reputation bonus % from the gear a character has equipped (request #49). */
export async function reputationGearBonus(db: DbOrTx, characterId: string): Promise<number> {
  const equipped = await db
    .select({ specials: items.specials, upgradeLevel: items.upgradeLevel })
    .from(items)
    .where(and(eq(items.characterId, characterId), isNotNull(items.equippedSlot)));
  return gearReputationBonusPct(
    equipped.map((i) => ({
      affixCount: normalizeAffixes(i.specials).length,
      upgradeLevel: i.upgradeLevel,
    })),
  );
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
      const rows = await itemsRepository.listByCharacter(tx, c.id);
      const owned = rows.map(toOwned);
      const plan = planEquip(owned, itemId, slot, baseAttributesOf(c));
      if (!plan.ok) throw new AppError(400, ErrorCode.INVALID_EQUIPMENT, plan.reason);
      // Free the slots first (unique slot index), then place the item.
      await itemsRepository.unequip(tx, plan.unequip);
      await itemsRepository.setSlot(tx, itemId, slot);
      // Request #59: what comes off takes the bag position the new item leaves.
      const from = rows.find((r) => r.id === itemId)?.slot ?? null;
      await tx.update(items).set({ slot: null }).where(eq(items.id, itemId));
      if (plan.unequip[0] && from !== null)
        await tx.update(items).set({ slot: from }).where(eq(items.id, plan.unequip[0]));
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

  /**
   * Use an item from the bag (request #47): reading a Skill Book teaches its
   * skill — if the BASE attributes meet its requirements — prepares it in the
   * first free slot, and uses the book up.
   */
  async useItem(accountId: string, characterId: string, itemId: string) {
    return this.db.transaction(async (tx) => {
      const c = await this.getOwnedCharacter(tx, accountId, characterId, true);
      await assertNotInRift(tx, c.id);
      const [item] = await tx
        .select()
        .from(items)
        .where(and(eq(items.id, itemId), eq(items.characterId, c.id)));
      if (!item) throw errors.notFound('Item');
      const def = getItemDef(item.itemDefId);
      const skill = def?.teaches ? getSkill(def.teaches) : undefined;
      if (!skill) throw errors.validation('This item cannot be used.');
      const base = baseAttributesOf(c);
      const missing = Object.entries(skill.requirements ?? {}).filter(
        ([k, v]) => base[k as AttributeKey] < (v ?? 0),
      );
      if (missing.length)
        throw errors.validation(
          `${skill.name} needs ${missing
            .map(([k, v]) => `${ATTRIBUTE_NAMES[k as AttributeKey]} ${v}`)
            .join(' and ')} (base attributes).`,
        );
      const learned = await itemsRepository.learnedSkills(tx, c.id);
      const known = learned.find((s) => s.id === skill.id);
      const useBook = async () => {
        if (item.quantity > 1)
          await tx
            .update(items)
            .set({ quantity: item.quantity - 1 })
            .where(eq(items.id, item.id));
        else await tx.delete(items).where(eq(items.id, item.id));
      };
      // Request #50: a book of a skill you know raises its level.
      if (known) {
        if (known.level >= SKILL_RULES.maxLevel)
          throw errors.validation(
            `${skill.name} is already at its highest level (${skillLevelLabel(SKILL_RULES.maxLevel)}).`,
          );
        await tx
          .update(characterSkills)
          .set({ level: known.level + 1 })
          .where(and(eq(characterSkills.characterId, c.id), eq(characterSkills.skillId, skill.id)));
        await useBook();
        await tx.insert(worldEvents).values({
          worldId: c.worldId,
          type: 'skill.leveled',
          actorAccountId: accountId,
          actorCharacterId: c.id,
          payload: { skillId: skill.id, level: known.level + 1 },
        });
        return this.buildSheet(tx, c);
      }
      const used = new Set(learned.map((s) => s.loadoutSlot));
      const free = Array.from({ length: MAX_PREPARED_SKILLS }, (_, i) => i).find(
        (i) => !used.has(i),
      );
      await tx
        .insert(characterSkills)
        .values({ characterId: c.id, skillId: skill.id, loadoutSlot: free ?? null });
      if (item.quantity > 1)
        await tx
          .update(items)
          .set({ quantity: item.quantity - 1 })
          .where(eq(items.id, item.id));
      else await tx.delete(items).where(eq(items.id, item.id));
      await tx.insert(worldEvents).values({
        worldId: c.worldId,
        type: 'skill.learned',
        actorAccountId: accountId,
        actorCharacterId: c.id,
        payload: { skillId: skill.id, from: item.itemDefId },
      });
      return this.buildSheet(tx, c);
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
      if (item) {
        await assertBagRoom(tx, c.id); // request #50: the bag must have room
        await itemsRepository.setSlot(tx, item.id, null);
        // Request #59: into the first free bag position.
        await tx
          .update(items)
          .set({ slot: await firstFreeSlot(tx, c.id, 'bag') })
          .where(eq(items.id, item.id));
      }
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
      // Request #50/#53: skill levels raise their numbers like weapon upgrades
      // do, and from M1 their statuses last longer.
      abilityMultipliers: {
        ...abilityMultipliers(owned),
        ...Object.fromEntries(
          skills.filter((s) => s.level > 1).map((s) => [s.id, skillLevelMultiplier(s.level)]),
        ),
      },
      abilityExtraTurns: Object.fromEntries(
        skills
          .filter((s) => skillExtraTurns(s.level) > 0)
          .map((s) => [s.id, skillExtraTurns(s.level)]),
      ),
    };
  }

  /** Admin tools (request #41): the sheet of any living character. */
  async sheetOf(db: DbOrTx, c: Character): Promise<CharacterSheetDto> {
    return this.buildSheet(db, c);
  }

  async buildSheet(db: DbOrTx, c: Character): Promise<CharacterSheetDto> {
    await ensureSlots(db, c.id); // request #59: every item has a place
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
      // Request #53: skills are shown with the numbers of their level.
      abilities: availableAbilities(owned, preparedIds(skills)).map(({ ability, grantedBy }) => {
        const sk = skills.find((s) => s.id === ability.id);
        return sk ? leveledSkillDto(ability, sk.level) : toAbilityDto(ability, grantedBy);
      }),
      learnedSkills: skills.flatMap((sk) => {
        const a = getAbility(sk.id);
        return a ? [leveledSkillDto(a, sk.level)] : [];
      }),
      loadout: loadoutOf(skills),
      reputation: c.reputation,
      gold: c.gold,
      reputationBonusPct: await reputationGearBonus(db, c.id),
      attributePoints: c.attributePoints,
    };
  }
}
