# Mapa de impacto — Combate e Rifts

Ver regras e ordem de alteração em [`../CHANGE_MAP.md`](../CHANGE_MAP.md).

## Formação / posições (3 colunas × 2 linhas, D38)

- Fonte única: `columnOfSlot`, `lineOfSlot`, `COMBAT_COLUMNS` em `packages/shared/src/combat.ts` (0–1 front, 2–3 mid, 4–5 back)
- Alcance das habilidades: `reach` (`first`/`any`/colunas) e `area` (`single`/`column`/`all`) em `content/abilities.ts`; `validTargets`/`resolveTargets`/`targetColumns`/`intentTargets` no motor
- **Ataques escolhem a coluna (D41):** ação com `targetColumn` (`combatActionSchema`); só o apoio a aliados usa `targetId`; ecrã: `targetAction` + destaque da coluna (`col-mode` em `combat.css`)
- IA por formação (D42): `bestMove`/`expectedValue`/`planEnemyIntents` no motor (Block vale mais com a coluna partilhada); intenções com `column` (`IntentView`)
- Posições dos inimigos: `content/rifts.ts`; posições iniciais dos jogadores: `startingSlot` (`rifts.service.ts`) e `preferredSlot` (`lobbies.service.ts`)
- Ecrãs: `Formation` em `CombatPage.tsx` + `combat.css` (bloco "D38"), `COLUMNS` em `LobbyPage.tsx`
- Testes: `game-core/test/combat.test.ts` ("targeting by columns"), `lobbies.test.ts`, `rifts.test.ts` (posições iniciais)
- Simulação de equilíbrio: posições do grupo no script

## Combate (motor)

- Regras e números: `packages/game-core/src/combat/state.ts` (`COMBAT_RULES`: Focus por turno/máximo, crítico, 60 s, reviver com 1 HP)
- Motor: `packages/game-core/src/combat/engine.ts` (`createEncounter`, `applyAction`, `validTargets`, IA dos inimigos, `enterNextRoom`, `timeoutTurn`), `rng.ts` (aleatoriedade determinística)
- Contrato: `packages/shared/src/combat.ts` (`CombatView`, `CombatantView`, `CombatLogEntry`, `combatActionSchema`)
- Ecrã: `apps/web/src/features/combat/CombatPage.tsx` (controlos, `useReplayState`: registo/controlos/resultados esperam pela animação), `CombatStage.tsx` (canvas + botões DOM por cima), `combat-scene.ts` (desenho e animações em PixiJS, `stepMs`), `combat-timeline.ts` (log → passos de animação), `combat-layout.ts` (posição de cada slot no ecrã), `combat.css`, `combat-text.ts` (texto do log)
- Testes: `game-core/test/combat.test.ts`, `apps/server/test/rifts.test.ts`, `apps/web/test/combat-render.test.ts`, `e2e` ("Rift combat")
- **Entrada nova no log:** `CombatLogEntry` (shared) → engine → `combat-text.ts` → `combat-timeline.ts` (`FxEvent`, `buildTimeline`, `applyStep`) → `combat-scene.ts` (`applyEvents`) se tiver animação
- **Ação nova:** `combatActionSchema` → `applyAction` (engine) ou `rifts.service.ts` (se for de corrida) → `CombatPage.tsx`
- **Posições da formação (D38, 3 colunas × 2 linhas) mudarem:** `combat-layout.ts` (`place`) e o teste `combat-render.test.ts`
- Equilíbrio: `pnpm sim` (`scripts/simulate-balance.ts`) depois de mudar números; metas em `docs/REQUESTS.md` (A23)

## Estados, Block e intenções (Slay the Spire + Darkest Dungeon)

