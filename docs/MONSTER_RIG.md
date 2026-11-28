# Monstros em ossos — o que desenhar (pedido #91)

Como o herói (`docs/HERO_RIG.md`), cada monstro é desenhado como um
**esqueleto de ossos, cada um de uma cor**, até haver arte. Os 36 monstros usam
**6 tipos de corpo**; cada monstro tem o seu tipo e um tamanho (×1 = tamanho
do herói).

Folha de referência: **`art/rig/monster_rigs_reference.svg`** (abrir no
browser) — o esqueleto de cada tipo, as peças com cor, ficheiro e tamanho, e
os monstros que o usam.

## Como desenhar

1. Os esqueletos estão **virados para a direita** (como o herói); o jogo
   espelha os monstros para olharem para a esquerda. Desenhar virado para a
   direita.
2. **Uma imagem por osso, por monstro**, PNG transparente, no tamanho da tabela,
   na pose da folha, a encher a caixa tracejada; a peça "nasce" no ponto
   branco (a articulação).
3. Gravar em **`apps/web/src/features/avatar/monsters/<monstro>/_bone_<peça>.png`**
   (ex.: `monsters/hollow_hound/_bone_head.png`). Basta pôr o ficheiro: o jogo
   troca logo esse osso pela imagem.
4. Os monstros maiores (×1,1…) são a mesma imagem ampliada pelo jogo.

## Tipos de corpo, peças e monstros

### Humanoid

Monstros: `rift_husk`, `rift_warden (×1.08)`, `rift_bulwark (×1.05)`, `void_shaman`, `phase_stalker`, `rift_zealot`, `bone_archer`, `prism_sentinel`, `cult_assassin (×0.95)`, `flagellant`, `blood_priest`, `cult_fanatic`, `high_inquisitor (×1.05)`, `bleeding_saint (×1.1)`, `drowned_thrall`, `drowned_siren`, `drowned_knight (×1.05)`, `rift_knight (×1.05)`, `unmaker (×1.1)`, `void_herald (×1.1)`

| Parte                   | Cor       | Ficheiro                    | Tamanho (px) |
| ----------------------- | --------- | --------------------------- | ------------ |
| Upper arm (left, far)   | `#911eb4` | `_bone_upper_arm_left.png`  | 100 × 116    |
| Forearm (left, far)     | `#f032e6` | `_bone_forearm_left.png`    | 92 × 76      |
| Hand (left, far)        | `#a9a9a9` | `_bone_hand_left.png`       | 55 × 56      |
| Thigh (left, far)       | `#800000` | `_bone_thigh_left.png`      | 124 × 156    |
| Shin (left, far)        | `#aaffc3` | `_bone_shin_left.png`       | 72 × 164     |
| Foot (left, far)        | `#808000` | `_bone_foot_left.png`       | 104 × 68     |
| Pelvis / hips           | `#bfef45` | `_bone_pelvis.png`          | 104 × 89     |
| Torso / chest           | `#ffe119` | `_bone_torso.png`           | 122 × 177    |
| Thigh (right, near)     | `#469990` | `_bone_thigh_right.png`     | 112 × 164    |
| Shin (right, near)      | `#dcbeff` | `_bone_shin_right.png`      | 100 × 152    |
| Foot (right, near)      | `#9a6324` | `_bone_foot_right.png`      | 96 × 72      |
| Upper arm (right, near) | `#3cb44b` | `_bone_upper_arm_right.png` | 76 × 132     |
| Forearm (right, near)   | `#42d4f4` | `_bone_forearm_right.png`   | 96 × 96      |
| Hand (right, near)      | `#4363d8` | `_bone_hand_right.png`      | 59 × 56      |
| Neck                    | `#f58231` | `_bone_neck.png`            | 64 × 80      |
| Head                    | `#e6194b` | `_bone_head.png`            | 89 × 120     |

### Brute (big humanoid)

Monstros: `hollow_colossus (×1.15)`, `husk_abomination (×1.12)`, `geode_crusher (×1.1)`, `geode_titan (×1.15)`

