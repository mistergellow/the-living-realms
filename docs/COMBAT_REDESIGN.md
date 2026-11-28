# Combate — diagnóstico e proposta de redesenho (pedido #89)

> Documento para o dono decidir. **Nada aqui está implementado.** Os números
> são exemplos; os finais saem da simulação (`pnpm sim`) depois de aprovado o
> desenho.

Objetivo do dono: uma mistura de **Pokémon / Slay the Spire / Darkest
Dungeon**, com o aspeto do Darkest Dungeon. Queixas: combate desequilibrado,
efeitos que são "todos versões do mesmo com nomes diferentes", armas mal
balançadas, poucos poderes, sem cenários únicos e divertidos.

---

## 1. Diagnóstico (dados de 2026-11-28)

### 1.1 Equilíbrio das armas — `pnpm sim`, Rift de tier 1, a solo

| Arma                     | Vitórias | Onde morre     |
| ------------------------ | -------: | -------------- |
| Besta                    |     68 % | elites         |
| Lança de cavalaria       |     67 % | elites         |
| Arco                     |     64 % | elites         |
| Lança                    |     61 % | elites         |
| Foice                    |     56 % | elites         |
| Adagas duplas            |     48 % | boss / elites  |
| Machadinhas duplas       |     45 % | elites         |
| Montante                 |     39 % | elites         |
| Cajado                   |     37 % | combate normal |
| Espada + escudo          |     28 % | combate normal |
| Varinha                  |     26 % | boss           |
| Machado duplo            |     23 % | boss           |
| Tomo + talismã           |     17 % | boss           |
| Funda                    |     14 % | boss           |
| Machado + escudo         |     10 % | boss           |
| Martelo, marreta, cetro  |    5–8 % | boss           |
| Maça + escudo            |      6 % | boss           |
| Chakram                  |      3 % | boss           |
| Maça-estrela + escudo    |      1 % | boss           |
| **Qualquer grupo (2–3)** |    100 % | —              |

Leitura:

- **Diferença de 1 % a 68 %.** Quem ataca de longe ou com alcance (besta,
  arco, lanças, foice) domina; as armas pesadas com escudo morrem no boss.
- **Os grupos ganham sempre**: a dificuldade não sobe com o número de
  jogadores.
- O custo dos poderes não segue nenhuma regra: o _Chop_ do machado faz 22–30
  por 3 de Focus; o _Slash_ da espada faz 13–16 por 2; ataques "a qualquer
  coluna" (à distância) fazem quase tanto como os corpo a corpo, sem nenhum
  custo de posição.

### 1.2 Os poderes são quase todos iguais

Contagem dos efeitos de todos os poderes (armas, skills, inimigos): **59 ×
dano**, 15 × bloqueio, 12 × cura e os estados quase só **bleed, weaken, mark e
stun**. Na prática, quase todos os poderes são "dano X–Y + (às vezes) um
destes quatro". Não há:

- **movimento** (empurrar, puxar, avançar, recuar) — apesar de a formação em
  colunas ser a base do Darkest Dungeon;
- **elementos e fraquezas** (a base do Pokémon);
- **estados com regras próprias** (os que existem são "dano por turno" ou
  "±25 %");
- **combos** entre poderes da mesma arma ou entre heróis.

### 1.3 Poucos poderes por arma

Cada arma tem 2 poderes (o ataque básico e um poder). Com isso não há
escolhas interessantes por turno.

---

## 2. Proposta — quatro pilares

### Pilar 1 — Posições que contam (Darkest Dungeon)

Cada poder diz **de onde se pode usar** e **que posições atinge**
(ex.: _Slash_ usa-se das posições 1–2 e atinge as posições inimigas 1–2).
Poderes de **movimento**: empurrar (o inimigo recua), puxar (o inimigo avança),
avançar/recuar o próprio herói, trocar com um aliado. Cada arma tem um papel
natural:

| Papel              | Armas                                       |
| ------------------ | ------------------------------------------- |
| Frente (tanque)    | espada+escudo, maça/martelo+escudo, machado |
| Meio (alcance)     | lança, lança de cavalaria, foice, montante  |
| Trás (distância)   | arco, besta, funda, chakram                 |
| Trás (magia/apoio) | cajado, varinha, tomo, cetro                |
| Flanco (móvel)     | adagas, machadinhas                         |

Atacar à distância a partir da frente custa mais ou fica fraco; o corpo a
corpo não chega às últimas posições sem alcance. **Resolve o domínio das armas
à distância.**

### Pilar 2 — Tipos de dano e fraquezas (Pokémon)

O dano físico divide-se em **corte, perfuração e impacto**; a magia em
**fogo, gelo, raio, sagrado e sombra**. Cada inimigo tem fraquezas (×1,5) e
resistências (×0,5), **mostradas no ecrã** ao passar o rato:

- esqueletos: fracos a impacto e sagrado, resistentes a perfuração e sombra;
- bestas: fracas a perfuração e fogo;
- cultistas: fracos a corte, resistentes a fogo;
- golems: fracos a raio e impacto, imunes a sangramento.

Assim, uma maça é **a** arma certa numa Rift de mortos-vivos e má noutra.
Compor o grupo e escolher a Rift passa a ser uma decisão.

### Pilar 3 — Estados com regras próprias (Slay the Spire)

Cada estado faz uma coisa **diferente**, não "dano por turno com outro nome":

