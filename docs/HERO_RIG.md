# Herói em ossos — o que desenhar (pedido #91)

Enquanto não há arte, o herói é desenhado como um **esqueleto de 16 ossos**,
**cada um de uma cor**. Cada osso é **uma peça a desenhar**. A folha de
referência mostra o herói montado e cada peça sozinha, com o tamanho e o
nome do ficheiro:

**`art/rig/hero_rig_reference.svg`** (abrir no browser).

## Como desenhar cada peça

1. **Uma imagem por osso**, PNG com fundo transparente, no **tamanho da
   tabela** (é a caixa tracejada da folha, à escala ×4 do herói de 120×160).
2. Desenhar a peça **na pose da folha** (o herói olha para a direita),
   **a encher a caixa**: a imagem é posta exatamente onde está a caixa.
3. O **ponto branco** é a articulação onde a peça roda (ombro, cotovelo,
   joelho, pescoço…): a peça deve "nascer" ali, para não se descolar quando
   o corpo se mexe.
4. Gravar como **`apps/web/src/features/avatar/bones/_bone_<osso>.png`**
   (nome na tabela). **Basta pôr o ficheiro**: o jogo troca logo o osso
   colorido pela imagem, peça a peça. Pode-se ir desenhando aos poucos.
5. A roupa e a armadura entram nas peças (há uma margem à volta de cada osso
   para isso). As **armas** já têm arte própria e não fazem parte do corpo.

## Camadas (como o jogo anima)

- **offhand** — braço de trás (roda no ombro de trás) + escudo/mão secundária;
- **base** — pernas, bacia e tronco (respira);
- **weapon** — braço da frente (roda no ombro da frente) + arma;
- **head** — pescoço e cabeça (roda no pescoço).

A ordem da tabela é a ordem de desenho (de trás para a frente).

## As 16 peças

| #   | Parte             | Cor       | Ficheiro                    | Tamanho (px) | Roda em (x, y) | Camada  |
| --- | ----------------- | --------- | --------------------------- | ------------ | -------------- | ------- |
| 1   | Upper arm (back)  | `#911eb4` | `_bone_upper_arm_back.png`  | 82 × 152     | 178, 196       | offhand |
| 2   | Forearm (back)    | `#f032e6` | `_bone_forearm_back.png`    | 72 × 128     | 152, 292       | offhand |
| 3   | Hand (back)       | `#a9a9a9` | `_bone_hand_back.png`       | 56 × 62      | 132, 368       | offhand |
| 4   | Thigh (back)      | `#800000` | `_bone_thigh_back.png`      | 88 × 176     | 216, 376       | base    |
| 5   | Shin (back)       | `#aaffc3` | `_bone_shin_back.png`       | 72 × 156     | 196, 484       | base    |
| 6   | Foot (back)       | `#808000` | `_bone_foot_back.png`       | 96 × 68      | 184, 580       | base    |
| 7   | Thigh (front)     | `#469990` | `_bone_thigh_front.png`     | 84 × 176     | 264, 376       | base    |
| 8   | Shin (front)      | `#dcbeff` | `_bone_shin_front.png`      | 64 × 156     | 280, 484       | base    |
| 9   | Foot (front)      | `#9a6324` | `_bone_foot_front.png`      | 100 × 68     | 276, 580       | base    |
| 10  | Pelvis / hips     | `#bfef45` | `_bone_pelvis.png`          | 128 × 97     | 240, 328       | base    |
| 11  | Torso / chest     | `#ffe119` | `_bone_torso.png`           | 152 × 168    | 240, 200       | base    |
| 12  | Upper arm (front) | `#3cb44b` | `_bone_upper_arm_front.png` | 107 × 120    | 305, 196       | weapon  |
| 13  | Forearm (front)   | `#42d4f4` | `_bone_forearm_front.png`   | 100 × 80     | 356, 260       | weapon  |
| 14  | Hand (front)      | `#4363d8` | `_bone_hand_front.png`      | 64 × 57      | 404, 288       | weapon  |
| 15  | Neck              | `#f58231` | `_bone_neck.png`            | 60 × 81      | 240, 200       | head    |
| 16  | Head              | `#e6194b` | `_bone_head.png`            | 136 × 179    | 240, 179       | head    |

"Roda em" = coordenadas da articulação na imagem do herói inteiro a ×4
(480 × 640 px).

## Mudar o esqueleto

Os ossos estão em `apps/web/src/features/avatar/bone-rig.ts` (articulações,
grossura, forma). Depois de mudar, voltar a gerar a folha:

```
pnpm tsx scripts/art/hero-rig.ts
```

O desenho antigo (as peças recortadas do pedido #72) continua no código:
`HERO_STYLE = 'painted'` em `CharacterAvatar.tsx`.
