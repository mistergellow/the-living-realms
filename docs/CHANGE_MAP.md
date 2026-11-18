# Mapa de impacto (CHANGE_MAP)

Para cada conceito do jogo: **todos os sítios que têm de mudar** quando o
conceito muda. Usar como checklist. Os caminhos são relativos à raiz do
repositório.

Ordem habitual de alteração: **contrato (shared) → regras (game-core) → base de
dados (db + migração) → servidor → worker → web → testes → documentação**.

> Manter atualizado: ao ligar um ficheiro novo a um conceito, acrescentá-lo aqui.
> Verificação rápida: `grep -rn "<nome>" apps packages e2e --include=*.ts --include=*.tsx`

---

## Conta (account)

- Contrato: `packages/shared/src/api.ts` (`emailSchema`, `passwordSchema`, `registerRequestSchema`, `loginRequestSchema`, `AccountDto`, `MeResponse`)
- BD: `packages/db/src/schema.ts` → `accounts` (+ nova migração `pnpm db:generate`)
- Servidor: `apps/server/src/modules/auth/accounts.repository.ts`, `auth.service.ts`, `auth.routes.ts` (`toAccountDto`)
- Web: `apps/web/src/features/auth/api.ts`, `LoginPage.tsx`, `RegisterPage.tsx`, `guards.tsx`
- Testes: `apps/server/test/auth.test.ts`, `apps/server/test/helpers.ts` (`registerUser`), `e2e/foundation.spec.ts`
- Docs: `DATABASE.md` → accounts

## Password / segurança da conta

- Regras: `packages/shared/src/api.ts` (`PASSWORD_MIN`, `PASSWORD_MAX`)
- Hash: `apps/server/src/modules/auth/password.ts`
- Web: `RegisterPage.tsx` (texto de ajuda usa `PASSWORD_MIN`)
- Testes: `auth.test.ts`, `e2e/foundation.spec.ts` (`PASSWORD`)

## Sessão / login

- BD: `schema.ts` → `sessions`
- Servidor: `apps/server/src/modules/auth/session.service.ts` (cookie `lr_session`, TTL, renovação), `plugins/auth.ts` (`request.auth`, `requireAuth`), `auth.routes.ts` (cookie, logout → `session.revoked`)
- Tempo real: `apps/server/src/realtime/gateway.ts` (fecho com 4001 em `session.revoked`), `packages/server-kit/src/bus.ts` (`ControlMessage`)
- Worker: `apps/worker/src/jobs/maintenance.ts` (`purgeExpiredSessions`)
- Config: `SESSION_TTL_DAYS`, `COOKIE_SECURE` → ver "Variável de ambiente"
- Testes: `auth.test.ts`, `realtime.test.ts`, `apps/worker/test/worker.test.ts`

## Personagem (character) — campos, criação, listagem, apagar

- Contrato: `packages/shared/src/api.ts` (`CharacterDto`, `createCharacterRequestSchema`, `CharacterListResponse`, `CharacterSheetDto`)
- Regras: `packages/game-core/src/character.ts` (validação e normalização do nome)
- BD: `schema.ts` → `characters` (índice único `characters_world_name_uq`) + migração
- Servidor: `apps/server/src/modules/characters/characters.repository.ts`, `characters.service.ts` (`toCharacterDto`, limite, eventos), `characters.routes.ts`
- Tempo real: `gateway.ts` → `enterWorld` (constrói `PresencePlayer` a partir do personagem)
- Web: `apps/web/src/features/characters/api.ts`, `CharacterSelectPage.tsx`, `CharacterCreatePage.tsx`, `CharacterSheetPage.tsx` (rota `/characters/:id`), `active-character.ts`
- Testes: `apps/server/test/characters.test.ts`, `helpers.ts` (`createCharacter`), `game-core/test/character.test.ts`, `apps/web/test/world-state.test.ts` (fixture `self`), `e2e/foundation.spec.ts`
- Docs: `DATABASE.md` → characters, `DECISIONS.md` ADR-015

## Atributos (Might, Agility, Precision, Vitality, Arcana, Spirit)

