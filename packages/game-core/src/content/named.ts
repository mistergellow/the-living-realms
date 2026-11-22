import type { Attributes, WeaponSpecial } from '@realms/shared';
import { upgradeMultiplier } from './weapons.js';
import type { ItemDef } from './items.js';

/*
 * Named items (request #62). A named item is a version of a base item (same
 * type, slot and base numbers) with its own name and FIXED bonus effects from
 * the affix catalogue. Those effects grow with the item's upgrade level
 * (+1 … +10, like the weapon's damage), and named items can still roll the
 * usual random bonus effects on top. Base items (a plain Sword, Plate
 * Cuirass…) have no fixed bonus. PROVISIONAL CONTENT AND NUMBERS (A126).
 */

export interface NamedDef {
  id: string;
  name: string;
  /** Base item id (`ITEMS`). */
  base: string;
  description: string;
  /** Fixed effects: affix id → value at +0. */
  fixed: Record<string, number>;
  /** Fixed attribute changes that never grow (e.g. heavy armor's −Agility). */
  bonuses?: Partial<Attributes>;
}

const n = (
  id: string,
  name: string,
  base: string,
  description: string,
  fixed: Record<string, number>,
  bonuses?: Partial<Attributes>,
): NamedDef => ({ id, name, base, description, fixed, ...(bonuses ? { bonuses } : {}) });

