# CLAUDE.md — Memória do projeto The Living Realms

Lido automaticamente no início de cada sessão. É o ponto de entrada: daqui
chega-se a tudo **sem ler documentos inteiros**.

## Regras de trabalho (obrigatórias)

1. **Registar cada pedido** em [`docs/REQUESTS.md`](docs/REQUESTS.md) no mesmo
   trabalho em que é implementado (ler só o fim do ficheiro para acrescentar).
   Com mais de ~10 entradas, mover as antigas para `docs/archive/`.
2. **Antes de mudar um conceito**, abrir só o ficheiro da área em
   [`docs/CHANGE_MAP.md`](docs/CHANGE_MAP.md) → `docs/change-map/<área>.md` e
   alterar **todos** os ficheiros listados (incluindo testes e docs).
3. **Manter o mapa atualizado**: ficheiro novo ligado a um conceito → acrescentar
   na área certa; conceito novo → secção nova + linha no índice.
4. **Não tomar decisões de game design sozinho.** Perguntar primeiro. Valores
   provisórios → nova linha **A#** em [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md).
5. **Decisões técnicas** → novo ficheiro em [`docs/adr/`](docs/adr/README.md)
   (+ linha no índice); estado das fases → [`docs/ROADMAP.md`](docs/ROADMAP.md).
6. **Verificar antes de dar por concluído:** `pnpm lint`, `pnpm typecheck`,
   `pnpm test` e, se a interface mudou, `pnpm test:e2e`. Para alterações
   pequenas, correr primeiro só o pacote afetado (`pnpm --filter @realms/<pkg> test`).

## Como navegar sem gastar contexto

- **Procurar antes de ler.** `grep -rn` / Glob para localizar; depois ler só as
  linhas relevantes (offset/limit). Não abrir ficheiros grandes inteiros.
- **Docs são de consulta, não de leitura obrigatória.** Abrir uma secção pelo
  título: `grep -n '^#' docs/ARCHITECTURE.md` e ler só essa parte.
- **Uma decisão = um ficheiro**: ADR em `docs/adr/NNN-*.md`; decisões de design
  por número (`grep -n "D38" docs/GAME_DESIGN.md`).
- **Histórico** (`docs/archive/`) só quando for preciso saber _porquê_.
- Ficheiros de código acima de ~400 linhas: partir por responsabilidade
  (como `features/combat/combat-scene.ts` → `unit-view.ts`, `backdrop.ts`, `scene-kit.ts`).

## Língua

- Conversa com o dono do projeto: **português (PT)**.
- Tudo o que o jogador vê, o código, os commits e a documentação técnica: **inglês**.
- Ficheiros de memória (`CLAUDE.md`, `docs/REQUESTS.md`, `docs/GAME_DESIGN.md`,
  `docs/CHANGE_MAP.md`, `docs/change-map/`, `docs/archive/`): português.

## Resumo do jogo

Multiplayer persistente para browser, um único mundo partilhado em **hexágonos**
(axiais q,r). Uma conta tem vários personagens, joga com **um de cada vez**.
Combate por turnos ("Slay the Spire sem cartas + Darkest Dungeon") num ecrã
próprio; formação **3 colunas (back, mid, front) × 2 linhas** por lado. Rifts =
portais para raids, a solo ou em lobby até 6. Progressão por reputação (sem
níveis). Nações, línguas, economia, NPCs e eventos: fases futuras (ROADMAP).

## Mapa do código (onde está cada coisa)

Fluxo de uma funcionalidade: **contrato** (`packages/shared`) → **regras**
(`packages/game-core`) → **BD** (`packages/db`) → **servidor** (`apps/server`)
→ **web** (`apps/web`) → testes.

| Domínio                      | Contrato (shared)     | Regras (game-core)                                                                          | Servidor                                           | Web (`apps/web/src/features`)                         |
| ---------------------------- | --------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| Conta / sessão               | `api.ts`              | —                                                                                           | `modules/auth/`                                    | `auth/`                                               |
| Personagem, atributos, itens | `api.ts`              | `attributes.ts`, `stats.ts`, `equipment.ts`, `character.ts`, `content/items.ts`             | `modules/characters/` (`sheet.service.ts` = ficha) | `characters/`, `avatar/`                              |
| Combate                      | `combat.ts`           | `combat/engine.ts` (motor), `combat/state.ts`, `content/abilities.ts`, `content/enemies.ts` | `modules/rifts/rifts.service.ts`                   | `combat/` (página, barra de habilidades, cena PixiJS) |
| Rifts e lobbies              | `combat.ts`, `api.ts` | `content/rifts.ts`                                                                          | `modules/rifts/` (`lobbies.service.ts`)            | `rifts/` (lista, lobby, hooks de API)                 |
| Social / amigos              | `social.ts`           | —                                                                                           | `modules/social/`                                  | `social/`                                             |
| Mundo, mapa, tempo real      | `protocol.ts`         | `hex.ts`                                                                                    | `realtime/gateway.ts`, `modules/world/`            | `world/` (`map-scene.ts` = PixiJS)                    |
| Hub e moldura do jogo        | —                     | —                                                                                           | —                                                  | `game/` (`GameShell.tsx`, `HomePage.tsx`)             |

Outros sítios:

- **Erros**: `packages/shared/src/errors.ts` · **Rotas web**: `apps/web/src/app/router.tsx`
- **BD**: `packages/db/src/schema.ts` (+ `pnpm db:generate`) · seed: `packages/db/src/seed.ts`
- **Worker** (tick do mundo, manutenção, líder): `apps/worker/src/` (`jobs/`)
- **Infra partilhada** servidor/worker (logger, Redis, bus, presença): `packages/server-kit/src/`
- **Canvas partilhado** (PixiJS, texturas SVG): `apps/web/src/features/render/`
- **UI partilhada**: `apps/web/src/shared/ui/` · **Estilos**: `apps/web/src/styles/global.css`
  (índice de `@import`, a ordem conta) + `.css` junto de cada feature
- **Cliente HTTP / WebSocket**: `apps/web/src/lib/` · **Config/env**: `apps/server/src/config.ts`, `.env.example`
- **Testes**: `apps/server/test/` (Postgres + Redis reais), `packages/game-core/test/`, `apps/web/test/`, `e2e/`
- **Equilíbrio do combate**: `scripts/simulate-balance.ts` (`pnpm sim`)

## Comandos

```
pnpm infra:up && pnpm db:migrate && pnpm dev   # correr localmente
pnpm lint && pnpm typecheck && pnpm test       # verificar
pnpm test:e2e                                  # testes no browser
pnpm db:generate                               # nova migração após mudar schema.ts
pnpm sim                                       # simular o equilíbrio do combate
```