- Contrato: `packages/shared/src/api.ts` (`ATTRIBUTE_KEYS`, `attributesSchema`, `createCharacterRequestSchema.attributes`, `allocateAttributesRequestSchema`, `CharacterSheetDto.attributePoints`)
- Regras: `packages/game-core/src/attributes.ts` (`ATTRIBUTE_RULES`: base 5, 12 pontos, máx. 10; `validateCreationAttributes`, `validateAllocation`, nomes e resumos)
- BD: `characters.attr_might … attr_spirit`, `characters.attribute_points` + migrações 0004–0006
- Servidor: `characters.service.ts` (criação, pontos por gastar), `sheet.service.ts` (`baseAttributesOf`, `allocate`), rota `POST /api/characters/:id/attributes`
- Web: `AttributePicker.tsx` (criação e distribuição posterior), `CharacterCreatePage.tsx`, `CharacterSheetPage.tsx` (`AllocatePanel`)
- Combate: `CombatantView.attributes` → `scalingMultiplier` no motor
- Testes: `game-core/test/character-system.test.ts`, `apps/server/test/character-sheet.test.ts`, `helpers.ts` (`VALID_ATTRIBUTES`), `e2e` (botões "Increase …")
- **Atributo novo/renomeado:** todos os ficheiros acima + `scaling` das habilidades em `content/abilities.ts` + `describeScaling` + migração de dados

## Estatísticas derivadas (HP, Mana, defesa, iniciativa, esquiva, crítico, poderes)

- Fórmulas (provisórias, num só sítio): `packages/game-core/src/stats.ts` (`STAT_RULES`, `computeStats`, `deriveStats`, `reductionFromRating` = curva de armadura/resistência, `scalingMultiplier`)
- Contrato: `DerivedStatsDto` em `packages/shared/src/api.ts`
- Web: `CharacterSheetPage.tsx` (tabela "Combat stats" e números do herói), `CharacterCreatePage.tsx` (pré-visualização)
- Inimigos: `enemyStats()` em `combat/state.ts` (têm de preencher todos os campos de `DerivedStatsDto`)
- Testes: `character-system.test.ts`, `character-sheet.test.ts` (valores de HP/defesa), `e2e` (`stat-hp`)
- Futuro: o motor de combate (M2) usa `computeStats`

## Itens, equipamento e qualidade/durabilidade

- Conteúdo (dados): `packages/game-core/src/content/items.ts` (`ITEMS`, `WeaponType`, `STARTER_WEAPONS`, `STARTER_OFFHANDS`, `STARTER_ARMOR`; `armor`/`magicResist` são ratings)
- Regras: `packages/game-core/src/equipment.ts` (`planEquip`, duas mãos, `isBroken`, `qualityAfterDefeat`, `DEFEAT_QUALITY_LOSS`)
- Contrato: `EQUIP_SLOTS`, `ItemDto`, `equipRequestSchema`, `unequipRequestSchema` (`api.ts`); erro `INVALID_EQUIPMENT` (`errors.ts`)
- BD: tabela `items` (índice único de slot por personagem, CHECK de qualidade); migração de dados `0002_starter_kit_for_existing_characters.sql`
- Servidor: `modules/characters/items.repository.ts`, `sheet.service.ts` (`equip`, `unequip`, `toItemDto`), `characters.routes.ts` (`/:id/equip`, `/:id/unequip`), kit inicial em `characters.service.ts`
- Web: `CharacterSheetPage.tsx` (Equipment, Inventory, `QualityBar`), `api.ts` (`useEquipment`)
- Testes: `character-system.test.ts`, `character-sheet.test.ts`, `e2e`
- **Item novo:** acrescentar em `content/items.ts`; se for arma, ligar as habilidades em `content/abilities.ts` e o desenho em `features/avatar/CharacterAvatar.tsx` (`Weapon`/`Offhand`) + `weapon-art.ts`; se for de kit inicial, rever a migração de dados para personagens antigos; se puder cair de Rifts, `content/rifts.ts` (`loot`)
- **Espaço de equipamento novo:** `EQUIP_SLOTS` (shared), `SLOT_LABELS` (`CharacterSheetPage.tsx`), itens que o usam

## Habilidades (armas, skills aprendidas, universais)

