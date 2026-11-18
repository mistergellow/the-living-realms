# CLAUDE.md — Memória do projeto The Living Realms

Este ficheiro é lido automaticamente pelo Claude Code no início de cada sessão.
É o ponto de entrada da memória do projeto.

## Regras de trabalho (obrigatórias)

1. **Registar todos os pedidos.** Cada pedido do dono do projeto é registado em
   [`docs/REQUESTS.md`](docs/REQUESTS.md): data, pedido, decisões tomadas e
   ficheiros alterados. Fazer isto **no mesmo trabalho** em que o pedido é
   implementado.
2. **Consultar o mapa de impacto antes de mudar algo.** Antes de alterar
   qualquer conceito (personagem, aparência, posição, mensagem WebSocket,
   tabela, variável de ambiente…), abrir
   [`docs/CHANGE_MAP.md`](docs/CHANGE_MAP.md) e alterar **todos** os ficheiros
   listados para esse conceito, incluindo os testes e a documentação.
3. **Manter o mapa atualizado.** Se uma alteração criar um conceito novo ou
   ligar um ficheiro novo a um conceito existente, atualizar `docs/CHANGE_MAP.md`.
4. **Não tomar decisões de game design sozinho.** Perguntar primeiro. Quando
   houver um valor provisório, registá-lo em `docs/REQUESTS.md` → "Decisões em aberto".
5. **Decisões técnicas** novas vão para [`DECISIONS.md`](DECISIONS.md) (ADR);
   o estado das fases vai para [`ROADMAP.md`](ROADMAP.md).
6. **Verificar antes de dar por concluído:** `pnpm lint`, `pnpm typecheck`,
   `pnpm test` e, se a interface mudou, `pnpm test:e2e`.

## Língua

- Conversa com o dono do projeto: **português (PT)**.
- Tudo o que o jogador vê, o código, os commits e a documentação técnica: **inglês**.
- Estes ficheiros de memória (`CLAUDE.md`, `docs/REQUESTS.md`, `docs/CHANGE_MAP.md`): português.

## Resumo do projeto

Jogo multiplayer persistente para browser. Mapa do mundo em **hexágonos**
(coordenadas axiais q,r; mover entre hexágonos custa X AP, valor por definir).
Um único mundo partilhado. Uma conta tem vários personagens, mas joga com
**um de cada vez**. Combate por turnos ("Slay the Spire sem cartas + Darkest
Dungeon"), num ecrã separado da exploração; formação de **3 colunas (back, mid,
front) × 2 linhas** por lado. Rifts = portais para raids, a solo ou em lobby até 6.
Progressão por reputação (sem níveis). Nações, línguas, economia, NPCs e
eventos virão em fases futuras (ver ROADMAP.md).

## Mapa rápido do código

```
apps/web          React + Vite (features/auth, characters, world; combat reservado)
apps/server       Fastify: API HTTP + gateway WebSocket (modules/*, realtime/*)
apps/worker       Simulação do mundo (tick, eleição de líder, manutenção)
packages/shared   Contratos: schemas zod, DTOs, protocolo WS, códigos de erro
packages/game-core Regras puras (hex, nomes) — sem I/O
packages/db       Schema Drizzle, migrações, cliente, seed
packages/server-kit Infra partilhada servidor/worker (logger, Redis, bus, presença)
```

## Comandos

```
pnpm infra:up && pnpm db:migrate && pnpm dev   # correr localmente
pnpm lint && pnpm typecheck && pnpm test       # verificar
pnpm test:e2e                                  # testes no browser
pnpm db:generate                               # nova migração após mudar schema.ts
```