- Contrato: `STATUS_IDS`, `StatusView`, `IntentView`, `CombatantView.block/statuses/intents`, entradas de log `block`/`status`/`tick`/`stunned` (`shared/src/combat.ts`)
- Motor: `combat/engine.ts` (`beginTurn`: Block expira, dano contínuo, contagem; `applyEffect`; `planEnemyIntents` no início da ronda; `runEnemyPhase` executa as intenções), `COMBAT_RULES.markMultiplier/weakenMultiplier`
- Web: `combat/UnitChips.tsx` (`IntentChips`, `StatusChips`, colocados por cima do canvas em `CombatStage.tsx`), `combat.css` (cores dos chips), `combat-timeline.ts` + `combat-scene.ts` (animação de Block/estado/tick/atordoado; cores `STATUS_COLORS`), `combat-text.ts`
- Testes: `game-core/test/combat.test.ts` ("Combat 2.0", "enemy intents"), `e2e`
- **Estado novo:** `STATUS_IDS` (shared) → efeito no motor → nome/descrição em `content/abilities.ts` → cor em `combat.css` e `STATUS_COLORS` (`combat-scene.ts`) → texto/animação

## Inimigos

- Conteúdo: `packages/game-core/src/content/enemies.ts` + habilidades em `content/abilities.ts` (`source: 'enemy'`)
- Arte: `apps/web/src/features/avatar/EnemyAvatar.tsx` (usada no canvas via `enemyTexture` em `render/avatar-textures.tsx`)
- Tipo de animação (corpo a corpo / projétil / magia / cura) vem da habilidade: `abilityFxKind` em `combat/combat-timeline.ts`
- Uso em Rifts: `content/rifts.ts`

## Rifts e corridas (runs)

- Conteúdo: `packages/game-core/src/content/rifts.ts` (salas, posições dos inimigos, recompensas, loot)
- BD: `rift_runs` (estado do combate em JSONB, `version`, `turn_deadline`), `rift_run_participants` (resultado por personagem)
- Servidor: `apps/server/src/modules/rifts/` (`rifts.service.ts`: começar, agir, avançar, abandonar, temporizador, recompensas/penalização; `rifts.routes.ts`; `rifts.repository.ts`)
- Bloqueios durante um Rift: `assertNotInRift` em `characters/sheet.service.ts` (equipar/desequipar) e `characters.service.ts` (apagar); erro `IN_RIFT`
- Recompensas/penalização: `finish()` em `rifts.service.ts`; durabilidade em `game-core/equipment.ts` (`qualityAfterDefeat`)
- Eventos do mundo: `rift.entered`, `rift.completed`, `rift.failed`
- Web: `apps/web/src/features/rifts/` (`RiftsPage.tsx`, `api.ts`, `rifts.css`), ecrã de combate em `apps/web/src/features/combat/CombatPage.tsx`; link "Rifts" em `WorldPage.tsx`; rotas em `router.tsx`
- Testes: `apps/server/test/rifts.test.ts` (TRUNCATE em `helpers.ts` e `worker.test.ts` — **tabela nova = acrescentar lá**), `e2e`
- Futuro: lobby (M3), entrada pelo mapa (Fase 4)

## Combate em grupo

- Sair a meio: `leaveParty` (motor) + `penalise(…, left=true)` e `rift_run_participants.left_at` (servidor); `activeRunIdFor` ignora quem saiu; entrada de log `left`
- Recompensas/penalização no fim ignoram quem saiu (`finish`)
- Web: texto "Waiting for X…" e confirmação de saída em `CombatPage.tsx`; polling em `useRun`
- Testes: `game-core/test/combat.test.ts` ("group runs"), `apps/server/test/lobbies.test.ts` ("group combat"), `e2e`

## Barra de habilidades (combate)

- `apps/web/src/features/combat/AbilityBar.tsx` (slots, teclas 1–9, Esc, tooltip), `AbilityIcon.tsx` (ícones placeholder: `GLYPH_BY_ABILITY` e cor por tipo `abilitySchool`), estilos no fim de `combat.css`
- **Habilidade nova:** acrescentar o ícone em `GLYPH_BY_ABILITY` (senão usa o ícone do tipo); o texto da tooltip vem de `describeEffects`/`describeTargeting`/`describeScaling` (`game-core/content/abilities.ts`)
- Usada em `CombatPage.tsx`; e2e procura os botões pelo nome ("Slash", "Raise Shield")
