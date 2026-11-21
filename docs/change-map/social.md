# Mapa de impacto — Social

Ver regras e ordem de alteração em [`../CHANGE_MAP.md`](../CHANGE_MAP.md).

## Amigos (por personagem)

- Contrato: `packages/shared/src/social.ts` (`CharacterRefDto`, `FriendsDto`, `friendRequestSchema`, `characterScopedSchema`); erro `ALREADY_FRIENDS`
- BD: `friendships` (um registo por par, ids ordenados `character_a < character_b`; `pending`/`accepted`)
- Servidor: `apps/server/src/modules/social/` (`friends.service.ts`, `social.routes.ts` em `/api/social`, `presence-status.ts` = quem está online: no mundo, num lobby aberto ou num Rift)
- Web: `apps/web/src/features/social/` (`api.ts`, `FriendsPage.tsx` em `/friends`); contador de pedidos no link "Friends" de `WorldPage.tsx`
- Testes: `apps/server/test/social.test.ts`, `e2e` ("friends + private lobby")

## Lobbies de Rift (até 6)

- Contrato: `packages/shared/src/social.ts` (`LobbyDto`, `LobbyOverviewDto`, `LOBBY_MAX_MEMBERS`, schemas de criar/convidar/posição/pronto/expulsar); erros `IN_LOBBY`, `LOBBY_FULL`, `NOT_LEADER`, `NOT_READY`
- BD: `rift_lobbies`, `rift_lobby_members` (posição única por lobby), `rift_lobby_invites`
- Servidor: `apps/server/src/modules/rifts/lobbies.service.ts` + `lobbies.routes.ts` (em `/api/rifts/lobbies`, registadas **antes** das rotas `/api/rifts/:riftId` em `app.ts`); `assertFreeForRift` em `rifts.service.ts` (um Rift e um lobby de cada vez)
- Início em grupo: `LobbiesService.start` → `RiftsService.createRun` (bloqueia as personagens por ordem de id)
- Web: `apps/web/src/features/rifts/lobby-api.ts`, `LobbyPage.tsx` (`/rifts/lobbies/:id`), `RiftsPage.tsx` (criar, públicos, convites)
- Atualização: polling (A29) — intervalos em `lobby-api.ts` e `api.ts` (`useRun`)
- Testes: `apps/server/test/lobbies.test.ts`, `e2e`
