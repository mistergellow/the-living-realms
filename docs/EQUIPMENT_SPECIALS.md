# Equipment specials — proposal per slot (request #64)

**Status: PROPOSAL. Nothing here is implemented yet** except the entries marked ✅,
which already exist in `packages/game-core/src/content/affixes.ts` (request #37).
Names, effects and ranges are placeholders for the owner to accept, cut or change.

Inspired by MOBAs (League of Legends, Dota 2), MMORPGs (WoW, Lost Ark, Guild Wars 2)
and Path of Exile, adapted to this game: rounds with initiative, Focus from
Precision, 3 columns (back / mid / front) × 2 rows, the existing statuses (Bleed,
Burn, Mark, Weaken, Stun, Strength, Thorns, Intangible, Regen, Fuse), Rifts, AP and
professions.

## Rules this list assumes

- Every effect keeps the current model: an item holds 0–5 effects, never the same
  one twice; rarity = number of effects.
- **Exploration tests use only BASE stats** (D44). So no special changes an
  exploration test. "Utility" specials (AP, gold, gathering) are flagged 🧭 and
  need the owner's OK because they touch the economy.
- Ranges are for one item at Rift tier 1–5 (low–high). "Chance" values are %.
- Tags: ✅ exists · ⭐ only on named / high-rarity gear (too strong for random drops)
  · 🧭 out-of-combat utility · 🔁 also appears on other slots (shared pool).

---

## 0. Shared pool (🔁 can roll on several slots)

| Id                | Name              | Effect                                                | Range | Slots                         | Source               |
| ----------------- | ----------------- | ----------------------------------------------------- | ----- | ----------------------------- | -------------------- |
| ✅ `might`…`will` | +Attribute        | +X to one of the 6 attributes                         | 1–3   | all                           | all RPGs             |
| ✅ `health`       | Health            | +X max HP                                             | 5–20  | all                           | all                  |
| ✅ `mana`         | Mana              | +X max Mana                                           | 4–12  | all                           | all                  |
| ✅ `armor`        | Armor             | +X Armor                                              | 2–8   | Head, Body, Belt, Boots       | all                  |
| ✅ `magic_resist` | Magic Resist      | +X Magic Resist                                       | 2–8   | Head, Face, Body, Belt, Boots | LoL                  |
| ✅ `initiative`   | Initiative        | +X Initiative                                         | 1–3   | Weapon, Boots, Ring, Pendant  | Darkest Dungeon      |
| `health_regen`    | Health Regen      | heal X HP at the start of each round                  | 1–4   | Body, Belt, Pendant, Ring     | LoL (Warmog), Dota   |
| `mana_regen`      | Mana Regen        | +X Mana at the start of each round                    | 1–3   | Head, Pendant, Ring           | Dota (Void Stone)    |
| `all_attributes`  | All Attributes ⭐ | +X to all 6 attributes                                | 1     | Pendant, Ring                 | PoE                  |
| `max_hp_pct`      | Increased Life    | +X% max HP                                            | 3–8   | Body, Belt                    | PoE                  |
| `status_resist`   | Tenacity          | −X% duration of Stun / Weaken / Mark on you (rounded) | 10–30 | Boots, Head, Belt             | LoL (Mercury Treads) |

---

## 1. Weapon

The offensive slot. Most "on hit" and "on kill" effects live here.

| Id                  | Name              | Effect                                                                               | Range  | Source                               |
| ------------------- | ----------------- | ------------------------------------------------------------------------------------ | ------ | ------------------------------------ |
| ✅ `damage`         | Damage            | +X% damage                                                                           | 3–10%  | all                                  |
| ✅ `crit_chance`    | Critical Chance   | +X% crit chance                                                                      | 2–6%   | all                                  |
| ✅ `crit_damage`    | Critical Damage   | +X% crit damage                                                                      | 10–25% | all                                  |
| ✅ `boss_damage`    | Boss Slayer       | +X% damage vs bosses                                                                 | 5–15%  | Lost Ark, MMOs                       |
| ✅ `bleed_on_hit`   | Rending           | X% chance to apply Bleed                                                             | 5–15%  | PoE                                  |
| ✅ `burn_on_hit`    | Searing           | X% chance to apply Burn                                                              | 5–15%  | PoE (Ignite)                         |
| ✅ `stun_on_hit`    | Bash              | X% chance to Stun                                                                    | 2–5%   | Dota (Skull Basher)                  |
| ✅ `lifesteal`      | Life Steal        | heal X% of the damage dealt                                                          | 3–8%   | LoL, Dota, PoE (Leech)               |
| `mark_on_hit`       | Exposing          | X% chance to apply Mark                                                              | 5–15%  | PoE (Exposure)                       |
| `weaken_on_hit`     | Crippling         | X% chance to apply Weaken                                                            | 5–15%  | PoE (Enfeeble)                       |
| `armor_shred`       | Sunder            | each hit removes X Armor from the target until the end of combat (stacks 5×)         | 1–2    | LoL (Black Cleaver)                  |
| `armor_pen`         | Armor Penetration | ignore X% of the target's Armor                                                      | 5–20%  | LoL (Last Whisper)                   |
| `magic_pen`         | Spell Penetration | ignore X% of the target's Magic Resist                                               | 5–20%  | LoL (Void Staff)                     |
| `culling_strike`    | Culling Strike ⭐ | a hit that leaves the target below X% HP kills it (not bosses)                       | 8–12%  | PoE                                  |
| `execute`           | Executioner       | +X% damage to targets below 30% HP                                                   | 10–25% | WoW, LoL                             |
| `first_strike`      | Opening Blow      | +X% damage on your first action of each combat                                       | 20–50% | Darkest Dungeon, assassin kits       |
| `every_third`       | Static Charge ⭐  | every 3rd hit deals +X bonus damage and jumps to a second enemy                      | 5–15   | LoL (Statikk Shiv), Dota (Maelstrom) |
| `spellblade`        | Spellblade        | after using a skill, your next basic attack deals +X% damage                         | 30–80% | LoL (Sheen / Trinity)                |
| `onslaught_on_kill` | Onslaught         | on kill: +X Initiative and +1 Focus next round                                       | 2–4    | PoE (Onslaught)                      |
| `life_on_kill`      | Life on Kill      | heal X HP on kill                                                                    | 5–15   | PoE                                  |
| `focus_on_crit`     | Precision Edge    | 25% chance to gain +1 Focus when you crit                                            | fixed  | PoE (Power charge on crit)           |
| `cleave`            | Cleave            | basic attack deals X% of its damage to the enemy in the other row of the same column | 20–40% | Dota (Battle Fury)                   |
| `reach`             | Long Reach ⭐     | your melee basic attack can hit one column further                                   | fixed  | Darkest Dungeon (positions)          |
| ✅ `focus`          | Focus per round   | +1 Focus per round                                                                   | 1      | (already on weapon/accessory)        |

## 2. Head

Mind, magic and protection against control.

| Id                          | Name              | Effect                                                            | Range  | Source                  |
| --------------------------- | ----------------- | ----------------------------------------------------------------- | ------ | ----------------------- |
| 🔁 `armor` / `magic_resist` | —                 | see shared pool                                                   |        |                         |
| 🔁 `status_resist`          | Tenacity          | see shared pool                                                   |        | LoL                     |
| `skill_damage`              | Spell Power       | +X% damage of skills (not basic attacks)                          | 4–12%  | LoL (AP), WoW           |
| `cooldown_reduction`        | Haste             | X% chance that a skill's cooldown is 1 round shorter              | 10–25% | LoL (Ability Haste)     |
| `mana_cost`                 | Efficiency        | skills cost X% less Mana                                          | 5–15%  | PoE (Reduced Mana Cost) |
| `stun_immunity`             | Iron Will ⭐      | the first Stun on you each combat is ignored                      | fixed  | Dota (BKB), LoL (QSS)   |
| `crit_reduction`            | Steel Visor       | enemies deal X% less crit damage to you                           | 10–30% | Dota, WoW (resilience)  |
| `plus_one_skill`            | +1 Skill Level ⭐ | +1 level to one specific skill (rolled from your prepared skills) | 1      | PoE (+1 gems), Diablo   |
| `heal_power`                | Blessed           | your heals and Regen are X% stronger                              | 5–15%  | WoW (healing power)     |
| `mana_regen` 🔁             | Clarity           | see shared pool                                                   |        | Dota                    |

## 3. Face (mask, eyepatch, glasses)

Precision, crits and seeing weak points — the "hunter" slot.

| Id                   | Name          | Effect                                                                  | Range  | Source                   |
| -------------------- | ------------- | ----------------------------------------------------------------------- | ------ | ------------------------ |
| 🔁 `crit_chance`     | Keen Eye      | +X% crit chance (same as weapon, lower range)                           | 1–4%   | all                      |
| 🔁 `magic_resist`    | —             | see shared pool                                                         |        |                          |
| `damage_vs_marked`   | Hunter's Mark | +X% damage against Marked enemies                                       | 8–20%  | WoW (Hunter's Mark)      |
| `mark_on_first_hit`  | Spotter       | your first hit each combat applies Mark (2 rounds)                      | fixed  | PoE (Exposure), Dota     |
| `back_column_damage` | Sniper        | +X% damage while you stand in the back column                           | 5–15%  | Darkest Dungeon (ranks)  |
| `crit_vs_stunned`    | Opportunist   | +X% crit chance against Stunned or Weakened enemies                     | 10–25% | Dota (Assassin), PoE     |
| `intimidate`         | War Paint     | enemies in the column in front of you deal X% less damage (Weaken aura) | 3–8%   | WoW (Demoralizing Shout) |
| `reveal_intent`      | Foresight ⭐  | you also see the target of enemy intents for 1 extra enemy              | fixed  | Slay the Spire (intents) |
| `focus_start`        | Composure     | start each combat with +1 Focus                                         | 1      | PoE (charges)            |

