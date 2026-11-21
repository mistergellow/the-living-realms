import {
  ATTRIBUTE_KEYS,
  EQUIP_SLOTS,
  type Attributes,
  type EquipSlot,
  type ItemRequirementDto,
  type WeaponSpecial,
} from '@realms/shared';
import { ATTRIBUTE_NAMES } from './attributes.js';
import {
  getAbility,
  UNARMED_ABILITIES,
  UNIVERSAL_ABILITIES,
  type AbilityDef,
} from './content/abilities.js';
import { getItemDef, type ItemDef } from './content/items.js';
import { getWeaponType, upgradeMultiplier } from './content/weapons.js';

/*
 * Equipment rules. Items are referenced by an instance id (owned item) and a
 * definition id (what it is). Quality is durability, 0–100 (decision D19):
 * at 0 the item is broken and cannot be used.
 */

export const MAX_QUALITY = 100;
/** Quality lost by every equipped item when a Rift is lost (decision D30, provisional). */
export const DEFEAT_QUALITY_LOSS = 25;

export interface OwnedItem {
  id: string;
  defId: string;
  quality: number;
  equippedSlot: EquipSlot | null;
  /** Weapons: +0, +1, … (request #31). */
  upgradeLevel?: number;
  /** Bonus effects (request #36), already normalised. */
  affixes?: WeaponSpecial[];
}

/*
 * Requirements to equip an item (request #36): BASE attributes only, like the
 * exploration tests (D44). They belong to the item itself and never change
 * with upgrades (+0…+10 only raise the weapon's base stats — owner, request
 * #37). PROVISIONAL: weapons ask for their primary attribute at
 * `weaponPrimaryBase` unless the definition sets its own `requirements`.
 */
export const REQUIREMENT_RULES = {
  weaponPrimaryBase: 5,
} as const;

export function itemRequirements(def: ItemDef): Partial<Attributes> {
  const out: Partial<Attributes> = { ...(def.requirements ?? {}) };
  const w = getWeaponType(def.weaponType);
  if (w && def.kind === 'weapon' && out[w.primary] === undefined)
    out[w.primary] = REQUIREMENT_RULES.weaponPrimaryBase;
  return out;
}

export function checkRequirements(
  reqs: Partial<Attributes>,
  base: Attributes | undefined,
): ItemRequirementDto[] {
  return ATTRIBUTE_KEYS.filter((k) => reqs[k] !== undefined).map((k) => ({
    attribute: k,
    value: reqs[k]!,
    met: !base || base[k] >= reqs[k]!,
  }));
}

export const isBroken = (quality: number) => quality <= 0;

export function qualityAfterDefeat(quality: number): number {
  return Math.max(0, quality - DEFEAT_QUALITY_LOSS);
}

export type EquipPlan =
  | { ok: true; equip: { itemId: string; slot: EquipSlot }; unequip: string[] }
  | { ok: false; reason: string };

/**
 * Decide what happens when `itemId` is equipped into `slot`: which items must
 * be unequipped (whatever occupies the slot; the off-hand for two-handed
 * weapons; a two-handed main hand when equipping the off-hand).
 */
export function planEquip(
  items: OwnedItem[],
  itemId: string,
  slot: EquipSlot,
  baseAttributes?: Attributes,
): EquipPlan {
  const target = items.find((i) => i.id === itemId);
  if (!target) return { ok: false, reason: 'You do not own that item.' };
  const def = getItemDef(target.defId);
  if (!def) return { ok: false, reason: 'Unknown item.' };
  if (isBroken(target.quality))
    return { ok: false, reason: `${def.name} is broken and cannot be used.` };
  if (!def.slots.includes(slot))
    return { ok: false, reason: `${def.name} cannot be equipped there.` };
  const unmet = checkRequirements(itemRequirements(def), baseAttributes).filter((r) => !r.met);
  if (unmet.length)
    return {
      ok: false,
      reason: `${def.name} requires ${unmet.map((r) => `${ATTRIBUTE_NAMES[r.attribute]} ${r.value}`).join(', ')}.`,
    };

  const equippedIn = (s: EquipSlot) => items.find((i) => i.equippedSlot === s && i.id !== itemId);
  const unequip = new Set<string>();
  const occupant = equippedIn(slot);
  if (occupant) unequip.add(occupant.id);

  if (slot === 'mainHand' && def.twoHanded) {
    const off = equippedIn('offHand');
    if (off) unequip.add(off.id);
  }
  if (slot === 'offHand') {
    const main = equippedIn('mainHand');
    if (main && getItemDef(main.defId)?.twoHanded) unequip.add(main.id);
  }
  return { ok: true, equip: { itemId, slot }, unequip: [...unequip] };
}

/** Equipped, non-broken items with their definitions. */
export function activeEquipment(items: OwnedItem[]): Array<OwnedItem & { def: ItemDef }> {
  return items.flatMap((i) => {
    const def = getItemDef(i.defId);
    return def && i.equippedSlot && !isBroken(i.quality) ? [{ ...i, def }] : [];
  });
}

export interface GrantedAbility {
  ability: AbilityDef;
  grantedBy: string | null;
}

/**
 * Abilities available in combat (decision D23): from equipped weapons, plus
 * learned skills, plus universal actions. Without a usable weapon: unarmed.
 */
export function availableAbilities(
  items: OwnedItem[],
  learnedSkillIds: string[] = [],
): GrantedAbility[] {
  const out: GrantedAbility[] = [];
  const seen = new Set<string>();
  const add = (id: string, grantedBy: string | null) => {
    const a = getAbility(id);
    if (a && !seen.has(id)) {
      seen.add(id);
      out.push({ ability: a, grantedBy });
    }
  };

  const order: Record<string, number> = { mainHand: 0, offHand: 1 };
  const weapons = activeEquipment(items)
    .filter((i) => i.def.abilities?.length)
    .sort((a, b) => (order[a.equippedSlot!] ?? 9) - (order[b.equippedSlot!] ?? 9));
  for (const w of weapons) for (const id of w.def.abilities!) add(id, w.def.name);
  const hasMainWeapon = weapons.some((w) => w.def.kind === 'weapon');
  if (!hasMainWeapon) for (const id of UNARMED_ABILITIES) add(id, null);
  for (const id of learnedSkillIds) add(id, null);
  for (const id of UNIVERSAL_ABILITIES) add(id, null);
  return out;
}

/**
 * Weapon upgrades (+1, +2, …) improve the numbers of the abilities that weapon
 * grants. Returns ability id → multiplier (only for upgraded weapons).
 */
export function abilityMultipliers(items: OwnedItem[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const w of activeEquipment(items)) {
    const m = upgradeMultiplier(w.upgradeLevel ?? 0);
    if (m === 1) continue;
    for (const id of w.def.abilities ?? []) out[id] = Math.max(out[id] ?? 1, m);
  }
  return out;
}

export function emptyEquipment<T>(): Record<EquipSlot, T | null> {
  return Object.fromEntries(EQUIP_SLOTS.map((s) => [s, null])) as Record<EquipSlot, T | null>;
}