- Conteúdo (dados): `packages/game-core/src/content/abilities.ts` (`ABILITIES` com dano em intervalo, `scaling` por 2 atributos, efeitos `damage`/`heal`/`block`/`status`/`swap`; `STATUS_NAMES`, `STATUS_DESCRIPTIONS`, `describeTargeting`, `describeEffects`, `describeScaling`)
- Regras: `availableAbilities` em `packages/game-core/src/equipment.ts` (arma equipada + aprendidas + universais)
- Contrato: `AbilityDto` (`api.ts`, inclui `effects` e `scaling` em texto)
- BD: `character_skills` (skills aprendidas por drops; as de arma não se guardam)
- Servidor: `sheet.service.ts` (`abilities`)
- Web: `CharacterSheetPage.tsx` (lista), `CharacterCreatePage.tsx` (habilidades de cada arma inicial)
- Testes: `character-system.test.ts`, `character-sheet.test.ts`
- Futuro: execução em combate no motor M2

## Reputação (moeda por personagem)

- BD: `characters.reputation`
- Contrato: `CharacterSheetDto.reputation`
- Servidor: `sheet.service.ts`; (M2) atribuída no fim dos Rifts
- Web: `CharacterSheetPage.tsx` (`data-testid="reputation"`)

## Nome do personagem (regras)

- `packages/game-core/src/character.ts` (`CHARACTER_NAME_MIN/MAX`, `NAME_PATTERN`)
- `apps/web/src/features/characters/CharacterCreatePage.tsx` (texto de ajuda)
- Unicidade: `schema.ts` (`lower(name)`), erro `CHARACTER_NAME_TAKEN` em `characters.service.ts`
- Testes: `game-core/test/character.test.ts`, `characters.test.ts`, `e2e/foundation.spec.ts` (`randomName`, só letras)

## Limite de personagens por conta

- `apps/server/src/config.ts` (`MAX_CHARACTERS_PER_ACCOUNT`), `.env.example`, `.env`
- `characters.service.ts` (verificação com bloqueio da linha da conta)
- `apps/server/test/helpers.ts` (usa 3 nos testes), `characters.test.ts`
- Web: `CharacterSelectPage.tsx` (mostra `x / limite`)

## Aparência do personagem (corpo base editável) e arte

- Contrato: `packages/shared/src/api.ts` (`appearanceV1Schema` antigo, `appearanceV2Schema`, `BODY_TYPES`, `SKIN_TONES`, `HAIR_STYLES`, `HAIR_COLORS`, `EYE_COLORS`, `APPEARANCE_COLORS` = roupa, `DEFAULT_APPEARANCE`, `normalizeAppearance`)
- BD: `characters.appearance` (JSONB com `version`); ao mudar a forma, **criar nova versão** e manter `normalizeAppearance` a converter as antigas
- Arte (SVG em camadas, provisória): `apps/web/src/features/avatar/CharacterAvatar.tsx` (camadas: cabelo de trás, pernas, tronco, braços, arma, cabeça, olhos, cabelo da frente), `avatar.css` (animações idle), `weapon-art.ts` (arma desenhada por tipo de arma)
- Inimigos: `apps/web/src/features/avatar/EnemyAvatar.tsx` (um desenho por `enemyDefId`) — **inimigo novo precisa de arte aqui**
- Usos: `CharacterToken.tsx` (retrato), `AppearanceEditor.tsx` + `CharacterCreatePage.tsx` (editor), `CharacterSheetPage.tsx` (herói), `HexMap.tsx` (mapa), `rifts/CombatPage.tsx` (combate)
- Presença: `PresencePlayer.appearance` (`protocol.ts`)
- Testes: `helpers.ts` (v1, compatibilidade), `server-kit/test/presence.test.ts`, `web/test/world-state.test.ts`, `e2e` (botões "Hair style …")
- Futuro (D32): camadas de equipamento por cima do corpo base, no mesmo `CharacterAvatar`

## Posição no mapa / hexágonos