## 4. Pendant (amulet)

The "core" jewellery: the strongest multipliers, like PoE amulets and LoL mythics.

| Id                               | Name              | Effect                                                    | Range  | Source                                  |
| -------------------------------- | ----------------- | --------------------------------------------------------- | ------ | --------------------------------------- |
| 🔁 `might`…`will`                | +Attribute        | see shared pool (Pendant uses a higher range: 2–4)        |        | PoE                                     |
| 🔁 `all_attributes`              | All Attributes ⭐ | see shared pool                                           |        | PoE                                     |
| 🔁 `health_regen` / `mana_regen` | —                 | see shared pool                                           |        |                                         |
| ✅ `focus`                       | Focus per round   | +1 Focus per round                                        | 1      |                                         |
| `guardian_angel`                 | Guardian Angel ⭐ | once per Rift: when you would fall, stay at X% HP instead | 20–40% | LoL (Guardian Angel), Dota (Aegis)      |
| `spell_shield`                   | Spell Shield ⭐   | the first harmful status on you each combat is blocked    | fixed  | Dota (Linken's Sphere), LoL (Banshee's) |
| `ally_aura_damage`               | Aura of Valor     | allies in your column deal +X% damage                     | 3–8%   | Dota (auras), PoE (auras)               |
| `ally_aura_armor`                | Aura of Warding   | allies in your column get +X Armor                        | 2–5    | Dota (Assault Cuirass)                  |
| `stacking_power`                 | Soul Harvest      | +1% damage per enemy killed this Rift (max X%)            | 10–25% | LoL (Mejai's)                           |
| `strength_start`                 | Battle Hymn       | start each combat with Strength X (1 round)               | 2–5    | Slay the Spire, Darkest Dungeon         |
| `damage_to_mana`                 | Mana Shield       | X% of the damage you take is paid with Mana instead of HP | 10–25% | PoE (Mind over Matter)                  |

## 5. Body (chest)

Survival. The slot with the biggest numbers of Armor / HP.

| Id                                                                     | Name         | Effect                                                         | Range  | Source                             |
| ---------------------------------------------------------------------- | ------------ | -------------------------------------------------------------- | ------ | ---------------------------------- |
| 🔁 `armor` / `magic_resist` / `health` / `max_hp_pct` / `health_regen` | —            | see shared pool (Body uses the top of each range)              |        |                                    |
| ✅ `thorns`                                                            | Thorns       | attackers take X damage                                        | 2–6    | LoL (Thornmail)                    |
| ✅⭐ `ignite_attackers`                                                | Burning Aura | X% chance to Burn melee attackers                              | 5–100% | LoL (Sunfire)                      |
| ✅⭐ `bleed_attackers`                                                 | Barbed       | X% chance to Bleed melee attackers                             | 5–100% | PoE                                |
| `grievous_thorns`                                                      | Thornmail    | melee attackers get −X% healing for 2 rounds                   | 20–40% | LoL (Thornmail, Grievous Wounds)   |
| `damage_reduction`                                                     | Fortify      | take X% less damage from hits                                  | 3–8%   | PoE (Fortify)                      |
| `front_line`                                                           | Bulwark      | +X Armor while you stand in the front column                   | 3–10   | Darkest Dungeon                    |
| `low_hp_armor`                                                         | Last Stand   | below 30% HP: +X% damage reduction                             | 10–25% | WoW (Last Stand)                   |
| `shield_start`                                                         | Warded       | start each combat with a shield of X HP (absorbs damage first) | 5–20   | LoL (Steraks), PoE (Energy Shield) |
| `dot_resist`                                                           | Purified     | Bleed and Burn deal X% less damage to you                      | 15–35% | PoE (Ailment resist)               |
| `intangible_on_low`                                                    | Ghostly ⭐   | once per combat, at below 25% HP: Intangible for 1 round       | fixed  | Slay the Spire, LoL (Zhonya's)     |

## 6. Belt

Endurance and consumables (the PoE "flask" slot).

| Id                                                                      | Name            | Effect                                                      | Range  | Source                    |
| ----------------------------------------------------------------------- | --------------- | ----------------------------------------------------------- | ------ | ------------------------- |
| 🔁 `health` / `max_hp_pct` / `armor` / `health_regen` / `status_resist` | —               | see shared pool                                             |        | PoE                       |
| `potion_power`                                                          | Alchemist       | consumables heal / restore X% more                          | 15–40% | PoE (flask effect)        |
| `potion_charges`                                                        | Deep Pockets    | X% chance a consumable used in combat is not spent          | 10–25% | PoE (flask charges)       |
| `extra_potion`                                                          | Bandolier ⭐    | +1 consumable use per combat (if there is a limit)          | 1      | PoE, Diablo               |
| `second_wind`                                                           | Second Wind     | the first time you drop below 50% HP each combat, heal X HP | 8–20   | LoL (Sterak's), WoW       |
| `bonus_endurance`                                                       | Girdle of Might | +X Endurance and +X Might (two attributes, low range)       | 1–2    | Diablo / PoE (belts)      |
| `carry_capacity` 🧭                                                     | Packmule        | +X backpack slots                                           | 1–2    | MMOs (bags)               |
| `rest_heal` 🧭                                                          | Camper          | campfires in Rifts heal X% more                             | 10–30% | Darkest Dungeon (camping) |

## 7. Boots

Speed, initiative, positioning and travel.

| Id                                            | Name           | Effect                                                                 | Range  | Source                       |
| --------------------------------------------- | -------------- | ---------------------------------------------------------------------- | ------ | ---------------------------- |
| 🔁 `initiative`                               | Swiftness      | +X Initiative (Boots use the top range: 2–4)                           |        | LoL (Boots), Darkest Dungeon |
| 🔁 `armor` / `magic_resist` / `status_resist` | —              | see shared pool                                                        |        | LoL (Tabi / Mercs)           |
| `first_turn`                                  | Quickstep ⭐   | you always act first in round 1 of each combat                         | fixed  | Dota (Blink), PoE            |
| `free_reposition`                             | Light Feet     | moving to another column / row once per combat costs no Focus / action | fixed  | Darkest Dungeon (shuffle)    |
| `move_immunity`                               | Grounded       | you cannot be moved by enemy effects (push / pull)                     | fixed  | LoL (unstoppable), Dota      |
| `auto_block`                                  | Plated Treads  | X% less damage from basic attacks                                      | 5–15%  | LoL (Plated Steelcaps)       |
| `evade_first_hit`                             | Phase Step     | the first hit on you each combat deals X% less damage                  | 30–60% | PoE (Elusive), Dota (Phase)  |
| `retreat_regen`                               | Fleet Recovery | heal X HP when you move to a column further back                       | 3–10   | MOBAs (backing)              |
| `hex_ap` 🧭                                   | Wanderer       | X% chance that moving between hexes costs 1 AP less                    | 5–15%  | MMOs (mount speed)           |
| `flee_chance` 🧭                              | Escape Artist  | +X% chance to flee a combat (if fleeing exists)                        | 10–25% | Darkest Dungeon (retreat)    |

## 8. Ring (two slots — specials can repeat across both rings)

Small, flexible bonuses. Both rings may roll the same special and they **stack**
(the "same effect twice" rule is per item, not per character).

| Id                                                                  | Name            | Effect                                       | Range  | Source                      |
| ------------------------------------------------------------------- | --------------- | -------------------------------------------- | ------ | --------------------------- |
| 🔁 `might`…`will`                                                   | +Attribute      | see shared pool                              | 1–3    | PoE                         |
| 🔁 `health` / `mana` / `initiative` / `health_regen` / `mana_regen` | —               | see shared pool                              |        |                             |
| ✅ `damage`                                                         | Damage          | +X% damage (lower range than weapon: 2–6%)   |        | PoE                         |
| ✅ `crit_chance`                                                    | Critical Chance | +X% crit chance (1–3%)                       |        | PoE                         |
| ✅ `lifesteal`                                                      | Life Steal      | X% (2–4%)                                    |        | Dota                        |
| `elemental_burn`                                                    | Ember Ring      | +X% damage of your Burn ticks                | 10–30% | PoE (Burning damage)        |
| `elemental_bleed`                                                   | Razor Ring      | +X% damage of your Bleed ticks               | 10–30% | PoE (Bleed damage)          |
| `status_duration`                                                   | Lingering       | statuses you apply last +1 round (X% chance) | 15–35% | PoE (increased duration)    |
| `mana_on_hit`                                                       | Siphon          | +X Mana on hit                               | 1–2    | PoE (Mana on hit)           |
| `heal_on_skill`                                                     | Renewal         | heal X HP each time you use a skill          | 2–6    | WoW                         |
| `gold_find` 🧭                                                      | Fortune         | +X% gold from Rifts                          | 5–15%  | Diablo, PoE (Item Quantity) |
| `item_rarity` 🧭⭐                                                  | Treasure Hunter | +X% chance of extra effects on Rift drops    | 5–15%  | PoE / Diablo (Magic Find)   |
| `gather_yield` 🧭                                                   | Prospector      | X% chance of +1 material when gathering      | 5–15%  | MMOs (gathering gear)       |

---

## Questions for the owner (decisions before implementing)

1. **Accept the list?** Which entries to cut, rename or add.
2. **Per slot instead of per kind.** Today effects are filtered by item _kind_
   (`weapon`, `offhand`, `armor`, `accessory`): Head, Body and Boots are all
   `armor`; Ring, Pendant, Face and Belt are all `accessory`. A per-slot list needs
   the filter to use the item's slot. Should Off-hand (shield / talisman) get its
   own list too?
3. **Same range on every slot, or ranges per slot** (e.g. Initiative 1–3 on Ring,
   2–4 on Boots)?
4. **Utility specials 🧭** (AP, gold, magic find, gathering, backpack): allow them,
   and only on Belt / Boots / Ring as above?
5. **⭐ effects:** only on named items, or also on random drops at 4–5 effects
   (Legendary / Mythic)?
6. **Stacking caps:** e.g. max 25% crit chance, 15% life steal, 30% damage
   reduction from gear in total?
7. Mechanics that do not exist yet and would need engine work: shields, skill
   levels from gear, push / pull, fleeing, auras, consumable limits.