| Parte                   | Cor       | Ficheiro                    | Tamanho (px) |
| ----------------------- | --------- | --------------------------- | ------------ |
| Upper arm (left, far)   | `#911eb4` | `_bone_upper_arm_left.png`  | 112 × 128    |
| Forearm (left, far)     | `#f032e6` | `_bone_forearm_left.png`    | 100 × 84     |
| Hand (left, far)        | `#a9a9a9` | `_bone_hand_left.png`       | 58 × 66      |
| Thigh (left, far)       | `#800000` | `_bone_thigh_left.png`      | 140 × 172    |
| Shin (left, far)        | `#aaffc3` | `_bone_shin_left.png`       | 84 × 176     |
| Foot (left, far)        | `#808000` | `_bone_foot_left.png`       | 112 × 76     |
| Pelvis / hips           | `#bfef45` | `_bone_pelvis.png`          | 131 × 101    |
| Torso / chest           | `#ffe119` | `_bone_torso.png`           | 153 × 177    |
| Thigh (right, near)     | `#469990` | `_bone_thigh_right.png`     | 128 × 180    |
| Shin (right, near)      | `#dcbeff` | `_bone_shin_right.png`      | 112 × 164    |
| Foot (right, near)      | `#9a6324` | `_bone_foot_right.png`      | 104 × 80     |
| Upper arm (right, near) | `#3cb44b` | `_bone_upper_arm_right.png` | 88 × 144     |
| Forearm (right, near)   | `#42d4f4` | `_bone_forearm_right.png`   | 104 × 104    |
| Hand (right, near)      | `#4363d8` | `_bone_hand_right.png`      | 60 × 67      |
| Neck                    | `#f58231` | `_bone_neck.png`            | 72 × 88      |
| Head                    | `#e6194b` | `_bone_head.png`            | 112 × 121    |

### Quadruped (four legs)

Monstros: `hollow_hound`, `thornback (×1.1)`, `tide_lurker (×1.05)`

| Parte                   | Cor       | Ficheiro                         | Tamanho (px) |
| ----------------------- | --------- | -------------------------------- | ------------ |
| Hind leg, upper (far)   | `#e6194b` | `_bone_hind_leg_upper_far.png`   | 92 × 140     |
| Hind leg, lower (far)   | `#f58231` | `_bone_hind_leg_lower_far.png`   | 72 × 128     |
| Front leg, upper (far)  | `#ffe119` | `_bone_front_leg_upper_far.png`  | 72 × 128     |
| Front leg, lower (far)  | `#bfef45` | `_bone_front_leg_lower_far.png`  | 56 × 128     |
| Tail                    | `#3cb44b` | `_bone_tail.png`                 | 132 × 92     |
| Back / belly            | `#42d4f4` | `_bone_back.png`                 | 128 × 120    |
| Chest / shoulders       | `#4363d8` | `_bone_chest.png`                | 128 × 136    |
| Neck                    | `#911eb4` | `_bone_neck.png`                 | 108 × 108    |
| Head / jaws             | `#f032e6` | `_bone_head.png`                 | 122 × 95     |
| Hind leg, upper (near)  | `#a9a9a9` | `_bone_hind_leg_upper_near.png`  | 104 × 144    |
| Hind leg, lower (near)  | `#800000` | `_bone_hind_leg_lower_near.png`  | 76 × 124     |
| Front leg, upper (near) | `#aaffc3` | `_bone_front_leg_upper_near.png` | 76 × 132     |
| Front leg, lower (near) | `#808000` | `_bone_front_leg_lower_near.png` | 68 × 124     |

### Crawler (worm, leech, mite)

Monstros: `rift_leech`, `grave_crawler`, `shard_spitter (×0.9)`, `volatile_mite (×0.7)`

| Parte           | Cor       | Ficheiro              | Tamanho (px) |
| --------------- | --------- | --------------------- | ------------ |
| Tail            | `#e6194b` | `_bone_tail.png`      | 120 × 72     |
| Body segment 3  | `#f58231` | `_bone_segment_3.png` | 113 × 89     |
| Body segment 2  | `#ffe119` | `_bone_segment_2.png` | 113 × 104    |
| Body segment 1  | `#bfef45` | `_bone_segment_1.png` | 112 × 120    |
| Head / mouth    | `#3cb44b` | `_bone_head.png`      | 114 × 112    |
| Mandible / fang | `#42d4f4` | `_bone_mandible.png`  | 80 × 64      |