- Regras: `packages/game-core/src/hex.ts` (axial q,r, distância, vizinhos, píxeis)
- Contrato: `HexCoord` em `packages/shared/src/api.ts`; `position` em `CharacterDto` e `PresencePlayer`
- BD: `characters.hex_q/hex_r`, `worlds.spawn_q/spawn_r`
- Servidor: `characters.service.ts` (spawn, `toCharacterDto`), `gateway.ts` (presença)
- Web: `HexMap.tsx` (desenho, `SIZE`, `RADIUS`), `WorldPage.tsx` (seleção, distância)
- Testes: `game-core/test/hex.test.ts`, `characters.test.ts` (posição inicial)
- Futuro (AP, terreno): `ARCHITECTURE.md` §8, `DATABASE.md` → map_hexes

## Mundo (world) e relógio (tick)

- BD: `schema.ts` → `worlds`; `packages/db/src/seed.ts` (`ensureWorld`, nome)
- Contrato: `WorldDto` (`api.ts`), mensagem `world.tick` (`protocol.ts`)
- Servidor: `modules/world/world.routes.ts` (`toWorldDto`, `loadWorld`), `app.ts` (`ensureWorld` no arranque)
- Worker: `apps/worker/src/jobs/advance-tick.ts`, `world-loop.ts` (`MAINTENANCE_EVERY`), `config.ts` (`WORLD_TICK_MS`)
- Web: `features/world/world-state.ts` (`tick`), `WorldPage.tsx`
- Config: `WORLD_SLUG`, `WORLD_TICK_MS`

## Mensagem WebSocket (adicionar ou alterar)

1. `packages/shared/src/protocol.ts`: cliente→servidor em `clientMessageSchema`; servidor→cliente em `ServerMessage`
2. Servidor: `apps/server/src/realtime/gateway.ts` (`onMessage` → `switch`)
3. Se for difundida a vários jogadores: `publishToWorld` (`packages/server-kit/src/bus.ts`)
4. Web: `apps/web/src/features/world/world-state.ts` (`applyServerMessage`; o `switch` tem de cobrir todos os tipos — o TypeScript avisa se faltar algum)
5. Testes: `apps/server/test/realtime.test.ts`, `apps/web/test/world-state.test.ts`
6. Docs: `ARCHITECTURE.md` §5 (tabela do protocolo); se for incompatível, subir `PROTOCOL_VERSION`

## Códigos de fecho WebSocket

- `packages/shared/src/protocol.ts` (`WsCloseCode`)
- `gateway.ts` (quem fecha), `apps/web/src/lib/realtime.ts` (como o cliente reage), `WorldPage.tsx` (mensagens ao jogador)
- Testes: `realtime.test.ts`; Docs: `ARCHITECTURE.md` §5

## Presença (quem está online)

- `packages/server-kit/src/presence.ts` (formato, `PRESENCE_STALE_MS`, `PRESENCE_REFRESH_MS`)
- `apps/server/src/realtime/gateway.ts`, `connection.ts`
- `apps/worker/src/jobs/maintenance.ts` (`sweepPresence`)
- Web: `world-state.ts` (`players`), `WorldPage.tsx` (lista)
- Testes: `server-kit/test/presence.test.ts`, `realtime.test.ts`

## "Um personagem ativo por conta"

- `gateway.ts` (`enterWorld` → `account.replace`; `onControl`), `server-kit/src/bus.ts`
- Web: `lib/realtime.ts` (não volta a ligar com 4002), `WorldPage.tsx` (painel "Playing elsewhere")
- Testes: `realtime.test.ts`, `e2e/foundation.spec.ts`

## Código de erro (adicionar)

- `packages/shared/src/errors.ts` (`ErrorCode`)
- Onde é lançado (`new AppError(...)` no serviço)
- Web: tratar em `apps/web/src/lib/api.ts` / no ecrã, se precisar de comportamento próprio
- Testes do módulo

## Evento do mundo (world_events) — novo tipo

- Escrever na **mesma transação** da alteração (ver `characters.service.ts`)
- Documentar o tipo em `DATABASE.md` → world_events
- Teste que verifica o evento (ex.: `characters.test.ts`)

## Tabela ou coluna nova na base de dados