| Estado           | Regra própria                                                                    |
| ---------------- | -------------------------------------------------------------------------------- |
| Sangramento      | acumula; **dobra se o alvo se mover** (combina com empurrar/puxar)               |
| Queimadura       | apaga o bloqueio do alvo; **passa ao vizinho** no fim do turno                   |
| Veneno           | acumula; **corta as curas** recebidas a metade                                   |
| Gelo → Congelado | 3 cargas de gelo = congelado (perde o turno); **impacto estilhaça** (×2 de dano) |
| Choque           | o próximo golpe que leva **salta para o vizinho**                                |
| Marca            | o próximo golpe é **crítico garantido** e consome a marca                        |
| Vulnerável       | recebe +50 % de dano                                                             |
| Fraco            | faz −25 % de dano                                                                |
| Atordoado        | perde o turno; depois fica 1 ronda **imune** a atordoar                          |
| Guarda           | um aliado **leva os golpes** por outro (tanque protege o mago)                   |
| Contra-ataque    | responde a cada golpe corpo a corpo                                              |
| Provocação       | os inimigos têm de o atacar                                                      |

Com isto aparecem **combos**: o arqueiro marca → o machado executa; o mago
congela → o martelo estilhaça; a lança puxa um inimigo a sangrar → o
sangramento dobra.

### Pilar 4 — Quatro poderes por arma, cada arma com uma identidade

Cada arma passa a ter **4 poderes** (básico + 3), à volta de uma mecânica
própria. Exemplos:

- **Espada:** contra-ataque e postura; o golpe forte acerta mais quando tem
  contra-ataque ativo.
- **Machado:** sangramento; _Executar_ mata instantaneamente abaixo de 25 % de
  vida.
- **Maça/martelo:** impacto, atordoar, **partir armadura** (−armadura
  permanente na luta), estilhaçar congelados.
- **Adagas:** crítico em alvos marcados; ataca e **recua** uma posição.
- **Lança:** alcance ao meio, **puxar** o inimigo de trás para a frente.
- **Arco:** marca, chuva de flechas, tiro à última posição.
- **Besta:** perfura armadura, mas tem de **recarregar** (um turno sim, outro
  não).
- **Cajado:** elementos (fogo/gelo/raio) e combinações entre eles.
- **Tomo:** maldições (vulnerável, veneno, roubar bloqueio).
- **Cetro:** sagrado, curar ao causar dano, proteger com guarda.
- **Foice:** atinge duas posições, cura-se nos alvos a sangrar.

### Cenários únicos (o "divertido")

- **Inimigos com feitios por tema** (os golems refletem gelo, os cultistas
  invocam quando um morre, as bestas atacam quem estiver marcado…).
- **Salas com condições** que mudam a luta: _nevoeiro_ (não se ataca a última
  posição), _água até aos joelhos_ (raio ×2, fogo ×0,5), _escuridão_ (críticos
  ×2 para os dois lados), _altar profano_ (os inimigos curam-se a cada ronda
  até o altar ser partido).

---

## 3. Como garantir o equilíbrio (método)

1. **Orçamento por poder:** uma tabela fixa converte Focus e Mana em "valor"
   (ex.: 1 Focus ≈ 7 de dano num alvo; área ×0,6; alcance a qualquer posição
   ×0,85; estados com valor próprio). Um **teste automático** falha se algum
   poder sair do orçamento — acabam os _Chop_ de 30 por 3 de Focus.
2. **Metas na simulação**, verificadas a cada mudança:
   - a solo, Rift tier 1: **todas as armas entre 45 % e 60 %** de vitórias;
   - em grupo: **~70 %** (os inimigos sobem com o número de jogadores);
   - o boss mata em cerca de 1/3 das derrotas (não é ele que decide tudo).
3. **Escala com o grupo:** mais inimigos/vida por jogador, para o grupo não
   ganhar sempre.

---

## 4. Plano por fases (depois de aprovado)

| Fase | Conteúdo                                                                       |
| ---- | ------------------------------------------------------------------------------ |
| C1   | Orçamento por poder + teste automático; metas no `pnpm sim`; escala de grupo   |
| C2   | Posições: usar-de/atinge, movimento (empurrar, puxar, avançar, recuar, trocar) |
| C3   | Tipos de dano, fraquezas/resistências dos inimigos e a sua UI                  |
| C4   | Estados novos com regras próprias (tabela do pilar 3)                          |
| C5   | 4 poderes por arma (21 armas) e reequilíbrio pela simulação                    |
| C6   | Feitios dos inimigos por tema e salas com condições                            |
| C7   | Ecrã de combate como no print do dono (retratos, intenções, "End turn")        |

## 5. Decisões do dono (2026-11-28, D138)

- **Aprovados:** Pilar 1 (posições e movimento), Pilar 2 (tipos de dano e
  fraquezas), Pilar 3 (estados com regras próprias).
- **Não agora:** Pilar 4 — **ficam 2 poderes por arma** (a variedade vem das
  skills dos livros e dos estados novos); feitios dos inimigos e salas com
  condições ficam para mais tarde.
- **Meta:** Rift tier 1 — **a solo, cada arma entre 45 % e 60 %**; **em grupo
  ~70 %**.
- **Ordem:** começar por **C1 (equilíbrio)**; depois C2 (posições), C3
  (tipos/fraquezas), C4 (estados). C5 passa a "reequilibrar os 2 poderes de
  cada arma com as mecânicas novas"; C6 fica em espera; C7 (ecrã) no fim.
