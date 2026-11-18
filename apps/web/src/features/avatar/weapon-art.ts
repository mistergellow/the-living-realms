import { getItemDef } from '@realms/game-core';
import type { OffhandArt, WeaponArt } from './CharacterAvatar';

const MAIN: Record<string, WeaponArt> = {
  sword: 'sword',
  axe: 'axe',
  dagger: 'dagger',
  bow: 'bow',
  staff: 'staff',
  tome: 'tome',
};
const OFF: Record<string, OffhandArt> = {
  shield: 'shield',
  talisman: 'talisman',
  dagger: 'dagger',
};

/** Which main-hand weapon to draw for an equipped item definition id. */
export function weaponArtFor(defId: string | null | undefined): WeaponArt {
  const w = defId ? getItemDef(defId)?.weaponType : undefined;
  return (w && MAIN[w]) || null;
}

export function offhandArtFor(defId: string | null | undefined): OffhandArt {
  const w = defId ? getItemDef(defId)?.weaponType : undefined;
  return (w && OFF[w]) || null;
}

/** Weapon art from a combatant's ability list (the combat view has no items). */
export function artFromAbilities(abilityIds: string[]): { weapon: WeaponArt; offhand: OffhandArt } {
  const has = (id: string) => abilityIds.includes(id);
  const weapon: WeaponArt = has('slash')
    ? 'sword'
    : has('chop')
      ? 'axe'
      : has('aimed_shot')
        ? 'bow'
        : has('arcane_bolt')
          ? 'staff'
          : has('spark')
            ? 'tome'
            : has('stab')
              ? 'dagger'
              : null;
  const offhand: OffhandArt = has('raise_shield')
    ? 'shield'
    : has('blessing')
      ? 'talisman'
      : weapon !== 'dagger' && has('stab')
        ? 'dagger'
        : null;
  return { weapon, offhand };
}
