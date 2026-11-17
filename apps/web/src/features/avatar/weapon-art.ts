import { getItemDef } from '@realms/game-core';
import type { WeaponArt } from './CharacterAvatar';

/** Which weapon to draw for an equipped item definition id. */
export function weaponArtFor(defId: string | null | undefined): WeaponArt {
  const w = defId ? getItemDef(defId)?.weaponType : undefined;
  return w ?? null;
}

/** Weapon art from a combatant's ability list (combat view has no items). */
export function weaponArtFromAbilities(abilityIds: string[]): WeaponArt {
  if (abilityIds.includes('slash')) return 'sword';
  if (abilityIds.includes('aimed_shot')) return 'bow';
  if (abilityIds.includes('arcane_bolt')) return 'staff';
  return null;
}
