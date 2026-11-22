# Equipment bonuses — pool per slot (request #64)

**Status: PROPOSAL, not implemented.** Entries marked ✅ already exist in
`packages/game-core/src/content/affixes.ts` (request #37); the rest are new.
All names, values and slot assignments are placeholders for the owner.

Model: the Metin2 bonus tables (a fixed pool per item type, every bonus with a
ladder of values), with Path of Exile's idea of value tiers, adapted to this
game. A bonus is a **simple number**, not a complex effect. Complex effects stay
on named items (`content/named.ts`).

## How it works (proposal)

- An item holds **0–5 bonuses** (as today; rarity = number of bonuses). The same
  bonus never appears twice on one item, but **can repeat on other slots** (and
  on both rings: the values add up).
- Each bonus has **5 value tiers (T1–T5)**. Proposal: the tier comes from the
  **Rift tier** where the item dropped (T1 Rift → T1 values), with a small chance
  of one tier higher.
- Each slot has its own **pool** (matrix in section 2). A bonus can only roll on
  the slots where it is marked.
- **Bonuses 6 and 7 = runes.** Items already have `runeSlots` (structure only).
  Proposal: runes are the Metin2 "6/7 bonuses" — a smaller, separate pool
  (section 4), added by the future Runemaster profession.
- Exploration tests still use only BASE attributes (D44): attribute bonuses only
  count in combat.

Tags: ✅ exists · 🔧 needs engine / content work · 🧭 out of combat (economy) ·
⚔️ PvP only.

---

## 1. Bonus catalogue

### Attack

| Id                | Bonus                     | What it does                                              | T1  | T2  | T3  | T4  | T5  | Notes                       |
| ----------------- | ------------------------- | --------------------------------------------------------- | --- | --- | --- | --- | --- | --------------------------- |
| `vs_beast`        | Strong against Beasts     | +X% damage to Beast enemies                               | 2%  | 4%  | 6%  | 10% | 15% | 🔧 enemy families           |
| `vs_hollow`       | Strong against Hollow     | +X% damage to Hollow (undead-like) enemies                | 2%  | 4%  | 6%  | 10% | 15% | 🔧                          |
| `vs_void`         | Strong against Void       | +X% damage to Void enemies                                | 2%  | 4%  | 6%  | 10% | 15% | 🔧                          |
| `vs_construct`    | Strong against Constructs | +X% damage to Construct enemies                           | 2%  | 4%  | 6%  | 10% | 15% | 🔧                          |
| `vs_brood`        | Strong against Brood      | +X% damage to Brood (insect) enemies                      | 2%  | 4%  | 6%  | 10% | 15% | 🔧                          |
| `vs_humanoid`     | Strong against Humanoids  | +X% damage to cultists, bandits and players               | 1%  | 2%  | 3%  | 5%  | 8%  | 🔧 lower, also hits players |
| ✅ `boss_damage`  | Strong against Bosses     | +X% damage to bosses                                      | 2%  | 3%  | 5%  | 8%  | 12% |                             |
| ✅ `damage`       | Damage                    | +X% all damage                                            | 2%  | 3%  | 5%  | 7%  | 10% | Metin2 "attack value"       |
| `skill_damage`    | Skill damage              | +X% damage of skills (not the basic attack)               | 2%  | 4%  | 6%  | 8%  | 12% | 🔧                          |
| `basic_damage`    | Basic attack damage       | +X% damage of the basic attack                            | 2%  | 4%  | 6%  | 8%  | 12% | 🔧                          |
| ✅ `crit_chance`  | Chance of critical hit    | +X% crit chance                                           | 1%  | 2%  | 3%  | 5%  | 8%  |                             |
| ✅ `crit_damage`  | Critical damage           | +X% crit damage                                           | 5%  | 10% | 15% | 20% | 25% |                             |
| `pierce_chance`   | Chance for piercing hits  | X% chance a hit ignores the target's Armor / Magic Resist | 1%  | 2%  | 3%  | 5%  | 10% | 🔧                          |
| ✅ `bleed_on_hit` | Bleeding attack           | X% chance to apply Bleed                                  | 2%  | 4%  | 6%  | 10% | 15% |                             |
| ✅ `burn_on_hit`  | Burning attack            | X% chance to apply Burn                                   | 2%  | 4%  | 6%  | 10% | 15% | Metin2 "poisoning"          |
| ✅ `stun_on_hit`  | Stun chance               | X% chance to Stun                                         | 1%  | 2%  | 3%  | 4%  | 5%  | Metin2 "faint"              |
| `weaken_on_hit`   | Weakening chance          | X% chance to apply Weaken                                 | 2%  | 4%  | 6%  | 8%  | 12% | Metin2 "slowing"            |
| `mark_on_hit`     | Exposing chance           | X% chance to apply Mark                                   | 2%  | 4%  | 6%  | 8%  | 12% |                             |
| ✅ `lifesteal`    | Life steal                | X% of the damage dealt is healed                          | 1%  | 2%  | 3%  | 5%  | 8%  | Metin2 "absorbed as HP"     |
| `mana_steal`      | Mana steal                | X% of the damage dealt is restored as Mana                | 1%  | 2%  | 3%  | 5%  | 8%  | 🔧 Metin2 "rob SP"          |
| ✅ `initiative`   | Initiative                | +X Initiative                                             | 1   | 1   | 2   | 2   | 3   | Metin2 "attack speed"       |
| `cooldown_chance` | Casting speed             | X% chance a used skill's cooldown is 1 round shorter      | 3%  | 6%  | 10% | 15% | 20% | 🔧                          |
| `pvp_damage`      | Strong against players    | +X% damage to other players                               | 1%  | 2%  | 3%  | 5%  | 8%  | 🔧 ⚔️                       |

### Resistance

| Id                   | Bonus                        | What it does                                          | T1  | T2  | T3  | T4  | T5  | Notes                               |
| -------------------- | ---------------------------- | ----------------------------------------------------- | --- | --- | --- | --- | --- | ----------------------------------- |
| ✅ `armor`           | Armor                        | +X Armor                                              | 2   | 3   | 5   | 6   | 8   |                                     |
| ✅ `magic_resist`    | Magic Resistance             | +X Magic Resist                                       | 2   | 3   | 5   | 6   | 8   |                                     |
| `melee_defence`      | Melee defence                | −X% damage from `physical` hits                       | 2%  | 4%  | 6%  | 8%  | 12% | 🔧 easy: engine has damage types    |
| `ranged_defence`     | Ranged defence               | −X% damage from `ranged` hits                         | 2%  | 4%  | 6%  | 10% | 15% | 🔧 Metin2 "avoid arrows"            |
| `magic_defence`      | Magic defence                | −X% damage from `magic` hits                          | 2%  | 4%  | 6%  | 8%  | 12% | 🔧                                  |
| `def_blades`         | Blades defence               | −X% damage from swords, greatswords, daggers, scythes | 2%  | 4%  | 6%  | 10% | 15% | 🔧 ⚔️ Metin2 "sword defence"        |
| `def_axes`           | Axes defence                 | −X% damage from axes                                  | 2%  | 4%  | 6%  | 10% | 15% | 🔧 ⚔️                               |
| `def_blunt`          | Blunt defence                | −X% damage from maces, hammers, morningstars          | 2%  | 4%  | 6%  | 10% | 15% | 🔧 ⚔️                               |
| `def_polearms`       | Polearms defence             | −X% damage from spears, lances                        | 2%  | 4%  | 6%  | 10% | 15% | 🔧 ⚔️                               |
| `def_ranged_weapons` | Ranged weapons defence       | −X% damage from bows, crossbows, slings, chakrams     | 2%  | 4%  | 6%  | 10% | 15% | 🔧 ⚔️                               |
| `def_arcane`         | Arcane weapons defence       | −X% damage from staves, wands, tomes, scepters        | 2%  | 4%  | 6%  | 10% | 15% | 🔧 ⚔️                               |
| `bleed_resist`       | Bleeding resistance          | X% chance to ignore a Bleed applied to you            | 2%  | 4%  | 6%  | 10% | 15% | 🔧                                  |
| `burn_resist`        | Burning resistance           | X% chance to ignore a Burn applied to you             | 2%  | 4%  | 6%  | 10% | 15% | 🔧 Metin2 "poison resistance"       |
| `stun_resist`        | Defence against stun         | X% chance to ignore a Stun                            | 5%  | 10% | 15% | 20% | 30% | 🔧 Metin2 "defence against faint"   |
| `weaken_resist`      | Defence against weaken       | X% chance to ignore a Weaken                          | 5%  | 10% | 15% | 20% | 30% | 🔧 Metin2 "defence against slowing" |
| `boss_resist`        | Resistance to bosses         | −X% damage from bosses                                | 1%  | 2%  | 3%  | 4%  | 5%  | 🔧                                  |
| `humanoid_resist`    | Resistance to humanoids      | −X% damage from humanoids and players                 | 1%  | 2%  | 3%  | 5%  | 8%  | 🔧                                  |
| `block_chance`       | Chance to block              | X% chance to block a melee hit (no damage)            | 2%  | 4%  | 6%  | 8%  | 12% | 🔧 shields                          |
| `reflect_chance`     | Chance to reflect melee hits | X% chance to send a melee hit back to the attacker    | 1%  | 2%  | 3%  | 6%  | 10% | 🔧                                  |
| ✅ `thorns`          | Thorns                       | attackers take X damage                               | 1   | 2   | 3   | 4   | 6   |                                     |
| `damage_to_mana`     | Damage absorbed by Mana      | X% of the damage you take is paid with Mana           | 1%  | 2%  | 3%  | 5%  | 10% | 🔧 Metin2 "absorbed by SP"          |
| `full_hp_guard`      | Guard at full health         | −X% damage taken while above 90% HP                   | 1%  | 2%  | 3%  | 4%  | 5%  | 🔧                                  |
| `pvp_resist`         | Resistance to players        | −X% damage from other players                         | 1%  | 2%  | 3%  | 5%  | 8%  | 🔧 ⚔️                               |

### Other

| Id                 | Bonus                       | What it does                                         | T1  | T2  | T3  | T4  | T5  | Notes                      |
| ------------------ | --------------------------- | ---------------------------------------------------- | --- | --- | --- | --- | --- | -------------------------- |
| ✅ `might`         | Might                       | +X Might (combat only)                               | 1   | 1   | 2   | 2   | 3   | Metin2 "strength"          |
| ✅ `agility`       | Agility                     | +X Agility                                           | 1   | 1   | 2   | 2   | 3   | Metin2 "dexterity"         |
| ✅ `precision`     | Precision                   | +X Precision                                         | 1   | 1   | 2   | 2   | 3   |                            |
| ✅ `endurance`     | Endurance                   | +X Endurance                                         | 1   | 1   | 2   | 2   | 3   | Metin2 "vitality"          |
| ✅ `intellect`     | Intellect                   | +X Intellect                                         | 1   | 1   | 2   | 2   | 3   | Metin2 "intelligence"      |
| ✅ `will`          | Will                        | +X Will                                              | 1   | 1   | 2   | 2   | 3   |                            |
| ✅ `health`        | Max. HP                     | +X max HP                                            | 4   | 8   | 12  | 16  | 20  |                            |
| ✅ `mana`          | Max. Mana                   | +X max Mana                                          | 3   | 5   | 8   | 10  | 12  | Metin2 "max SP"            |
| `hp_regen`         | HP regeneration             | heal X HP at the start of each round                 | 1   | 1   | 2   | 3   | 4   | 🔧 `regen` status exists   |
| `mana_regen`       | Mana regeneration           | +X Mana at the start of each round                   | 1   | 1   | 2   | 2   | 3   | 🔧                         |
| ✅ `focus`         | Focus per round             | +1 Focus per round                                   | —   | —   | —   | 1   | 1   | only from T4               |
| `gold_find`        | Chance to drop double gold  | X% chance that a Rift's gold reward is doubled       | 2%  | 4%  | 6%  | 8%  | 15% | 🔧 🧭 Metin2 "double Yang" |
| `item_find`        | Chance to drop double items | X% chance of one extra drop in a Rift                | 1%  | 2%  | 3%  | 5%  | 10% | 🔧 🧭                      |
| `reputation_bonus` | Reputation bonus            | +X% reputation gained                                | 2%  | 4%  | 6%  | 8%  | 15% | 🔧 🧭 Metin2 "EXP bonus"   |
| `gather_bonus`     | Gathering bonus             | X% chance of +1 material when gathering              | 2%  | 4%  | 6%  | 10% | 15% | 🔧 🧭                      |
| `travel_ap`        | Movement speed              | X% chance that moving to another hex costs 1 AP less | 2%  | 4%  | 6%  | 10% | 15% | 🔧 🧭                      |

---

## 2. Pool per slot

`●` = can roll on that slot. Off-hand (shield / talisman) is included because the
slot exists.

| Bonus                          | Weapon | Head | Face | Pendant | Body | Belt | Boots | Ring | Off-hand |
| ------------------------------ | :----: | :--: | :--: | :-----: | :--: | :--: | :---: | :--: | :------: |
| **Attack**                     |        |      |      |         |      |      |       |      |          |
| Strong against {family} (×6)   |   ●    |  ●   |  ●   |         |      |      |       |  ●   |    ●     |
| Strong against Bosses          |   ●    |      |      |    ●    |      |  ●   |       |      |          |
| Damage                         |   ●    |      |      |         |  ●   |      |       |  ●   |          |
| Skill damage                   |   ●    |  ●   |      |    ●    |      |      |       |      |          |
| Basic attack damage            |   ●    |      |      |         |      |  ●   |       |  ●   |          |
| Chance of critical hit         |   ●    |      |  ●   |    ●    |      |      |   ●   |      |          |
| Critical damage                |   ●    |      |  ●   |         |      |      |       |      |          |
| Chance for piercing hits       |   ●    |      |      |    ●    |      |      |       |  ●   |          |
| Bleeding attack                |   ●    |  ●   |      |         |      |  ●   |       |      |          |
| Burning attack                 |   ●    |  ●   |      |         |      |  ●   |       |      |          |
| Stun chance                    |   ●    |      |      |    ●    |      |  ●   |   ●   |      |          |
| Weakening chance               |   ●    |      |      |         |      |  ●   |   ●   |      |          |
| Exposing chance (Mark)         |   ●    |      |  ●   |         |      |      |       |      |          |
| Life steal                     |   ●    |      |      |         |  ●   |  ●   |       |  ●   |          |
| Mana steal                     |        |      |  ●   |         |      |      |       |  ●   |          |
| Initiative                     |   ●    |  ●   |      |         |      |      |   ●   |      |          |
| Casting speed                  |        |      |      |         |  ●   |      |       |  ●   |          |
| **Resistance**                 |        |      |      |         |      |      |       |      |          |
| Armor                          |        |  ●   |      |         |  ●   |  ●   |   ●   |      |    ●     |
| Magic Resistance               |        |  ●   |      |         |  ●   |      |       |  ●   |    ●     |
| Melee / Ranged / Magic defence |        |  ●   |      |         |  ●   |      |   ●   |      |    ●     |
| {weapon family} defence (×6)   |        |      |  ●   |    ●    |  ●   |      |   ●   |      |          |
| Bleeding / Burning resistance  |        |      |  ●   |         |      |  ●   |       |  ●   |          |
| Defence against stun           |        |  ●   |      |         |      |  ●   |       |      |    ●     |
| Defence against weaken         |        |      |      |         |      |  ●   |   ●   |      |    ●     |
| Resistance to bosses           |        |      |      |         |  ●   |  ●   |       |      |    ●     |
| Resistance to humanoids        |        |      |      |         |  ●   |  ●   |       |      |          |
| Chance to block                |        |      |      |         |      |      |       |      |    ●     |
| Chance to reflect melee hits   |        |      |      |         |  ●   |  ●   |       |      |    ●     |
| Thorns                         |        |      |      |         |  ●   |      |       |      |    ●     |
| Damage absorbed by Mana        |        |  ●   |      |    ●    |  ●   |  ●   |       |      |          |
| Guard at full health           |        |      |      |         |  ●   |      |       |      |          |
| **Other**                      |        |      |      |         |      |      |       |      |          |
| Attributes (each of 6)         | ● (1)  |      |      |    ●    |      |  ●   |       |  ●   |    ●     |
| Max. HP                        |        |  ●   |      |    ●    |  ●   |  ●   |   ●   |  ●   |          |
| Max. Mana                      |        |  ●   |      |    ●    |  ●   |      |   ●   |  ●   |          |
| HP regeneration                |        |  ●   |      |    ●    |      |  ●   |       |      |          |
| Mana regeneration              |        |  ●   |      |    ●    |      |      |       |      |          |
| Focus per round                |   ●    |      |      |    ●    |      |      |       |      |          |
| Double gold                    |        |      |      |    ●    |      |      |   ●   |      |    ●     |
| Double items                   |        |      |  ●   |         |      |      |       |  ●   |          |
| Reputation bonus               |        |      |      |    ●    |      |      |   ●   |      |    ●     |
| Gathering bonus                |        |      |      |         |      |  ●   |       |  ●   |          |
| Movement speed (AP)            |        |      |      |         |      |      |   ●   |      |          |

(1) Weapon: only the weapon's own primary / secondary attribute.

**Identity of each slot** (short version):

- **Weapon** — offence: families, crits, piercing, on-hit statuses, life steal.
- **Head** — magic and control: skill damage, regen, Magic Resist, stun defence.
- **Face** — hunter: crits, Mark, family defences, mana steal, double items.
- **Pendant** — the "big" jewel: HP/Mana, regen, Focus, bosses, gold and reputation.
- **Body** — tank: Armor, MR, damage-type defences, reflect, thorns, HP.
- **Belt** — endurance and statuses: attributes, status resistances, life steal.
- **Boots** — speed: Initiative, ranged defence, AP when travelling, gold, reputation.
- **Ring** — small offensive and utility bonuses; two rings, values add up.
- **Off-hand** — defence: block, reflect, stun / weaken defence, bosses.

---

## 3. Values per slot

Default: every slot uses the T1–T5 ladder of the catalogue. Exceptions (proposal):

- **Ring**: offensive bonuses use about half the ladder (two rings).
- **Pendant**: attributes and Max. HP one tier higher (it is the "big" jewel).
- **Weapon**: `damage` and crits use the full ladder; other slots that have them
  use one tier lower.

## 4. Bonuses 6 and 7 — runes (proposal)

Smaller pool, no tiers by Rift (the rune's own quality decides), like Metin2's
"6/7 bonuses":

| Rune bonus                | Values (low → high)                       |
| ------------------------- | ----------------------------------------- |
| Damage                    | 1–5%                                      |
| Max. HP                   | 2–10                                      |
| Max. Mana                 | 1–8                                       |
| Bleeding / Burning attack | 1–5%                                      |
| Bleeding / Burning resist | 1–5%                                      |
| Strong against Bosses     | 1–5%                                      |
| Resistance to bosses      | 1–5%                                      |
| Damage absorbed by Mana   | 1–3%                                      |
| Masterwork                | +1–25% to the item's 1st–5th bonus values |

Metin2's "8th bonuses" (Discipline, Blood Rage, Ritual…) are left for later; the
closest thing here are the fixed effects of named items.

---

## 5. Ideas from Path of Exile weapons (proposal)

Source: general knowledge of Path of Exile's weapon and modifier systems (the
wiki pages could not be read from the dev environment — Cloudflare blocks
automated requests). Adapted to rounds, Focus, skill levels 1–10 and the
existing weapon catalogue.

### 5.1 Implicit bonus per weapon type

In PoE every weapon class has a fixed **implicit** line that comes with the base
(claws: life on hit; daggers: crit chance; sceptres: elemental damage; wands:
spell damage; staves: block). Proposal: every weapon type in `content/weapons.ts`
gets one implicit, fixed, outside the 0–5 bonuses, growing with +1…+10 like the
named items' fixed effects.

| Weapon type                  | Implicit (proposal)                       | PoE analogue                |
| ---------------------------- | ----------------------------------------- | --------------------------- |
| Sword                        | +5% basic attack damage                   | sword accuracy              |
| Greatsword                   | +10% crit damage                          | thrusting sword crit multi  |
| Dagger                       | +4% crit chance                           | dagger crit chance          |
| Scythe                       | 5% Bleed on hit                           | —                           |
| Axe / Handaxe                | 5% Bleed on hit                           | axe physical / bleed        |
| Greataxe                     | +3 damage on kill (next hit)              | —                           |
| Mace / Morningstar           | +2% Stun on hit                           | mace stun threshold         |
| Hammer / Greathammer         | +1 round of Stun duration (when it stuns) | two-hand mace stun duration |
| Spear / Lance                | 3% piercing hits                          | spear / impale              |
| Bow                          | +1 Initiative                             | bow quiver bonuses          |
| Crossbow                     | 5% piercing hits                          | —                           |
| Sling / Chakram              | 5% Weaken on hit                          | —                           |
| Staff                        | 5% block chance                           | staff block                 |
| Wand                         | +6% skill damage                          | wand spell damage           |
| Tome                         | +3 max Mana                               | —                           |
| Scepter                      | 5% Burn on hit                            | sceptre elemental damage    |
| Claw-like weapons (if added) | heal 1 HP on hit                          | claw life gained on hit     |

### 5.2 Prefixes and suffixes

PoE splits rolled mods into **prefixes** (mostly damage / defence numbers) and
**suffixes** (mostly utility: speed, crit, resistances, attributes), max 3 of
each. Proposal: same split with our 5 bonuses — **max 3 Attack** bonuses on one
item — so a Mythic cannot be 5 pure damage lines. (Question for the owner.)

### 5.3 New bonuses taken from PoE

| Id                 | Bonus                      | What it does                                                                       | T1  | T5  | PoE source                     |
| ------------------ | -------------------------- | ---------------------------------------------------------------------------------- | --- | --- | ------------------------------ |
| `local_damage`     | Increased weapon damage    | +X% to the weapon's own base damage (weapon only)                                  | 10% | 50% | % increased physical damage    |
| `added_damage`     | Adds X–Y damage            | +X–Y flat damage to the basic attack                                               | 1–2 | 4–7 | adds # to # physical damage    |
| `added_magic`      | Adds X–Y magic damage      | +X–Y magic damage to the basic attack (hits Magic Resist)                          | 1–2 | 3–6 | adds # to # elemental damage   |
| `skill_levels`     | +1 to {weapon type} skills | +1 level to skills of that weapon type (max level 10)                              | +1  | +2  | +# to level of socketed gems   |
| `all_skill_levels` | +1 to all skills ⭐        | +1 level to all prepared skills                                                    | +1  | +1  | +1 to level of all spell gems  |
| `life_on_hit`      | Life gained on hit         | heal X HP each hit                                                                 | 1   | 3   | life gained for each enemy hit |
| `life_on_kill`     | Life gained on kill        | heal X HP on kill                                                                  | 2   | 8   | life gained on kill            |
| `mana_on_kill`     | Mana gained on kill        | +X Mana on kill                                                                    | 2   | 6   | mana gained on kill            |
| `focus_on_kill`    | Focus on kill              | X% chance of +1 Focus on kill                                                      | 10% | 30% | power / frenzy charge on kill  |
| `dot_damage`       | Damage over time           | +X% damage of your Bleed and Burn ticks                                            | 5%  | 25% | damage over time multiplier    |
| `status_duration`  | Ailment duration           | X% chance that statuses you apply last +1 round                                    | 5%  | 25% | increased ailment duration     |
| `armor_pen`        | Armor penetration          | ignore X% of the target's Armor                                                    | 3%  | 15% | penetration                    |
| `magic_pen`        | Magic penetration          | ignore X% of the target's Magic Resist                                             | 3%  | 15% | elemental penetration          |
| `culling`          | Culling Strike ⭐          | a hit that leaves a non-boss below 10% HP kills it                                 | —   | —   | culling strike                 |
| `onslaught`        | Onslaught on kill          | on kill: +X Initiative next round                                                  | 2   | 5   | onslaught on kill              |
| `chill_on_hit`     | Chilling attack            | X% chance to apply Chill (−X Initiative, 2 rounds) — new status                    | 3%  | 12% | chill / freeze                 |
| `blind_on_hit`     | Blinding attack            | X% chance to apply Blind (attacks miss 25%) — new status                           | 2%  | 8%  | blind on hit                   |
| `vs_bleeding`      | Damage vs bleeding enemies | +X% damage to enemies with Bleed                                                   | 5%  | 20% | damage vs bleeding enemies     |
| `vs_burning`       | Damage vs burning enemies  | +X% damage to enemies with Burn                                                    | 5%  | 20% | damage vs ignited enemies      |
| `vs_stunned`       | Damage vs stunned enemies  | +X% damage to Stunned enemies                                                      | 5%  | 25% | damage vs stunned / frozen     |
| `stun_duration`    | Stun duration              | X% chance that your Stuns last +1 round                                            | 10% | 30% | increased stun duration        |
| `impale`           | Impale                     | X% chance that a hit stores 30% of its damage, dealt again next hit on that target | 5%  | 20% | impale                         |

T2–T4 values sit between T1 and T5 (to be filled in when implemented).

### 5.4 One-handed, two-handed and dual wield

- **Two-handed weapons** roll offensive bonuses at **×1.5** the value (in PoE
  flat damage on two-handed weapons is roughly double), because they give up
  the off-hand.
- **Dual wield** (weapon in the off-hand, if allowed): +5% block chance and
  +1 Initiative while dual wielding (PoE: +attack speed and +15% block).
- **Shield** in the off-hand: block chance is its typical bonus.

### 5.5 Crafting ideas (for the blacksmith / Runemaster)

| PoE mechanic        | Here (proposal)                                                                     |
| ------------------- | ----------------------------------------------------------------------------------- |
| Crafting bench      | the blacksmith adds **one chosen bonus** (low tier) to an item with a free slot     |
| Orb of Alteration   | material that **rerolls the values** of the bonuses (same bonuses)                  |
| Chaos Orb           | material that **rerolls all bonuses** (same number)                                 |
| Exalted Orb         | rare material that **adds one random bonus** (if there is a free slot)              |
| Fractured mod       | one bonus is **locked** and survives rerolls                                        |
| Veiled mod          | a drop with a hidden bonus: at the blacksmith you **choose 1 of 3**                 |
| Vaal / corruption   | risky material: +1 implicit, or rerolled, or item becomes unmodifiable — final      |
| Influence (Shaper…) | Rift-specific bonuses that only drop in some Rifts (e.g. Void Rifts → Void bonuses) |
| Quality             | **not used**: here quality is durability (D19)                                      |
| Sockets / links     | the rune slots (section 4)                                                          |

---

## Questions for the owner

1. ~~Enemy families~~ — **decided (D121)**: Beast (Hollow Hound, Thornback,
   Rift Leech), Hollow (Rift Husk, The Hollow Colossus), Void (Void Shaman, Phase
   Stalker, Shard Spitter), Construct (Rift Bulwark, Rift Warden), Brood (Brood
   Mother, Volatile Mite), Humanoid (Rift Zealot, players).
2. **Tier of the value**: from the Rift tier (proposal) or random?
3. **Weapon-family defences** only work in PvP (monsters use abilities, not
   weapons). Keep them, or use only Melee / Ranged / Magic defence?
4. **Runes as bonuses 6 and 7** — yes / no?
5. **Economy bonuses 🧭** (double gold, double items, reputation, gathering, AP) — allow?
6. **Caps** on totals (e.g. crit chance 30%, life steal 15%, block 25%)?
7. Is the slot matrix right, or do you want to move bonuses between slots?
8. **Implicits per weapon type** (5.1): yes / no, and the list.
9. **Max 3 Attack bonuses per item** (PoE prefix / suffix split, 5.2)?
10. Which **new PoE bonuses** (5.3) to keep? Chill and Blind would be new statuses.
11. **Two-handed ×1.5** and the **dual wield** bonus (5.4)?
12. Which **crafting materials** (5.5) to have, and who makes them?
