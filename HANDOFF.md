# HANDOFF — estado do projeto para a próxima sessão

Última atualização: 2026-11-24 (fim da sessão dos pedidos #69–#80).
Ler primeiro `CLAUDE.md` (regras de trabalho), depois este ficheiro.

## Estado atual

- `main` está verde (lint, typecheck, testes, e2e e CI). Último merge: PR #41.
- Fases: 1–2 concluídas; 3 (combate e Rifts) quase completa; 4–9 por fazer
  (ver `ROADMAP.md`).
- Aspeto visual: estilo Darkest Dungeon (pedido #69). Arte do dono a entrar aos
  poucos (herói base, armas, ícones); o resto ainda é desenho provisório em código.

## O que foi feito nesta sessão (detalhes em `docs/REQUESTS.md`)

| Pedido  | Resumo                                                                                                                                                                                   |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #69–#71 | Revamp visual Darkest Dungeon; salas sem bloqueios, ecrãs pequenos, menos flicker; 5 temas de Rift, campeões, fases de boss                                                              |
| #72–#75 | Mochila de 40; herói base com a arte do dono; ícones de armas e equipamento, moldura e fundo por raridade                                                                                |
| #76     | Armas na mão com a arte do dono; brilho/faíscas no PixiJS a partir de +3                                                                                                                 |
| #77     | **Uma pasta por arma**: `packages/game-core/src/content/weapons/<tipo>/` (`weapon.ts`, `_weapon_icon_<tipo>.png`, `_weapon_hand_<tipo>.png`)                                             |
| #78     | **Uma pasta por item de craft**: `content/items/{materials,consumables,tools}/<id>/` (`item.ts`, `_item_icon_<id>.png`); grau do material = raridade                                     |
| #79     | **Ícones das habilidades por pasta**: ataques/poderes em `weapons/<tipo>/_ability_icon_<id>.png`; **uma pasta por skill** em `content/skills/<id>/` (`skill.ts`, `_skill_icon_<id>.png`) |
| #80     | Fundo do ícone dos skills com a cor do nível (`abilityLevels` chega ao combate)                                                                                                          |

## Como funciona a arte (para o dono adicionar imagens)

- O jogo encontra as imagens **pelo nome do ficheiro** (`apps/web/src/features/items/art.ts`,
  `import.meta.glob`). Pôr/substituir o PNG na pasta certa chega.
- Ícones: 100×100, à escala da moldura `content/items/_item_frame.png` e do fundo
  `content/items/_item_tile.png` (o fundo é tingido pela raridade).
- Um teste (`game-core/test/content-folders.test.ts`) falha se um ícone tiver o
  nome de uma habilidade que não existe.
- Folhas originais em `art/source/`; ver `art/README.md`.

## Pendente / próximos passos

1. **Folha de ícones de spells/habilidades** (enviada na conversa do pedido #79,
   mas sem ficheiro): pedir ao dono que a envie como ficheiro; recortar e pôr cada
   ícone na pasta certa. Perguntar se ele escolhe o ícone de cada habilidade ou se
   se propõe por cor (dourado = sagrado, vermelho/laranja = fogo, roxo = arcano,
   azul = gelo, verde = natureza).
2. **Imagens em falta**: materiais e consumíveis (todos), cana de pesca e picareta;
   arma na mão da foice continua a da folha antiga (só veio o ícone novo).
3. **Oferecido, sem resposta**: mover a definição dos poderes/ataques das armas
   (hoje em `content/abilities.ts`) para a pasta de cada arma.
4. **D136 (futuro)**: as armaduras mudam o aspeto do herói; o jogador só escolhe
   cabelo e cara.
5. Kits e monstros com arte do dono: quando chegarem como ficheiros.
6. Confirmar com o dono os valores provisórios recentes (tabela "Decisões em
   aberto" em `docs/REQUESTS.md`): A139 (capacetes/botas por peso), A140 (brilho
   das armas), A141 (grau → raridade), A142 (nível do skill → cor).

## Fluxo de trabalho com o dono

- Fala em português (PT); código, commits e docs técnicos em inglês.
- Para cada pedido: implementar → registar em `docs/REQUESTS.md` → atualizar
  `docs/CHANGE_MAP.md` → `pnpm lint && pnpm typecheck && pnpm test` (+ `pnpm test:e2e`
  se a interface mudou) → commit → PR via `gh api` → esperar CI → merge (squash)
  quando o dono aprova (normalmente aprova).
- Ramo de trabalho: `claude/gifted-mendel-tblm68`. Depois de um merge (squash),
  recomeçar o ramo a partir de `origin/main`; o push forçado é recusado, por isso
  juntar o ramo remoto (`git merge origin/<ramo>`, ficar com a nossa versão) e
  fazer push normal.

## Armadilhas conhecidas

- **Imagens coladas na conversa não ficam como ficheiro**: pedir sempre o ficheiro.
- `prettier --write` em pastas largas mexe em `apps/server/src/modules/characters/bag.ts`,
  `apps/server/src/plugins/security.ts` e alguns testes de game-core: reverter
  com `git checkout` (não fazem parte do trabalho).
- Há um teste do servidor ocasionalmente instável; repetir antes de investigar.
- Infra local: postgres (`/tmp/pgdata`, socket em `/tmp`) e redis podem morrer
  entre comandos; reiniciar antes de `pnpm dev`/e2e.
- Pré-visualizar componentes: criar um `apps/web/src/zz-*.tsx` temporário,
  importá-lo no browser via Vite (`await import('/src/zz-….tsx')`) e tirar
  screenshot com Playwright; apagar no fim.
- `pnpm test:e2e -- --trace off` demora ~6 min.