### Spider (many legs)

Monstros: `brood_mother (×1.1)`, `crystal_matriarch (×1.15)`

| Parte             | Cor       | Ficheiro                     | Tamanho (px) |
| ----------------- | --------- | ---------------------------- | ------------ |
| Leg far 1, upper  | `#e6194b` | `_bone_leg_far_1_upper.png`  | 84 × 140     |
| Leg far 1, lower  | `#f58231` | `_bone_leg_far_1_lower.png`  | 88 × 304     |
| Leg far 2, upper  | `#ffe119` | `_bone_leg_far_2_upper.png`  | 84 × 148     |
| Leg far 2, lower  | `#bfef45` | `_bone_leg_far_2_lower.png`  | 88 × 312     |
| Leg far 3, upper  | `#3cb44b` | `_bone_leg_far_3_upper.png`  | 140 × 132    |
| Leg far 3, lower  | `#42d4f4` | `_bone_leg_far_3_lower.png`  | 96 × 288     |
| Abdomen           | `#4363d8` | `_bone_abdomen.png`          | 177 × 176    |
| Thorax            | `#911eb4` | `_bone_thorax.png`           | 113 × 120    |
| Head              | `#f032e6` | `_bone_head.png`             | 97 × 85      |
| Leg near 1, upper | `#a9a9a9` | `_bone_leg_near_1_upper.png` | 112 × 136    |
| Leg near 1, lower | `#800000` | `_bone_leg_near_1_lower.png` | 108 × 276    |
| Leg near 2, upper | `#aaffc3` | `_bone_leg_near_2_upper.png` | 64 × 152     |
| Leg near 2, lower | `#808000` | `_bone_leg_near_2_lower.png` | 84 × 284     |
| Leg near 3, upper | `#469990` | `_bone_leg_near_3_upper.png` | 128 × 136    |
| Leg near 3, lower | `#dcbeff` | `_bone_leg_near_3_lower.png` | 92 × 268     |

### Floater (no legs, tentacles)

Monstros: `void_horror`, `leviathan_maw (×1.12)`, `rift_heart (×1.15)`

| Parte                  | Cor       | Ficheiro                          | Tamanho (px) |
| ---------------------- | --------- | --------------------------------- | ------------ |
| Tentacle far 1, upper  | `#e6194b` | `_bone_tentacle_far_1_upper.png`  | 84 × 132     |
| Tentacle far 1, lower  | `#f58231` | `_bone_tentacle_far_1_lower.png`  | 60 × 116     |
| Tentacle far 2, upper  | `#ffe119` | `_bone_tentacle_far_2_upper.png`  | 92 × 132     |
| Tentacle far 2, lower  | `#bfef45` | `_bone_tentacle_far_2_lower.png`  | 68 × 116     |
| Body / core            | `#3cb44b` | `_bone_core.png`                  | 208 × 232    |
| Maw / face             | `#42d4f4` | `_bone_maw.png`                   | 118 × 113    |
| Tentacle near 1, upper | `#4363d8` | `_bone_tentacle_near_1_upper.png` | 56 × 136     |
| Tentacle near 1, lower | `#911eb4` | `_bone_tentacle_near_1_lower.png` | 72 × 120     |
| Tentacle near 2, upper | `#f032e6` | `_bone_tentacle_near_2_upper.png` | 64 × 136     |
| Tentacle near 2, lower | `#a9a9a9` | `_bone_tentacle_near_2_lower.png` | 80 × 120     |

## Mudar

Tipos de corpo e que monstro usa qual: `apps/web/src/features/avatar/monster-rigs.ts`
(`BODY_PLANS`, `ENEMY_RIGS`). Monstros novos (ou criados no admin) sem
entrada são humanoides. Voltar a gerar a folha:

```
pnpm tsx scripts/art/monster-rigs.ts
```

Os desenhos antigos dos monstros continuam no código:
`ENEMY_STYLE = 'painted'` em `EnemyAvatar.tsx`.
