# Herói em ossos — o que desenhar (pedido #91)

Enquanto não há arte, o herói é desenhado como um **esqueleto de 16 ossos**,
**cada um de uma cor**, na **pose do Darkest Dungeon**: perfil a três quartos
virado para a direita, cerca de 6 cabeças de altura, em guarda (pernas
afastadas — a da frente dobrada, a de trás esticada —, tronco inclinado para a
frente, ombro de trás meio escondido, braço da arma baixo e à frente). Cada osso é **uma peça a desenhar**. A folha de
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

## Esquerda e direita (importante)

Virado para a direita, com o peito para nós, o **lado direito do herói é o
que está mais perto**:

- **braço direito** (perto): desenhado **à frente** do corpo, **segura a arma**;
- **braço esquerdo** (longe): vai esticado para a frente, na direção do
  inimigo, mas **por trás** do corpo; segura o escudo/mão secundária;
- **perna esquerda** (longe): a que avança, dobrada, **por trás**;
- **perna direita** (perto): a que fica esticada para trás, **à frente**.

## Camadas (como o jogo anima)

- **offhand** — braço esquerdo (roda no ombro esquerdo) + escudo/mão secundária, atrás do corpo;
- **base** — perna esquerda, bacia, tronco e perna direita (respira);
- **weapon** — braço direito (roda no ombro direito) + arma, à frente do corpo;
- **head** — pescoço e cabeça (roda no pescoço).

A ordem da tabela é a ordem de desenho (de trás para a frente).

## As 16 peças

| #   | Parte                   | Cor       | Ficheiro                    | Tamanho (px) | Roda em (x, y) | Camada  |
| --- | ----------------------- | --------- | --------------------------- | ------------ | -------------- | ------- |
| 1   | Upper arm (left, far)   | `#911eb4` | `_bone_upper_arm_left.png`  | 100 × 116    | 288, 212       | offhand |
| 2   | Forearm (left, far)     | `#f032e6` | `_bone_forearm_left.png`    | 92 × 76      | 332, 272       | offhand |
| 3   | Hand (left, far)        | `#a9a9a9` | `_bone_hand_left.png`       | 55 × 56      | 372, 296       | offhand |
| 4   | Thigh (left, far)       | `#800000` | `_bone_thigh_left.png`      | 124 × 156    | 248, 384       | base    |
| 5   | Shin (left, far)        | `#aaffc3` | `_bone_shin_left.png`       | 72 × 164     | 304, 472       | base    |
| 6   | Foot (left, far)        | `#808000` | `_bone_foot_left.png`       | 104 × 68     | 292, 576       | base    |
| 7   | Pelvis / hips           | `#bfef45` | `_bone_pelvis.png`          | 104 × 89     | 240, 344       | base    |
| 8   | Torso / chest           | `#ffe119` | `_bone_torso.png`           | 122 × 177    | 264, 208       | base    |
| 9   | Thigh (right, near)     | `#469990` | `_bone_thigh_right.png`     | 112 × 164    | 220, 388       | base    |
| 10  | Shin (right, near)      | `#dcbeff` | `_bone_shin_right.png`      | 100 × 152    | 176, 484       | base    |
| 11  | Foot (right, near)      | `#9a6324` | `_bone_foot_right.png`      | 96 × 72      | 136, 576       | base    |
| 12  | Upper arm (right, near) | `#3cb44b` | `_bone_upper_arm_right.png` | 76 × 132     | 244, 220       | weapon  |
| 13  | Forearm (right, near)   | `#42d4f4` | `_bone_forearm_right.png`   | 96 × 96      | 224, 296       | weapon  |
| 14  | Hand (right, near)      | `#4363d8` | `_bone_hand_right.png`      | 59 × 56      | 268, 340       | weapon  |
| 15  | Neck                    | `#f58231` | `_bone_neck.png`            | 64 × 80      | 264, 208       | head    |
| 16  | Head                    | `#e6194b` | `_bone_head.png`            | 89 × 120     | 276, 180       | head    |

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