1. `packages/db/src/schema.ts`
2. `pnpm db:generate` → rever o SQL em `packages/db/migrations/` → `pnpm db:migrate`
3. Repositório e serviço do módulo; DTO em `packages/shared/src/api.ts` se for exposta
4. `apps/server/test/helpers.ts` → `resetState` (TRUNCATE) e `apps/worker/test/worker.test.ts` (TRUNCATE)
5. `DATABASE.md`

## Variável de ambiente

- Validação: `apps/server/src/config.ts` e/ou `apps/worker/src/config.ts`
- `.env.example` (com comentário) e o `.env` local
- `infra/docker-compose.prod.yml`, `.github/workflows/ci.yml`, `playwright.config.ts` (se for relevante nesses ambientes)
- `apps/server/test/helpers.ts` (valores de teste)
- **Railway (produção):** as variáveis vivem no painel do Railway, não no código. Atualizar a lista em `docs/DEPLOY_RAILWAY.md` e avisar o dono para a acrescentar no serviço certo (`server` e/ou `worker`)

## Ecrã / rota nova no frontend

- `apps/web/src/app/router.tsx` (+ comentário com o mapa de rotas)
- Pasta `apps/web/src/features/<feature>/`
- Estilos: `apps/web/src/styles/global.css` (tokens em `tokens.css`)
- e2e em `e2e/`; Docs: `ARCHITECTURE.md` §9

## Módulo de servidor novo (ex.: combat, economy)

- `apps/server/src/modules/<domínio>/{routes,service,repository}.ts`
- Registar em `apps/server/src/app.ts`
- Contratos em `packages/shared`, regras em `packages/game-core`
- Testes em `apps/server/test/<domínio>.test.ts`; `ROADMAP.md`, `DECISIONS.md` se houver decisão

## Formação / posições (3 colunas × 2 linhas, D38)

- Fonte única: `columnOfSlot`, `lineOfSlot`, `COMBAT_COLUMNS` em `packages/shared/src/combat.ts` (0–1 front, 2–3 mid, 4–5 back)
- Alcance das habilidades: `reach` (`first`/`any`/colunas) e `area` (`single`/`column`/`all`) em `content/abilities.ts`; `validTargets`/`resolveTargets`/`intentTargets` no motor
- Posições dos inimigos: `content/rifts.ts`; posições iniciais dos jogadores: `startingSlot` (`rifts.service.ts`) e `preferredSlot` (`lobbies.service.ts`)
- Ecrãs: `Formation` em `CombatPage.tsx` + `combat.css` (bloco "D38"), `COLUMNS` em `LobbyPage.tsx`
- Testes: `game-core/test/combat.test.ts` ("targeting by columns"), `lobbies.test.ts`, `rifts.test.ts` (posições iniciais)
- Simulação de equilíbrio: posições do grupo no script

## Combate (motor)

- Regras e números: `packages/game-core/src/combat/state.ts` (`COMBAT_RULES`: Focus por turno/máximo, crítico, 60 s, reviver com 1 HP)
- Motor: `packages/game-core/src/combat/engine.ts` (`createEncounter`, `applyAction`, `validTargets`, IA dos inimigos, `enterNextRoom`, `timeoutTurn`), `rng.ts` (aleatoriedade determinística)
- Contrato: `packages/shared/src/combat.ts` (`CombatView`, `CombatantView`, `CombatLogEntry`, `combatActionSchema`)
- Ecrã: `apps/web/src/features/rifts/CombatPage.tsx`, `combat.css`, `useCombatFx.ts` (animações a partir do log), `combat-text.ts` (texto do log)
- Testes: `game-core/test/combat.test.ts`, `apps/server/test/rifts.test.ts`, `e2e` ("Rift combat")
- **Entrada nova no log:** `CombatLogEntry` (shared) → engine → `combat-text.ts` → `useCombatFx.ts` (se tiver animação)
- **Ação nova:** `combatActionSchema` → `applyAction` (engine) ou `rifts.service.ts` (se for de corrida) → `CombatPage.tsx`
- Equilíbrio: correr a simulação depois de mudar números (metas em `docs/REQUESTS.md` A23; o script de simulação deve ser recriado/guardado em `scripts/` se for preciso com frequência)

## Estados, Block e intenções (Slay the Spire + Darkest Dungeon)

