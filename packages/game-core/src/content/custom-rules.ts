import type { CustomAbilityInput, CustomItemInput, EquipSlot } from '@realms/shared';
import { getAbility } from './abilities.js';
import { CUSTOM_ID_PREFIX } from './custom.js';
import { getWeaponType } from './weapons.js';

/*
 * Rules for admin-made content (request #41): a custom item or ability must
 * respect the same equipment and weapon rules as built-in content.
 */

const OFFHAND_TYPES = ['shield', 'talisman'];

const SLOTS_BY_KIND: Record<CustomItemInput['kind'], EquipSlot[]> = {
  weapon: ['mainHand', 'offHand'],
  offhand: ['offHand'],
  armor: ['head', 'body', 'legs'],
  accessory: ['accessory1', 'accessory2'],
};

export type Validated<T> = { ok: true; value: T } | { ok: false; reason: string };

/**
 * Checks a custom item against the equipment rules and normalises it: a
 * catalogue weapon always starts with its type's basic attack; a two-handed
 * weapon only fits the main hand.
 */
export function validateCustomItem(input: CustomItemInput): Validated<CustomItemInput> {
  const allowed = SLOTS_BY_KIND[input.kind];
  const slots = [...new Set(input.slots)];
  const bad = slots.find((s) => !allowed.includes(s));
  if (bad) return { ok: false, reason: `A ${input.kind} cannot go in the ${bad} slot.` };

  let abilityIds = [...new Set(input.abilities)];
  const missing = abilityIds.find((id) => !getAbility(id));
  if (missing) return { ok: false, reason: `Unknown ability: ${missing}.` };
  const universal = abilityIds.find((id) => getAbility(id)!.source === 'universal');
  if (universal) return { ok: false, reason: `${universal} is universal: everyone has it.` };

  if (input.weaponType) {
    const wt = getWeaponType(input.weaponType);
    if (!wt && !OFFHAND_TYPES.includes(input.weaponType))
      return { ok: false, reason: `Unknown weapon type: ${input.weaponType}.` };
    if (wt) {
      if (input.kind !== 'weapon')
        return { ok: false, reason: 'Catalogue weapon types are for weapons only.' };
      // Every weapon of a type shares the basic attack (request #31): keep it first.
      abilityIds = [wt.basicAttack, ...abilityIds.filter((id) => id !== wt.basicAttack)];
      if (wt.hands === 2 && slots.some((s) => s !== 'mainHand'))
        return { ok: false, reason: 'A two-handed weapon only fits the main hand.' };
    } else if (input.kind !== 'offhand') {
      return { ok: false, reason: `${input.weaponType} is an off-hand type.` };
    }
  } else if (input.kind === 'weapon') {
    return { ok: false, reason: 'A weapon needs a weapon type (it gives the basic attack).' };
  }
  if (input.kind === 'weapon' && !slots.includes('mainHand') && abilityIds.length === 0)
    return { ok: false, reason: 'This weapon grants no abilities.' };

  return { ok: true, value: { ...input, slots, abilities: abilityIds } };
}

/** Checks a custom ability (numbers are bounded by the zod schema). */
export function validateCustomAbility(input: CustomAbilityInput): Validated<CustomAbilityInput> {
  for (const e of input.effects)
    if ('min' in e && e.min > e.max)
      return { ok: false, reason: `${e.kind}: the minimum is above the maximum.` };
  if (input.targeting.side === 'self' && input.targeting.area !== 'single')
    return { ok: false, reason: 'A self ability targets one unit (area "single").' };
  return { ok: true, value: input };
}

/** A new id for a custom definition: `custom_<slug>_<suffix>`. */
export function customIdFor(name: string, suffix: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
  return `${CUSTOM_ID_PREFIX}${slug || 'item'}_${suffix}`;
}