export const NAMED_ITEMS: readonly NamedDef[] = [
  // ---- swords (training_sword) ----
  n('dawnblade', 'Dawnblade', 'training_sword', 'Forged at first light. It never dulls.', {
    damage: 6,
    crit_chance: 3,
  }),
  n('emberfang', 'Emberfang', 'training_sword', 'The blade is always warm to the touch.', {
    burn_on_hit: 15,
    damage: 4,
  }),
  n(
    'glacier_edge',
    'Glacier Edge',
    'training_sword',
    'A cold, heavy edge that rattles the bones.',
    { stun_on_hit: 6, initiative: 2 },
  ),
  n(
    'bloodletter',
    'Bloodletter',
    'training_sword',
    'Its serrations leave wounds that will not close.',
    { bleed_on_hit: 20 },
  ),
  n(
    'kings_oath',
    "King's Oath",
    'training_sword',
    'Sworn to protect the bearer as much as to strike.',
    { health: 15, armor: 3 },
  ),
  n(
    'whisperwind',
    'Whisperwind',
    'training_sword',
    'Light as a breath; it strikes before you think.',
    { agility: 2, initiative: 3 },
  ),
  n('lionheart', 'Lionheart', 'training_sword', 'A champion’s sword: hard and true.', {
    might: 2,
    crit_damage: 15,
  }),
  n('vampire_kiss', "Vampire's Kiss", 'training_sword', 'It drinks what it spills.', {
    lifesteal: 6,
  }),
  n('stormcaller', 'Stormcaller', 'training_sword', 'Thunder answers every swing.', {
    crit_chance: 5,
    focus: 1,
  }),
  n('giantbane', 'Giantbane', 'training_sword', 'Made for the biggest foes.', {
    boss_damage: 15,
    might: 1,
  }),
  // ---- one of each other weapon ----
  n('splitting_maw', 'Splitting Maw', 'woodcutter_axe', 'An axe that never stops biting.', {
    bleed_on_hit: 12,
    damage: 4,
  }),
  n('viper_tooth', "Viper's Tooth", 'rusty_dagger', 'Quick, cruel and poisoned with intent.', {
    crit_chance: 5,
    agility: 1,
  }),
  n('hawkstring', 'Hawkstring', 'hunting_bow', 'Every arrow finds the gap.', {
    precision: 2,
    crit_damage: 12,
  }),
  n(
    'staff_of_embers',
    'Staff of Embers',
    'apprentice_staff',
    'Sparks follow every word you speak.',
    { burn_on_hit: 12, intellect: 2 },
  ),
  n('wyrm_spear', 'Wyrm Spear', 'ash_spear', 'Long enough to keep a dragon away.', {
    damage: 5,
    initiative: 2,
  }),
  n('judges_mace', "Judge's Mace", 'iron_mace', 'Every blow is a verdict.', {
    stun_on_hit: 6,
    will: 1,
  }),
  n('starwand', 'Starwand', 'birch_wand', 'A sliver of the night sky.', { mana: 12, intellect: 1 }),
  n('codex_of_ash', 'Codex of Ash', 'worn_tome', 'Pages that burn without turning to ash.', {
    intellect: 2,
    mana: 8,
  }),
  n(
    'oathbreaker',
    'Oathbreaker',
    'iron_greatsword',
    'Heavy enough to break a promise — or a shield.',
    { damage: 8, crit_damage: 10 },
  ),
  n('executioner', 'Executioner', 'bearded_greataxe', 'It ends fights.', {
    crit_chance: 4,
    boss_damage: 10,
  }),
  n('twin_fang', 'Twin Fang', 'hand_axe', 'Made to be thrown, then made to bite.', {
    bleed_on_hit: 10,
    agility: 1,
  }),
  n('earthshaker', 'Earthshaker', 'war_hammer', 'The ground trembles where it falls.', {
    stun_on_hit: 8,
  }),
  n('mountain_fall', 'Mountain Fall', 'great_maul', 'Like the mountain itself coming down.', {
    damage: 8,
    health: 10,
  }),
  n('bramble_star', 'Bramble Star', 'morning_star', 'Spikes that tear and tear again.', {
    bleed_on_hit: 15,
  }),
  n('sunlance', 'Sunlance', 'knight_lance', 'It shines brightest in the charge.', {
    initiative: 3,
    damage: 5,
  }),
  n('arbalest_of_dusk', 'Arbalest of Dusk', 'light_crossbow', 'Quiet, patient and deadly.', {
    crit_chance: 4,
    precision: 1,
  }),
  n('scepter_of_dawn', 'Scepter of Dawn', 'oak_scepter', 'Holy light gathers at its head.', {
    will: 2,
    health: 10,
  }),
  n('moon_chakram', 'Moon Chakram', 'rune_chakram', 'It comes back with a little blood.', {
    lifesteal: 4,
    agility: 1,
  }),
  n('widows_scythe', "Widow's Scythe", 'reaper_scythe', 'A long, quiet harvest.', {
    lifesteal: 5,
    damage: 4,
  }),
  n('giants_sling', "Giant's Sling", 'leather_sling', 'Stones the size of fists.', {
    stun_on_hit: 5,
    damage: 3,
  }),
  // ---- off-hands ----
  n('bulwark_of_dawn', 'Bulwark of Dawn', 'wooden_shield', 'Nothing gets past it.', {
    armor: 4,
    health: 10,
  }),
  n('mirror_talisman', 'Mirror Talisman', 'bone_talisman', 'Spells slide off its polished face.', {
    magic_resist: 6,
    will: 1,
  }),
  // ---- armor ----
  n(
    'dragon_heavy_armor',
    'Dragon Heavy Armor',
    'plate_cuirass',
    'Scales of an old dragon. Whoever strikes it in close combat may catch fire.',
    { armor: 5, ignite_attackers: 25 },
    { agility: -3 },
  ),
  n(
    'warden_plate',
    'Warden Plate',
    'plate_cuirass',
    'Spiked plate worn by the Rift wardens.',
    { thorns: 4, health: 20 },
    { agility: -1 },
  ),
  n('shadow_robe', 'Shadow Robe', 'cloth_robe', 'Woven from dusk itself.', {
    intellect: 2,
    mana: 10,
  }),
  n('ranger_tunic', 'Ranger Tunic', 'padded_tunic', 'For long hunts in the deep woods.', {
    agility: 1,
    crit_chance: 3,
  }),
  n('crown_of_thorns', 'Crown of Thorns', 'iron_helm', 'It hurts to wear. It hurts more to hit.', {
    thorns: 3,
    will: 1,
  }),
  n('seer_hood', "Seer's Hood", 'leather_cap', 'It shows what is coming.', {
    initiative: 3,
    precision: 1,
  }),
  n('windstep_boots', 'Windstep Boots', 'leather_boots', 'Every step is a little faster.', {
    initiative: 4,
    agility: 1,
  }),
  n('titan_greaves', 'Titan Greaves', 'iron_greaves', 'Rooted like a mountain.', {
    endurance: 2,
    armor: 3,
  }),
  n('briar_boots', 'Briar Boots', 'chain_boots', 'Thorny chain that cuts whoever comes close.', {
    bleed_attackers: 20,
  }),
  // ---- accessories ----
  n('band_of_the_fox', 'Band of the Fox', 'hawkeye_band', 'Clever hands, quick feet.', {
    agility: 2,
    crit_chance: 3,
  }),
  n('ring_of_embers', 'Ring of Embers', 'ring_of_vigor', 'A coal that never cools.', {
    burn_on_hit: 10,
    intellect: 1,
  }),
  n('thornwreath', 'Thornwreath', 'brawler_wrap', 'Brambles twisted into a ring.', {
    thorns: 3,
    endurance: 1,
  }),
  n(
    'heart_of_the_mountain',
    'Heart of the Mountain',
    'charm_of_focus',
    'A stone that beats like a heart.',
    { health: 25, endurance: 1 },
  ),
  n('seers_eye', "Seer's Eye", 'charm_of_focus', 'It sees the weak spot.', {
    precision: 2,
    crit_damage: 10,
  }),
  n('leech_charm', 'Leech Charm', 'charm_of_focus', 'Hungry for life.', { lifesteal: 4 }),
];

/** Item definitions of the named items, built on their base items. */
export function buildNamedItems(getBase: (id: string) => ItemDef | undefined): ItemDef[] {
  const out: ItemDef[] = [];
  for (const nd of NAMED_ITEMS) {
    const base = getBase(nd.base);
    if (!base) continue;
    const bonuses = { ...(base.bonuses ?? {}) };
    for (const [k, v] of Object.entries(nd.bonuses ?? {}))
      bonuses[k as keyof Attributes] = (bonuses[k as keyof Attributes] ?? 0) + (v ?? 0);
    out.push({
      ...base,
      id: nd.id,
      name: nd.name,
      description: nd.description,
      bonuses,
      named: {
        base: base.id,
        fixed: Object.entries(nd.fixed).map(([id, value]) => ({ id, value })),
      },
    });
  }
  return out;
}

/** The fixed effects of a named item at an upgrade level (they grow like its damage). */
export function namedEffects(
  def: Pick<ItemDef, 'named'> | undefined,
  upgradeLevel = 0,
): WeaponSpecial[] {
  if (!def?.named) return [];
  const m = upgradeMultiplier(upgradeLevel);
  return def.named.fixed.map((f) => ({ id: f.id, value: Math.floor(f.value * m) }));
}