- Contrato: `STATUS_IDS`, `StatusView`, `IntentView`, `CombatantView.block/statuses/intents`, entradas de log `block`/`status`/`tick`/`stunned` (`shared/src/combat.ts`)
- Motor: `combat/engine.ts` (`beginTurn`: Block expira, dano contínuo, contagem; `applyEffect`; `planEnemyIntents` no início da ronda; `runEnemyPhase` executa as intenções), `COMBAT_RULES.markMultiplier/weakenMultiplier`
- Web: `CombatPage.tsx` (`IntentChips`, `StatusChips`), `combat.css`, `useCombatFx.ts`, `combat-text.ts`
- Testes: `game-core/test/combat.test.ts` ("Combat 2.0", "enemy intents"), `e2e`
- **Estado novo:** `STATUS_IDS` (shared) → efeito no motor → nome/descrição em `content/abilities.ts` → cor em `combat.css` → texto/animação

## Inimigos

- Conteúdo: `packages/game-core/src/content/enemies.ts` + habilidades em `content/abilities.ts` (`source: 'enemy'`)
- Arte: `apps/web/src/features/avatar/EnemyAvatar.tsx`
- Uso em Rifts: `content/rifts.ts`

## Rifts e corridas (runs)

- Conteúdo: `packages/game-core/src/content/rifts.ts` (salas, posições dos inimigos, recompensas, loot)
- BD: `rift_runs` (estado do combate em JSONB, `version`, `turn_deadline`), `rift_run_participants` (resultado por personagem)
- Servidor: `apps/server/src/modules/rifts/` (`rifts.service.ts`: começar, agir, avançar, abandonar, temporizador, recompensas/penalização; `rifts.routes.ts`; `rifts.repository.ts`)
- Bloqueios durante um Rift: `assertNotInRift` em `characters/sheet.service.ts` (equipar/desequipar) e `characters.service.ts` (apagar); erro `IN_RIFT`
- Recompensas/penalização: `finish()` em `rifts.service.ts`; durabilidade em `game-core/equipment.ts` (`qualityAfterDefeat`)
- Eventos do mundo: `rift.entered`, `rift.completed`, `rift.failed`
- Web: `apps/web/src/features/rifts/` (`RiftsPage.tsx`, `CombatPage.tsx`, `api.ts`); link "Rifts" em `WorldPage.tsx`; rotas em `router.tsx`
- Testes: `apps/server/test/rifts.test.ts` (TRUNCATE em `helpers.ts` e `worker.test.ts` — **tabela nova = acrescentar lá**), `e2e`
- Futuro: lobby (M3), entrada pelo mapa (Fase 4)

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

## Combate em grupo

- Sair a meio: `leaveParty` (motor) + `penalise(…, left=true)` e `rift_run_participants.left_at` (servidor); `activeRunIdFor` ignora quem saiu; entrada de log `left`
- Recompensas/penalização no fim ignoram quem saiu (`finish`)
- Web: texto "Waiting for X…" e confirmação de saída em `CombatPage.tsx`; polling em `useRun`
- Testes: `game-core/test/combat.test.ts` ("group runs"), `apps/server/test/lobbies.test.ts` ("group combat"), `e2e`

## Deploy / produção (Railway)

- Imagem: `infra/Dockerfile` (um passo novo de build ou um ficheiro novo no runtime têm de ser acrescentados aqui)
- Configuração por serviço: `railway.json` (raiz; serviço `server`), `infra/railway/worker.json` (serviço `worker`) (comando de arranque, migrações antes do deploy, health check, `watchPatterns`)
- Pasta nova em `apps/` ou `packages/`: acrescentar aos `watchPatterns` de `railway.json` e `infra/railway/worker.json` e um `COPY …/package.json` no Dockerfile
- Guia do dono: `docs/DEPLOY_RAILWAY.md`; arquitetura: `ARCHITECTURE.md` → Deployment; decisão: ADR-018
- Migrações no arranque: `packages/db/src/client.ts` (`migrateWithLock`), `apps/server/src/main.ts`, `apps/worker/src/main.ts`, variável `MIGRATE_ON_START` (ADR-019)
- Ligação ao Redis: `packages/server-kit/src/redis.ts` (`family: 0`, necessário para IPv6)
