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

- Contrato: `packages/shared/src/api.ts` (`emailSchema`, `passwordSchema`, `registerRequestSchema`, `loginRequestSchema`, `AccountDto` com `isAdmin`, `MeResponse`)
- BD: `packages/db/src/schema.ts` → `accounts` (+ nova migração `pnpm db:generate`)
- Servidor: `apps/server/src/modules/auth/accounts.repository.ts`, `auth.service.ts`, `auth.routes.ts` (`toAccountDto`, `isAdmin` a partir de `ADMIN_EMAILS`)
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
- Web: `apps/web/src/features/characters/api.ts`, `CharacterSelectPage.tsx`, `CharacterCreatePage.tsx`, `CharacterSheetPage.tsx` (rota `/characters/:id`), `active-character.ts`, `PlayEntry.tsx` (rota `/`: entra com o último jogado, `lastPlayed`)
- Testes: `apps/server/test/characters.test.ts`, `helpers.ts` (`createCharacter`), `game-core/test/character.test.ts`, `apps/web/test/world-state.test.ts` (fixture `self`), `e2e/foundation.spec.ts`
- Docs: `DATABASE.md` → characters, `DECISIONS.md` ADR-015

## Atributos (Might, Agility, Precision, Endurance, Intellect, Will)

- Contrato: `packages/shared/src/api.ts` (`ATTRIBUTE_KEYS`, `attributesSchema`, `createCharacterRequestSchema.attributes`, `allocateAttributesRequestSchema`, `CharacterSheetDto.attributePoints`)
- Regras: `packages/game-core/src/attributes.ts` (`ATTRIBUTE_RULES`: base 5, 12 pontos, máx. 10; `validateCreationAttributes`, `validateAllocation`, nomes e resumos)
- BD: `characters.attr_might … attr_will`, `characters.attribute_points` + migrações 0004–0006 e 0008 (rename Vitality/Arcana/Spirit → Endurance/Intellect/Will)
- Servidor: `characters.service.ts` (criação, pontos por gastar), `sheet.service.ts` (`baseAttributesOf`, `allocate`), rota `POST /api/characters/:id/attributes`
- Web: `AttributePicker.tsx` (criação e distribuição posterior), `CharacterCreatePage.tsx`, `CharacterSheetPage.tsx` (`AllocatePanel`)
- Combate: `CombatantView.attributes` (totais) → `scalingMultiplier` no motor; Precision → Focus por ronda (`focusPerRound`), Agility → iniciativa
- **Base stats (exploração):** `baseAttributesOf` (`sheet.service.ts`) → `BaseAttributes` (`game-core/src/rift/tests.ts`); ver "Regra dos BASE STATS"
- Simulador: `scripts/simulate-balance.ts` (`BUILDS`)
- Testes: `game-core/test/character-system.test.ts`, `apps/server/test/character-sheet.test.ts`, `helpers.ts` (`VALID_ATTRIBUTES`), `e2e` (botões "Increase …")
- **Atributo novo/renomeado:** todos os ficheiros acima + `scaling` das habilidades em `content/abilities.ts` + `describeScaling` + migração de dados

## Estatísticas derivadas (HP, Mana, defesa, iniciativa, esquiva, crítico, poderes)

- Fórmulas (provisórias, num só sítio): `packages/game-core/src/stats.ts` (`STAT_RULES`, `FOCUS_RULES`/`focusPerRound`, `computeStats`, `deriveStats`, `reductionFromRating` = curva de armadura/resistência, `scalingMultiplier`)
- Contrato: `DerivedStatsDto` em `packages/shared/src/api.ts`
- Web: `CharacterSheetPage.tsx` (tabela "Combat stats" e números do herói), `CharacterCreatePage.tsx` (pré-visualização)
- Inimigos: `enemyStats()` em `combat/state.ts` (têm de preencher todos os campos de `DerivedStatsDto`, incluindo `focusPerRound`)
- Testes: `character-system.test.ts`, `character-sheet.test.ts` (valores de HP/defesa), `e2e` (`stat-hp`)
- Futuro: o motor de combate (M2) usa `computeStats`

## Itens, equipamento e qualidade/durabilidade

- Conteúdo (dados): `packages/game-core/src/content/items.ts` (`ITEMS`, `STARTER_WEAPONS`, `STARTER_OFFHANDS`, `STARTER_ARMOR`; `armor`/`magicResist` são ratings); armas → ver "Armas (catálogo)"
- Regras: `packages/game-core/src/equipment.ts` (`planEquip`, duas mãos, `isBroken`, `qualityAfterDefeat`, `DEFEAT_QUALITY_LOSS`)
- Contrato: `EQUIP_SLOTS`, `ItemDto`, `equipRequestSchema`, `unequipRequestSchema` (`api.ts`); erro `INVALID_EQUIPMENT` (`errors.ts`)
- BD: tabela `items` (índice único de slot por personagem, CHECK de qualidade, `upgrade_level`/`specials`/`rune_slots`); migrações de dados `0002_starter_kit_for_existing_characters.sql`, `0011_equipment_slots_and_loadout.sql` (espaços novos)
- Servidor: `modules/characters/items.repository.ts`, `sheet.service.ts` (`equip`, `unequip`, `toItemDto`), `characters.routes.ts` (`/:id/equip`, `/:id/unequip`), kit inicial em `characters.service.ts`
- Web: `CharacterSheetPage.tsx` (tabs), `characters/sheet/EquipmentTab.tsx` (boneco, mochila, drag and drop, stats), `sheet/ItemTooltip.tsx` (tooltip do item), `sheet/ItemIcon.tsx` (ícone por tipo de item: `BY_DEF`, `BY_WEAPON`, `SLOT_GLYPH`), `sheet/slots.ts` (`SLOT_LABELS`, `LEFT_SLOTS`/`RIGHT_SLOTS`), `sheet/drag.tsx` (drag and drop por ponteiro, `Tooltip`), `sheet/sheet.css`; `api.ts` (`useEquipment`)
- Testes: `character-system.test.ts`, `character-sheet.test.ts`, `e2e`
- Itens feitos pelo admin: ver "Admin e conteúdo personalizado" (`getItemDef` procura primeiro em `ITEMS`, depois no registo)
- **Item novo:** acrescentar em `content/items.ts`; se for arma, o tipo tem de existir em `content/weapons.ts` (a 1.ª habilidade é o ataque básico do tipo) e o desenho em `features/avatar/CharacterAvatar.tsx` (`Weapon`/`Offhand`) + `weapon-art.ts` (`MAIN`, `artFromAbilities`); se for de kit inicial, rever a migração de dados para personagens antigos e `startingSlot`/`BUILDS` do simulador; se puder cair de Rifts, `content/rifts.ts` (`rewards.loot`, `lootRoom`, `secretRoom`)
- **Espaço de equipamento novo:** `EQUIP_SLOTS` (shared), `SLOT_LABELS`/`LEFT_SLOTS`/`RIGHT_SLOTS` (`sheet/slots.ts`), `SLOT_GLYPH` (`sheet/ItemIcon.tsx`), itens que o usam (`content/items.ts`), migração de dados para itens equipados no espaço antigo, testes (`character-system.test.ts`, `character-sheet.test.ts`)
- **Item novo:** também o ícone em `sheet/ItemIcon.tsx` (`BY_DEF`) se o ícone do tipo não servir

## Habilidades (armas, skills aprendidas, universais)

- Conteúdo (dados): `packages/game-core/src/content/abilities.ts` (`ABILITIES` com dano em intervalo, `scaling` por 2 atributos, efeitos `damage`/`heal`/`block`/`status`/`swap`; `STATUS_NAMES`, `STATUS_DESCRIPTIONS`, `describeTargeting`, `describeEffects`, `describeScaling`)
- Regras: `availableAbilities` em `packages/game-core/src/equipment.ts` (arma equipada + skills **preparadas** + universais, D69), `planLoadout` (8 espaços, só skills aprendidas, sem repetidas)
- Habilidades feitas pelo admin: ver "Admin e conteúdo personalizado" (`getAbility` procura primeiro em `ABILITIES`, depois no registo); **campo novo em `AbilityDef`/`AbilityEffect`** → acrescentar também a `customAbilityInputSchema` (`shared/src/admin.ts`), `toCustomAbilityDef` e ao formulário `AbilityEditor.tsx`
- Contrato: `AbilityDto` (`api.ts`, inclui `effects` e `scaling` em texto), `MAX_PREPARED_SKILLS`, `CharacterSheetDto.learnedSkills`/`loadout`, `loadoutRequestSchema`
- BD: `character_skills` (skills aprendidas por livros; `loadout_slot` 0–7 = preparada; as de arma não se guardam)
- Servidor: `sheet.service.ts` (`abilities`, `learnedSkills`, `loadout`, `setLoadout`, `combatProfile` usa só as preparadas), `items.repository.ts` (`learnedSkills`, `setLoadout`), `characters.routes.ts` (`PUT /:id/loadout`)
- Web: `characters/sheet/AbilitiesTab.tsx` (8 espaços, biblioteca, "Always available"), `api.ts` (`useLoadout`), `CharacterCreatePage.tsx` (habilidades de cada arma inicial); ícones em `rifts/AbilityIcon.tsx` (estilos `.ability-icon`/`.school-*` em `styles/global.css`)
- **Número de skills preparadas:** `MAX_PREPARED_SKILLS` (shared) + CHECK `character_skills_loadout_range` (schema + migração)
- Testes: `character-system.test.ts`, `character-sheet.test.ts` (loadout), `e2e` (tab Abilities)
- Futuro: execução em combate no motor M2

## Ficha do personagem (tabs, pedido #39)

- `apps/web/src/features/characters/CharacterSheetPage.tsx` (`TABS`, `?tab=`), `sheet/EquipmentTab.tsx`, `sheet/AbilitiesTab.tsx`, `professions/ProfessionsPage.tsx` (`ProfessionsPanel`, também usado na tab Professions), `sheet/sheet.css`
- Testes: `e2e/foundation.spec.ts` (character system: tabs, drag and drop, tooltip)

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
- Web: `CharacterSelectPage.tsx` (mostra `x / limite` e o espaço bloqueado `locked-slot`)
- Produção: variável no Railway (se estiver definida)
- Docs: `DATABASE.md`, `DECISIONS.md` ADR-015, D73

## Entrada no jogo / troca de personagem

- Rota `/` → `PlayEntry.tsx` (ativo do separador ou `lastPlayed`; sem personagens → `/characters/new`)
- Redirecionamentos para `/`: `guards.tsx` (`GuestOnly`), `LoginPage.tsx`, `GameShell.tsx` e páginas do jogo sem personagem (`RiftsPage`, `RunPage`, `LobbyPage`, `FriendsPage`, `ProfessionsPage`)
- Troca de personagem: só o botão "Switch character" do `TopBar` (`GameShell.tsx`) → `/characters`
- `lastPlayedAt` é marcado em `gateway.ts` → `enterWorld` (`markPlayed`)
- Testes: `e2e/foundation.spec.ts` (login volta a `/home`, botão de troca)

## Locais (o hex onde estás: cidade, campo, …)

- Conteúdo/regras: `packages/game-core/src/content/locations.ts` (`locationAt`, `namedLocations`, ações `npcs`/`shop`/`rifts`/`workshop`/`map`, `available`)
- Web: `apps/web/src/features/game/HomePage.tsx` (ecrã `/home`: cena, ações → rotas em `ACTION_TO`, ícones em `ACTION_ICON`), `LocationScene.tsx` (um desenho por `LocationScene`), `game.css` (`.place*`)
- **Local novo:** acrescentar em `NAMED` (`locations.ts`); cena nova → `LocationScene` (tipo) + desenho em `LocationScene.tsx`; ação nova → `LocationActionId`, `ACTION`, `ACTION_ICON`/`ACTION_TO`
- Testes: `game-core/test/locations.test.ts`, `e2e` (`place-name`)

## Chat do hex

- Contrato: `packages/shared/src/protocol.ts` (`ChatMessage`, `CHAT_MAX_LENGTH`, `CHAT_HISTORY`, `chat.send`, `chat.message`, `world.entered.chat`)
- Servidor: `gateway.ts` (`chat`, `chatHistory`, filtro `onlyHex` em `onWorldBroadcast`), `connection.ts` (`chatBucket`), `server-kit/src/bus.ts` (`chatKey`, `WorldBroadcast.onlyHex`)
- Web: `world-state.ts` (`chat`), `world-store.ts` (`send`/`setSender`), `useWorldConnection.ts`, `HomePage.tsx` (`HexChat`)
- **Quando houver movimento:** ao mudar de hex, enviar o histórico do novo hex e atualizar `PresencePlayer.position` (o filtro usa a posição da presença)
- Testes: `realtime.test.ts`, `apps/web/test/world-state.test.ts`, `e2e` (`hex-chat-log`)

## Aparência do personagem (corpo base editável) e arte

- Contrato: `packages/shared/src/api.ts` (`appearanceV1Schema` antigo, `appearanceV2Schema`, `BODY_TYPES`, `SKIN_TONES`, `HAIR_STYLES`, `HAIR_COLORS`, `EYE_COLORS`, `APPEARANCE_COLORS` = roupa, `DEFAULT_APPEARANCE`, `normalizeAppearance`)
- BD: `characters.appearance` (JSONB com `version`); ao mudar a forma, **criar nova versão** e manter `normalizeAppearance` a converter as antigas
- Arte (SVG em camadas, provisória): `apps/web/src/features/avatar/CharacterAvatar.tsx` (camadas: cabelo de trás, pernas, tronco, braços, arma, cabeça, olhos, cabelo da frente), `avatar.css` (animações idle), `weapon-art.ts` (arma desenhada por tipo de arma)
- Inimigos: `apps/web/src/features/avatar/EnemyAvatar.tsx` (um desenho por `enemyDefId`) — **inimigo novo precisa de arte aqui**
- Usos no DOM: `CharacterToken.tsx` (retrato), `AppearanceEditor.tsx` + `CharacterCreatePage.tsx` (editor), `CharacterSheetPage.tsx` (herói), `rifts/CombatStage.tsx` (só sem WebGL)
- Usos no canvas (PixiJS): `apps/web/src/features/render/avatar-textures.tsx` transforma as camadas em texturas (`part`: `base`/`weapon`/`head` + `eyesClosed`; âncoras usadas em `rifts/combat-scene.ts` → `UnitView`). **Camada nova** (ex.: equipamento) → acrescentar a `AvatarPart`, a `characterTextures` e ao `UnitView` (a mão secundária já é a camada `offhand`); retrato do mapa → `portraitTexture` (`world/map-scene.ts`)
- Presença: `PresencePlayer.appearance` (`protocol.ts`)
- Testes: `helpers.ts` (v1, compatibilidade), `server-kit/test/presence.test.ts`, `web/test/world-state.test.ts`, `e2e` (botões "Hair style …")
- Futuro (D32): camadas de equipamento por cima do corpo base, no mesmo `CharacterAvatar`

## Posição no mapa / hexágonos

- Regras: `packages/game-core/src/hex.ts` (axial q,r, distância, vizinhos, píxeis, `pixelToHex`/`hexRound` para clicar)
- Contrato: `HexCoord` em `packages/shared/src/api.ts`; `position` em `CharacterDto` e `PresencePlayer`
- BD: `characters.hex_q/hex_r`, `worlds.spawn_q/spawn_r`
- Servidor: `characters.service.ts` (spawn, `toCharacterDto`), `gateway.ts` (presença)
- Web: `apps/web/src/features/world/map-scene.ts` (desenho em PixiJS: `HEX_SIZE`, `REGION_COLORS`, `MAP_BOUNDS`, tokens, rato/teclado), `map-camera.ts` (zoom, arrastar, limites `MIN_ZOOM`/`MAX_ZOOM`), `HexMap.tsx` (componente React + botões de zoom), `WorldPage.tsx` (seleção, hexágono por baixo do rato, `HexInfo`)
- Testes: `game-core/test/hex.test.ts`, `characters.test.ts` (posição inicial), `apps/web/test/map-camera.test.ts`
- Futuro (AP, terreno): `ARCHITECTURE.md` §8, `DATABASE.md` → map_hexes

## País de origem, kits iniciais e criação curta (pedido #43)

- Contrato: `NATION_IDS`, `STARTER_KIT_IDS`, `createCharacterRequestSchema` (`nation` obrigatório, `starterKit`, `attributes` opcional), `CharacterDto.nation` (`api.ts`)
- Regras/dados: `STARTER_KITS`, `getStarterKit` (`content/items.ts`), habilidade `fireball` (`content/abilities.ts`), `capitalOf` (`world-map.ts`)
- BD: `characters.nation` (migração 0013)
- Servidor: `characters.service.ts` (`create`: capital, kit, Fireball preparada)
- Web: `CharacterCreatePage.tsx` (`choice-card`), cores dos países em `world/region-colors.ts`
- Testes: `characters.test.ts`, `helpers.ts` (`createCharacter` envia `nation`), `e2e/foundation.spec.ts` (`createCharacter` clica país e kit)

## Action Points (AP) e viajar (pedido #43)

- Regras: `packages/game-core/src/ap.ts` (`AP_RULES`: máx., por hora, custo por hexágono; `currentAp`, `apFullAt`, `checkMove`)
- Contrato: `ApDto`, `CharacterDto.ap`, `moveRequestSchema` (`api.ts`); mensagem WS `player.moved` (`protocol.ts`); `ControlMessage` `character.moved` (`server-kit/src/bus.ts`)
- BD: `characters.ap`, `characters.ap_updated_at`
- Servidor: `characters.service.ts` (`move`, `toCharacterDto`), rota `POST /api/characters/:id/move`, `gateway.ts` (`onControl` → `character.moved`)
- Web: `world/ap.ts` (`liveAp`, `fullIn`), `world/api.ts` (`useTravel`), `world-store.ts` (`updateSelf`), `world-state.ts` (`player.moved`), `GameShell.tsx` (`ApPill`), `WorldPage.tsx` (`HexInfo`: "Travel here")
- Testes: `game-core/test/world-systems.test.ts`, `characters.test.ts` ("travels"), `web/test/world-state.test.ts`, e2e (viagem no mapa)
- **Atividade nova que custe AP:** usar `currentAp`/gravar `ap` + `ap_updated_at` como em `move`

## Terreno, entradas de Rift e dificuldade por profundidade (pedido #43)

- Mapa: `world-map.ts` (`TERRAINS`, `TERRAIN_NAMES`, `MapHex.terrain/riftDepth/rift`, `carveRivers`, `placeRifts`, `RIFT_TIERS`, `RIFT_SITE_COUNT`, `riftSites`, `riftSiteById`)
- Rifts: `content/rifts.ts` (`RIFT_TIER_RULES`, `riftTierModifiers`, `getRift` resolve `rift_q_r`), `rift/run.ts` (Threat inicial, modificadores por tier), `RiftDto.tier/site` (`combat.ts`)
- Servidor: `rifts.service.ts` (`list` = entradas, `assertAtRift`), `lobbies.service.ts` (criar/começar no hexágono); erro `NOT_HERE` (`errors.ts`)
- Profissões: `GATHERING_TERRAIN`, `professionTerrains` (`content/professions.ts`), `professions.service.ts` (terreno), `ProfessionDto.terrains/availableHere`, `ProfessionsPage.tsx`
- Locais: `content/locations.ts` (capital, terreno, Rift, world boss) → `HomePage.tsx`
- Web: `map-scene.ts` (`terrainTint`, `drawTerrainGlyph`, `riftMarker`), `RiftsPage.tsx` (Rift no teu hexágono + lista)
- Testes: `world-systems.test.ts`, `locations.test.ts`, `rifts.test.ts` / `lobbies.test.ts` / `professions.test.ts` (`placeCharacter`, `firstRiftSite`), e2e (`travel`)

## World boss (pedido #43)

- Conteúdo: `content/world-boss.ts` (`WORLD_BOSS_SEASONS`, `WORLD_BOSS_RULES`, `nextBossHex`, `partyKeyOf`), inimigo `hollow_colossus` (`enemies.ts`), `createWorldBossRun`/`worldBossDamage` (`rift/run.ts`, `RunState.mode = 'worldboss'`)
- **Época nova:** acrescentar a `WORLD_BOSS_SEASONS` (+ inimigo e arte em `EnemyAvatar.tsx`); a linha da BD cria-se sozinha
- BD: `world_bosses`, `world_boss_attempts` (migração 0013); TRUNCATE em `helpers.ts` e `worker.test.ts`
- Contrato: `WorldBossDto`, `worldBossFightSchema` (`world-boss.ts`), `RunDto.mode/worldBoss`, erro `NO_ATTEMPTS_LEFT`
- Servidor: `modules/worldboss/` (`worldboss.service.ts`, `worldboss.repository.ts` → `settleWorldBossFight`, rotas `/api/world-boss`), `rifts.service.ts` (`createWorldBossRun`, `finish`), `lobbies.service.ts` (`riftId = 'world_boss'`)
- Web: `features/worldboss/WorldBossPage.tsx` (rota `/world-boss`), `world/api.ts` (`useWorldBoss`, `useWorldBossFight`), `map-scene.ts` (`placeBoss`), `CombatPage.tsx`/`EndOverlay.tsx` (dano)
- Testes: `apps/server/test/world-boss.test.ts`, `world-systems.test.ts`

## Inimigos com mecânicas, estados novos e ícones (pedido #44)

- Estados: `STATUS_IDS` (`shared/combat.ts`) → `STATUS_NAMES`, `STATUS_DESCRIPTIONS` (`abilities.ts`) → regras em `engine.ts` (`startRound`: ritual, rastilho; `applyEffect`: força, intangível, espinhos, dreno; `summon`, `explode`) → ícone em `shared/ui/EffectIcon.tsx` (`ICONS`) → cor em `combat-scene.ts` (`STATUS_COLORS`). **Estado novo: tocar em todos estes.**
- Efeitos de habilidade: `AbilityEffect` (`drain`, `summon`), `describeEffects`, `abilityEffectIcons` (`EffectIcon.tsx`), IA `expectedValue` (`engine.ts`)
- Inimigos: `ENEMIES` (`startStatuses`, `mechanic`), `enemyCombatant` (`combat/state.ts`), salas em `content/rifts.ts`, arte em `EnemyAvatar.tsx` (`ART`). **Inimigo novo: dados + arte + sala + `pnpm sim`.**
- Log: `summon` / `explode` (`CombatLogEntry`) → `combat-text.ts`, `combat-timeline.ts`, `combat-scene.ts`
- Ícones na interface: `UnitChips.tsx` (estados e intenções), `CombatPage.tsx` (lista de inimigos + mecânica), `AbilityBar.tsx`, `sheet/AbilitiesTab.tsx`
- Dodge + Agilidade: `BASIC_ACTIONS.block.perAgility`
- Testes: `game-core/test/combat.test.ts` ("enemy mechanics")

## Skills e livros de skill (pedido #47)

- Dados: `packages/game-core/src/content/skills.ts` (`SKILLS`, `SkillDef.requirements`, `getSkill`, `skillBookId`); `getAbility` procura também aqui (`abilities.ts`)
- Livros: `SKILL_BOOKS` (`items.ts`, `ItemDef.teaches`), saque em `rifts.ts` (`books()`)
- Efeitos/estados: `cleanse` (`AbilityEffect`), estado `regen` (`STATUS_IDS`) → `engine.ts`, `EffectIcon.tsx`, `combat-scene.ts`
- Servidor: `sheet.service.ts` (`useItem`, `toAbilityDto.requirements`), rota `POST /characters/:id/items/:itemId/use`; contrato `AbilityDto.requirements`
- Web: `characters/api.ts` (`use`), `sheet/EquipmentTab.tsx` (duplo clique no livro), `sheet/ItemTooltip.tsx` ("Teaches …")
- Testes: `combat.test.ts` ("skills"), `character-sheet.test.ts` ("Skill Books")
- **Skill nova:** só dados em `SKILLS` (o livro e o saque aparecem sozinhos); ícone opcional em `AbilityIcon.tsx`

## Ouro, cidade (loja, armazém, ferreiro) e mochila (pedido #50)

- Regras: `content/economy.ts` (`INVENTORY_RULES`, `SHOP_STOCK`, `npcSellPrice`, `WEAPON_FAMILIES`, `weaponFamily`, `UPGRADE_STEPS`, `upgradeQuote`, `upgradeOutcome`), ouro dos Rifts `RIFT_GOLD_RULES` (`rifts.ts`), raridade por tier `dropAffixWeightsByTier` (`affixes.ts`)
- BD: `characters.gold`, `items.in_storage`, `character_skills.level` (migração 0015)
- Servidor: `modules/city/` (`CityService`, rotas `/characters/:id/city/...`), `characters/bag.ts` (`giveItem`, `assertBagRoom`, `bagUsed` — **toda a entrada de itens deve passar por `giveItem`**), `characters/ap.ts` (`spendAp`); `itemsRepository.listByCharacter` exclui o armazém
- Contrato: `CityDto` (`shared/city.ts`), erros `BAG_FULL`, `NOT_ENOUGH_GOLD`, `NOT_ENOUGH_AP`; `RunRewardsDto.gold/items[].rarity/inStorage`; `RoomOutcomeView.gold`
- Web: `features/city/` (`CityPage.tsx`, `api.ts`), `rifts/LootList.tsx` (popup), `GameShell.tsx` (ouro na barra), `sheet/EquipmentTab.tsx` (pesquisa, 20 espaços, tooltips dos atributos)
- Testes: `apps/server/test/city.test.ts`

## Reputação (pedido #49)

- Regras: `packages/game-core/src/reputation.ts` (`REPUTATION_RULES`, `riftClearFactor`, `gearReputationBonusPct`, `riftReputation`)
- Servidor: `rifts.service.ts` (`finish`), `rifts.repository.ts` (`victoriesIn`), `sheet.service.ts` (`reputationGearBonus`, `reputationBonusPct`)
- Contrato: `RunRewardsDto.clearNumber/clearFactorPct/gearBonusPct`, `CharacterSheetDto.reputationBonusPct`
- Web: `EndOverlay.tsx`, `CharacterSheetPage.tsx`
- Testes: `game-core/test/reputation.test.ts`, `rifts.test.ts` ("full run")
- **Fonte nova de reputação** (ex. profissões): somar `characters.reputation` e decidir se o bónus do equipamento se aplica

## Recompensa da época do world boss (pedido #44)

- `WORLD_BOSS_SEASONS[].endsAt/reward` (`world-boss.ts`), item `hollow_heart` (`items.ts`), `world_bosses.rewarded_at` (migração 0014), `WorldBossService.settleSeason`/`seasonOver`, `WorldBossDto.endsAt/seasonOver/rewardedAt/reward`, `WorldBossPage.tsx`
- Testes: `world-boss.test.ts` ("season reward")

## Combate sem Dodge aleatório; Block chama-se Dodge (pedido #43)

- Regras: `engine.ts` (`applyEffect` sem esquiva), `stats.ts` (sem `dodgeChance`), `affixes.ts` (sem o efeito "dodge"), `enemies.ts`
- Contrato: `DerivedStatsDto` sem `dodgeChance`; `CombatLogEntry` sem `dodge`
- Textos ("Dodge" = o antigo Block): `abilities.ts` (nome/descrições, `describeEffects`), `combat-text.ts`, `combat-scene.ts`, `UnitChips.tsx`, `CombatPage.tsx`, `AbilitiesTab.tsx`, `AbilityEditor.tsx`, `rooms.ts`, `items.ts`. O código continua a chamar-lhe `block`.

## Sensação de jogo (pedido #43)

- `apps/web/src/lib/app-feel.ts` (sem menu do botão direito fora dos campos de texto, sem arrastar imagens/links), `main.tsx`, `global.css` (`.app-feel`)

## Mapa do mundo: continente, regiões (países + Riftlands), capitais

- Dados/regras (puros, determinísticos): `packages/game-core/src/content/world-map.ts` (`REGIONS` com nome, tipo e capital; `CONTINENT_HALF_WIDTH/HEIGHT`, `RIFTLANDS_CENTER`, `RIFTLANDS_WEIGHT`; `worldMapHexes`, `mapHexAt`, `regionAt`)
- Web: `map-scene.ts` (`REGION_COLORS` — **região nova precisa de cor aqui**; fronteiras/costa, `capitalMarker`, nomes das regiões, `MAP_BOUNDS` para a câmara), `WorldPage.tsx` (`HexInfo` mostra região/capital)
- Spawn: na capital do país (`capitalOf`, pedido #43); `worlds.spawn_q/spawn_r` já não é usado na criação
- Testes: `game-core/test/world-map.test.ts` (forma, capitais, ligação, fronteiras), `e2e/foundation.spec.ts` ("The Riftlands" no hexágono inicial)
- Mudar a forma ou as capitais muda que hexágonos existem: rever personagens guardados fora de terra e o teste do spawn

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
- `apps/server/test/helpers.ts` (valores de teste); `ADMIN_EMAILS` também em `apps/server/test/admin.test.ts`
- **Railway (produção):** as variáveis vivem no painel do Railway, não no código. Atualizar a lista em `docs/DEPLOY_RAILWAY.md` e avisar o dono para a acrescentar no serviço certo (`server` e/ou `worker`)

## Ecrã / rota nova no frontend

- `apps/web/src/app/router.tsx` (+ comentário com o mapa de rotas)
- Ecrã de jogo (com barra de topo/navegação e ligação ao mundo): pôr a rota dentro do `GameShell` no router e renderizar só o conteúdo (`<div className="screen-body">` ou posição absoluta em `.game-main`); acrescentar à `BottomNav` (`features/game/GameShell.tsx`) se for um destino principal
- Pasta `apps/web/src/features/<feature>/`
- Estilos: `apps/web/src/styles/global.css` (tokens em `tokens.css`)
- e2e em `e2e/`; Docs: `ARCHITECTURE.md` §9

## Módulo de servidor novo (ex.: combat, economy)

- `apps/server/src/modules/<domínio>/{routes,service,repository}.ts`
- Registar em `apps/server/src/app.ts`
- Contratos em `packages/shared`, regras em `packages/game-core`
- Testes em `apps/server/test/<domínio>.test.ts`; `ROADMAP.md`, `DECISIONS.md` se houver decisão

## Formação / posições (uma linha de 4, D60 — antes 3 × 2, D38)

- **Agora:** `SLOTS_PER_SIDE = 4`, `COMBAT_COLUMNS = front, second, third, back` (uma "coluna" = uma posição), `LOBBY_MAX_MEMBERS = 4`, PvP `PVP_MAX_MEMBERS = 8`/`PVP_TEAM_B_OFFSET = 4`; ecrã: `combat-layout.ts` (`place`), `LobbyPage.tsx` (`COLUMNS`) + `.lobby-formation` em `global.css`; migração 0010 (fecha corridas/lobbies antigos)
- O que se segue descreve o modelo antigo e continua válido nos nomes das funções:

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
- **PvE (D59, Slay the Spire):** `planAction` resolve logo (`resolvePlanned`); `setReady` = End turn → `resolveRound` só com as intenções dos inimigos; `isPvp`; Block do grupo no início da ronda, dos inimigos no início da fase deles; ecrã: `pvp ? … : …` em `CombatPage.tsx` (`useReplayState.resolving` espera pela entrada `resolve`)
- Ronda PvP (D47–D50): `startRound` (Block reset, estados, Focus, `rollInitiative`), `planAction`/`unplanAction`/`setReady`/`timeoutTurn`, `resolveRound` (alternância), `resolvePlanned`/`resolveIntent`, `absorbWithBlock`, `reservedBy` (Focus/Mana reservados)
- Números: `COMBAT_RULES` (state.ts), `FOCUS_RULES` (stats.ts), `BASIC_ACTIONS` (abilities.ts: Block e mudar de posição), `WEAPON_RULES` (weapons.ts)
- Contrato: `packages/shared/src/combat.ts` (`CombatView` com `plan`/`ready`/`initiative`, `CombatantView` com `focusPerRound`/`stunned`/`abilityMultipliers`, `PlannedActionView`, `CombatLogEntry` (`initiative`, `resolve`, `skipped`), `combatActionSchema`: `plan`/`unplan`/`ready`)
- Ecrã: `apps/web/src/features/rifts/CombatPage.tsx` (`CombatScreen`: fila do plano à esquerda, ronda/iniciativa em cima, intenções à direita, painel do personagem e barra em baixo; `useReplayState`), `RunPage.tsx` (escolhe combate ou exploração), `EndOverlay.tsx`, `CombatStage.tsx` (canvas + botões DOM por cima), `combat-scene.ts` (desenho e animações em PixiJS, `stepMs`), `combat-timeline.ts` (log → passos de animação), `combat-layout.ts` (posição de cada slot no ecrã), `combat.css`, `combat-text.ts` (texto do log)
- Testes: `game-core/test/combat.test.ts`, `apps/server/test/rifts.test.ts`, `apps/web/test/combat-render.test.ts`, `e2e` ("Rift combat")
- **Entrada nova no log:** `CombatLogEntry` (shared) → engine → `combat-text.ts` → `combat-timeline.ts` (`FxEvent`, `buildTimeline`, `applyStep`) → `combat-scene.ts` (`applyEvents`) se tiver animação
- **Ação nova:** `combatActionSchema` → `planAction`/`resolvePlanned` (engine) ou `rift/run.ts` + `rifts.service.ts` (`act`) se for de corrida → `CombatPage.tsx`/`RunPage.tsx`
- **Posições da formação (D38, 3 colunas × 2 linhas) mudarem:** `combat-layout.ts` (`place`) e o teste `combat-render.test.ts`
- Equilíbrio: `pnpm sim` (`scripts/simulate-balance.ts`) depois de mudar números; metas em `docs/REQUESTS.md` (A23)

## Estados, Block e intenções (Slay the Spire + Darkest Dungeon)

- Contrato: `STATUS_IDS`, `StatusView`, `IntentView`, `CombatantView.block/statuses/intents`, entradas de log `block`/`status`/`tick`/`stunned` (`shared/src/combat.ts`)
- Motor: `combat/engine.ts` (`beginTurn`: Block expira, dano contínuo, contagem; `applyEffect`; `planEnemyIntents` no início da ronda; `runEnemyPhase` executa as intenções), `COMBAT_RULES.markMultiplier/weakenMultiplier`
- Web: `rifts/UnitChips.tsx` (`IntentChips`, `StatusChips`, colocados por cima do canvas em `CombatStage.tsx`), `combat.css` (cores dos chips), `combat-timeline.ts` + `combat-scene.ts` (animação de Block/estado/tick/atordoado; cores `STATUS_COLORS`), `combat-text.ts`
- Testes: `game-core/test/combat.test.ts` ("Combat 2.0", "enemy intents"), `e2e`
- **Estado novo:** `STATUS_IDS` (shared) → efeito no motor → nome/descrição em `content/abilities.ts` → cor em `combat.css` e `STATUS_COLORS` (`combat-scene.ts`) → texto/animação

## Inimigos

- Conteúdo: `packages/game-core/src/content/enemies.ts` + habilidades em `content/abilities.ts` (`source: 'enemy'`)
- Arte: `apps/web/src/features/avatar/EnemyAvatar.tsx` (usada no canvas via `enemyTexture` em `render/avatar-textures.tsx`)
- Tipo de animação (corpo a corpo / projétil / magia / cura) vem da habilidade: `abilityFxKind` em `rifts/combat-timeline.ts`
- Uso em Rifts: `content/rifts.ts`

## Rifts e corridas (runs)

- Conteúdo: `packages/game-core/src/content/rifts.ts` (`MapTemplate`, encontros combat/elite/boss com posições, eventos, recompensas do boss, `lootRoom`, `secretRoom`) → ver "The Rift"
- BD: `rift_runs` (`RunState` v2 em JSONB, `version`, `turn_deadline` = fim do voto/planeamento, `room_index` = salas visitadas), `rift_run_participants` (resultado por personagem)
- Servidor: `apps/server/src/modules/rifts/` (`rifts.service.ts`: começar, agir, avançar, abandonar, temporizador, recompensas/penalização; `rifts.routes.ts`; `rifts.repository.ts`)
- Bloqueios durante um Rift: `assertNotInRift` em `characters/sheet.service.ts` (equipar/desequipar) e `characters.service.ts` (apagar); erro `IN_RIFT`
- Recompensas/penalização: `finish()` em `rifts.service.ts`; durabilidade em `game-core/equipment.ts` (`qualityAfterDefeat`)
- Eventos do mundo: `rift.entered`, `rift.completed`, `rift.failed`, `rift.left`; PvP: `pvp.entered`, `pvp.finished`
- Web: `apps/web/src/features/rifts/` (`RiftsPage.tsx`, `RunPage.tsx`, `CombatPage.tsx`, `RiftMap.tsx`, `api.ts`); `HomePage.tsx` (cartão "Inside…"), `LobbyPage.tsx` (`depth`); rotas em `router.tsx`
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
- Onde estão as migrações e o site em produção: `findMigrationsDir` (`packages/db/src/client.ts`) e `findWebDist` (`apps/server/src/app.ts`). Funcionam com o Dockerfile (`MIGRATIONS_DIR`, `WEB_DIST_DIR`) e também se o Railway construir sozinho e correr `pnpm start` (pedido #26). **Mudar a estrutura de pastas** → rever as listas de caminhos nestas duas funções
- Ligação ao Redis: `packages/server-kit/src/redis.ts` (`family: 0`, necessário para IPv6)

## Renderer canvas (PixiJS) — combate e mapa

- Decisão: `DECISIONS.md` ADR-029; dependência `pixi.js` em `apps/web/package.json`
- Arranque: `apps/web/src/features/render/pixi-app.ts` (imports de `pixi.js/*` que registam o que desenhamos — **um tipo de objeto novo do Pixi pode precisar de mais um import aqui**; `unsafe-eval` por causa da CSP)
- Ciclo de vida React: `render/usePixiScene.ts` (`PixiScene`: `resize`, `destroy`; recurso sem WebGL → `failed`)
- Texturas: `render/svg-texture.ts` (SVG → textura por `data:` URL, brilho, vinheta, gradientes), `render/avatar-textures.tsx` (arte dos personagens e inimigos)
- Cenas: `rifts/combat-scene.ts`, `world/map-scene.ts`
- CSP do servidor: `apps/server/src/plugins/security.ts` (`imgSrc` tem de manter `data:`; sem `blob:`/workers)
- Dev server: `apps/web/vite.config.ts` → `optimizeDeps.include` (acrescentar aqui qualquer novo import `pixi.js/*`)
- Testes e2e: fechar as páginas/contextos abertos (um mapa aberto continua a desenhar)
- Docs: `ARCHITECTURE.md` §7–§9

## Tema visual (aspeto de jogo) e tamanhos de ecrã

- Cores, espaçamentos e escala fluida: `apps/web/src/styles/tokens.css` (tudo em `rem`; `--hud-gap`)
- Estilos: `apps/web/src/styles/global.css` (painéis, botões, `screen`, `topbar`, HUD do mundo, criação, ficha), `features/rifts/combat.css`
- Fontes: `@fontsource/cinzel` e `@fontsource/alegreya-sans` importadas em `apps/web/src/main.tsx`
- Moldura de ecrã: `apps/web/src/shared/ui/Screen.tsx` (cenário, brasas, vinheta); ícones: `shared/ui/Icon.tsx`
- **Ecrã novo:** envolver em `<Screen>` com `<header className="topbar">` e `<main className="screen-body">`
- Avatares em `rem` no DOM; no canvas usar `inSvg` (píxeis exatos) — ver `render/avatar-textures.tsx`
- Teste: `e2e/foundation.spec.ts` → "screens fit every screen size" (a página nunca faz scroll)
- Decisão: ADR-030

## Hub, barra de topo e navegação (GameShell)

- Layout: `apps/web/src/features/game/GameShell.tsx` (ligação ao mundo `useWorldConnection`, avisos "Playing elsewhere"/"Entering the world", `TopBar`, `BottomNav`), estilos em `features/game/game.css`
- Hub: `features/game/HomePage.tsx` (cartão de atividade, menus laterais, losangos, faixa da Crónica)
- Rotas dentro do layout: `/home`, `/world`, `/rifts`, `/friends` (`app/router.tsx`); entrar no jogo vai para `/home` (`CharacterCreatePage`, `CharacterSelectPage`, `CharacterSheetPage`)
- Cenário: `shared/ui/Landscape.tsx` (placeholder) via `Screen`/`SceneBackground` (`dim` por ecrã em `DIM` no `GameShell`)
- Ícones de interface: `shared/ui/Icon.tsx`
- Testes: `e2e/foundation.spec.ts` (Hub, navegação "World"/"Rifts" com `exact: true`)
- Decisão: ADR-031; valores provisórios A35

## Barra de habilidades (combate)

- `apps/web/src/features/rifts/AbilityBar.tsx` (slots, teclas 1–9, Esc, tooltip), `AbilityIcon.tsx` (ícones placeholder: `GLYPH_BY_ABILITY` e cor por tipo `abilitySchool`), estilos no fim de `combat.css`
- **Habilidade nova:** acrescentar o ícone em `GLYPH_BY_ABILITY` (senão usa o ícone do tipo); o texto da tooltip vem de `describeEffects`/`describeTargeting`/`describeScaling` (`game-core/content/abilities.ts`)
- Usada em `CombatPage.tsx`; e2e procura os botões pelo nome ("Slash", "Raise Shield")

## The Rift — dungeon, mapa e salas (pedido #31)

- Regras puras: `packages/game-core/src/rift/map.ts` (`MapTemplate`, `generateRiftMap`, `validateMap`, `attachSecret`, `allPaths`), `rift/run.ts` (`RunState` v2, `createRun`, `vote`/`resolveDecision`, `enterRoom`, `resolveEvent`, `combatAction`, `continueRun`, `leaveRun`, `timeoutRun`, `toMapDto` — **nunca enviar salas secretas escondidas**), `rift/tests.ts`
- Dados: `content/rifts.ts` (`DEFAULT_MAP_TEMPLATE`, encontros, eventos permitidos, loot), `content/rooms.ts` (`ROOM_TYPE_INFO`, `EXPLORATION_RULES`: campsite, procura secreta, dado dos testes, tempo de voto; `CONDITIONS`), `content/events.ts` (`EVENTS`, efeitos `hp`/`mana`/`condition`/`removeDebuffs`/`item`/`revealSecret`), `content/enemies.ts` (`ELITE_RULES`)
- Contrato: `packages/shared/src/combat.ts` (`ROOM_TYPES`, `RiftDto`, `MapDto`, `MapNodeDto`, `RunMemberDto`, `ConditionView`, `VoteView`, `EventView`, `TestRollView`, `RoomOutcomeView`, `RunPhase`, `RunDto`; ações `vote`/`continue`); `LobbyDto.depth` (`social.ts`)
- Servidor: `modules/rifts/rifts.service.ts` (`createRun`, `act`, `catchUpTimers`, `grantItems`, `decisionKey`, `toRunDto`, `startingSlot`), `lobbies.service.ts` (líder do lobby = líder da corrida)
- BD: `rift_runs.state` (`version: 2`); itens encontrados → `items.source` (`loot_room`, `secret_room`, `event`)
- Web: `features/rifts/RunPage.tsx` (`ExplorationScreen`, painel do grupo, eventos com escolha de quem tenta e % de sucesso, resultado das salas), `RiftMap.tsx` (`ROOM_GLYPH`, `MapLegend`), `rift-map.css`
- **Tipo de sala novo:** `ROOM_TYPES` (shared) → `ROOM_TYPE_INFO` (rooms.ts) → `enterRoom` (run.ts) → pesos em `MapTemplate.themes` → `ROOM_GLYPH` + cor em `rift-map.css` → testes
- **Evento novo:** `content/events.ts` + id em `RIFTS.*.events`; **estado novo:** `CONDITIONS`
- Testes: `game-core/test/rift.test.ts` (regras do mapa em 150 seeds, votos, campsite, loot, eventos, segredos escondidos), `apps/server/test/rifts.test.ts` (corrida completa até ao boss, loot), `lobbies.test.ts` (votos em grupo), `e2e` ("Rift: map, plan…")
- Equilíbrio: `pnpm sim` joga corridas completas
- Futuro: Dungeon Threat (ADR-035)

## Regra dos BASE STATS (D44)

- Fonte única dos atributos base: `baseAttributesOf` (`apps/server/src/modules/characters/sheet.service.ts`) → `asBaseAttributes` (`game-core/src/rift/tests.ts`)
- Testes: `attributeTest`, `baseStat`, `testChance` (`rift/tests.ts`); `RunMember.baseAttributes` (run.ts), `searchForSecret`, `resolveEvent`
- Contrato/ecrã: `RunMemberDto.baseAttributes`, `TestRollView.base`; `RunPage.tsx` mostra "(base)"
- **Qualquer teste novo fora do combate** tem de usar `attributeTest`/`baseStat` (nunca `attributes` totais)

## Armas (catálogo, pedido #31)

- Catálogo: `packages/game-core/src/content/weapons.ts` (`WEAPON_TYPES`, `WEAPON_RULES`: pesos 60/40, upgrade por nível, máx. especiais/runas, custo do ataque básico; `weaponScaling`, `weaponDamage`, `upgradeMultiplier`, `normalizeWeaponInstance`, `weaponInfo`)
- Custo do ataque básico **por tipo** (D54): `basicAttackCost` em `WEAPON_TYPES`; mostrado no cartão do item (`ItemDto.weapon.basicAttackCost`, `sheet/ItemTooltip.tsx`)
- Ataques básicos: `basicAttack()` em `content/abilities.ts` (slash, chop, stab, thrust, crush, aimed_shot, staff_strike, wand_bolt, spark)
- Itens: `content/items.ts` (`weaponType`, `twoHanded` tem de bater com `hands`); upgrades → `abilityMultipliers` (`equipment.ts`) → `PartyMemberInput.abilityMultipliers` → `valueMultiplier` no motor
- Contrato: `ItemDto.weapon` (`WeaponInfoDto`, `WeaponSpecial`, `WeaponRuneSlot` em `api.ts`)
- BD: `items.upgrade_level`, `items.specials`, `items.rune_slots` (migração 0008)
- Servidor: `toItemDto` e `combatProfile` (`sheet.service.ts`)
- Arte: `CharacterAvatar.tsx` (`WeaponArt`, `Weapon`, `Offhand`), `weapon-art.ts` (`MAIN`, `OFF`, `ART_BY_BASIC`) — todos os tipos têm desenho (pedido #45)
- **Regra (pedido #46):** 21 tipos = 1 por atributo + 1 por cada par; cada item de arma tem 2 habilidades (básico + 1 poder) — `weapons.test.ts` verifica. Mudar atributos de um tipo obriga a rever a descrição do item.
- **Tipo de arma novo:** `WEAPON_TYPES` + ataque básico e poderes (`abilities.ts`) + item (`items.ts`) + saque (`rifts.ts`) + arte (`CharacterAvatar.tsx`, `weapon-art.ts`) + ícone (`AbilityIcon.tsx`) + build em `scripts/simulate-balance.ts` + `startingSlot` se for à distância
- Ícones: `GLYPH_BY_ABILITY` (`AbilityIcon.tsx`)
- Testes: `game-core/test/weapons.test.ts`, `character-system.test.ts`; equilíbrio: `pnpm sim`
- Futuro: Runemaster, runas (só a estrutura existe); os especiais passaram a ser os efeitos bónus → ver "Cartão do item e efeitos bónus"

## Cartão do item e efeitos bónus (pedido #37, D62–D65)

- Catálogo/regras: `packages/game-core/src/content/affixes.ts` (`AFFIXES`, `AFFIX_RULES`: máx. 5, pesos dos drops, duração/valor dos estados on-hit; `rarityOf`, `RARITY_NAMES`, `normalizeAffixes`, `describeAffix`, `rollAffixes`, `rollAffixCount`, `gearTotals`, `isGear`)
- Stats: `computeStats` (`stats.ts`) soma `gearTotals` dos itens equipados (`OwnedItem.affixes`) e devolve `gear` (efeitos de combate)
- Requisitos (atributos base, não dependem do upgrade — D66): `REQUIREMENT_RULES`, `itemRequirements`, `checkRequirements`, `planEquip(…, baseAttributes)` (`equipment.ts`); `ItemDef.requirements` (`content/items.ts`)
- Combate: `GearCombatEffects` (`api.ts`) → `CombatantView.gear` (`combat.ts`) → `PartyMemberInput.gear` / `partyCombatant` (`state.ts`) → `RunMember.gear` (`rift/run.ts`) → `applyEffect` + `gearOnHit` + `addStatus` (`combat/engine.ts`)
- Contrato: `ItemDto.rarity`, `affixes` (`ItemAffixDto`), `requirements` (`ItemRequirementDto`), `runeSlots`; `ITEM_RARITIES`, `ItemRarity`, `AffixGroup` (`api.ts`)
- BD: `items.specials` (efeitos `{ id, value }`), `items.rune_slots` (só os desbloqueados aparecem no cartão) — sem migração
- Servidor: `toOwned`, `toItemDto(row, base)`, `equip` (passa os atributos base), `combatProfile` (`sheet.service.ts`); drops e itens encontrados → `rollDropAffixes` em `finish()` (`rifts.service.ts`); `gear: profile.gear` em `createRun`/`createPvpRun`
- Interface: `apps/web/src/features/characters/sheet/ItemTooltip.tsx` (o cartão do item vive na caixa que aparece ao passar o rato: nome com a cor da raridade, "Requires", "Bonus effects", "Rune slots"); `sheet/EquipmentTab.tsx` (`data-rarity` nos espaços e na mochila → contorno com a cor); `sheet/sheet.css` (secção "rarity"); cores `--rarity-*` em `tokens.css` e `[data-rarity]` em `global.css`
- Testes: `game-core/test/affixes.test.ts`; `apps/server/test/character-sheet.test.ts` ("item cards"); `e2e/foundation.spec.ts` (ficha)
- **Efeito novo:** só dados em `AFFIXES` (se for de um tipo novo, acrescentar o `kind` a `AffixEffect` e tratá-lo em `gearTotals` e, se for de combate, em `GearCombatEffects` + motor)

## Loot do Rift (D55)

- Itens encontrados (Loot/Secret/eventos): `RunState.grants` (`rift/run.ts`) → entregues só na vitória, a quem não saiu: `finish()` (`rifts.service.ts`), juntos com os drops do boss em `RunRewardsDto.items`
- Testes: `apps/server/test/rifts.test.ts` ("kept only if the party beats the Rift")

## Dungeon Threat (simples, D56)

- Regras: `THREAT_RULES`, `threatTier` (`content/rooms.ts`); `RunState.threat`, `addThreat`, `toThreatView` (`rift/run.ts`); fontes: `resolveEvent` (teste falhado), `timeoutRun` (voto sem decisão), `continueRun` (Elite limpa)
- Efeito no boss: `createEncounter({ enemyModifiers })` → `enemyCombatants(..., mods)` (`combat/state.ts`)
- Contrato: `ThreatView`, `RunDto.threat` (`shared/combat.ts`); servidor: `toRunDto`
- Web: `.threat` em `RunPage.tsx` + `rift-map.css`; cabeçalho do boss em `CombatPage.tsx`
- Testes: `game-core/test/rift.test.ts` ("Dungeon Threat"), `rifts.test.ts`

## PvP (teste, D57)

- Motor: `createPvpEncounter`, `CombatState.mode`, `checkEnd` (ramo pvp), `activePartyIds` (jogadores dos dois lados), `resolveRound` (`queueOf` por lado), `partyCombatant(p, side)`
- Corrida: `createPvpRun`, `PVP_ARENA_ID`, `PVP_ARENA_NAME`, `RunMember.team`, `RunState.winner` (`rift/run.ts`)
- Lobbies: `PVP_ARENA_ID`, `PVP_MAX_MEMBERS`, `PVP_TEAM_B_OFFSET`, `LobbyDto.mode` (`shared/social.ts`); `isPvp`, `preferredSlot`, `start` (`lobbies.service.ts`)
- Servidor: `createPvpRun`, `finish` (sem recompensas), `penalise` (sem perda de qualidade), `toRunDto` (estado por equipa; plano da outra equipa escondido)
- Web: cartão "PvP Arena (test)" em `RiftsPage.tsx`; equipas A/B em `LobbyPage.tsx`; `CombatPage.tsx` (`mySide`, "Other team")
- Testes: `game-core/test/combat.test.ts` ("PvP"), `apps/server/test/lobbies.test.ts` ("PvP arena")

## Profissões (D58; Mastery D102–D106, ADR-047, `docs/PROFESSIONS_ARCHITECTURE.md`)

- Conteúdo: `packages/game-core/src/content/professions.ts` (`PROFESSIONS` — 15, atividades com `rank`/`complexity`/`points`; `MASTERY_RANKS`, `MASTERY_RULES`, `rankName`, `MAX_RANK`; ferramentas `ToolType`, `TOOL_TYPE_NAMES`, `TOOL_RULES`; atributos `PROFESSION_ATTRIBUTE_RULES` + `ProfessionDef.attributes`; `RENAMED_PROFESSIONS`; `GATHERING_TERRAIN`; `professionResources`)
- Itens: `content/items.ts` (`MATERIALS`, `TOOLS`, `STARTER_TOOLS`, `ItemDef.tool`, `isStackable`); loja `SHOP_STOCK` (`economy.ts`)
- Regras puras: `packages/game-core/src/professions.ts` (`pointsToNext`, `complexityFactor`, `masteryPoints`, `addMastery`, `attributeBonus`, `toolBonus`, `activityChance`, `repairAmount`, `resolveActivity`)
- Contrato: `packages/shared/src/professions.ts` (`ProfessionDto`, `ActivityDto`, `ActivityResultDto`, `ProfessionProfileDto`); `ItemKind` (`material`, `consumable`, `tool`), `ItemDto.tool`, `ItemDto.quantity` (`api.ts`)
- BD: `character_professions` (`level` = rank 0–5, `xp` = pontos, `attempts`, `successes`, `items_made`; migrações 0009 e 0016); eventos `profession.rank_up`; **TRUNCATE** em `helpers.ts` e `worker.test.ts`
- Servidor: `apps/server/src/modules/professions/` (`professions.service.ts`: rank, ferramentas, atributos BASE, materiais, cooldown, estatísticas, histórico, perfis; `professions.routes.ts`: `/api/characters/:id/professions`, `/:id/professions/profile`, `/by-name/:name/professions/profile`), registado em `app.ts`; ferramentas iniciais em `characters.service.ts`; `ItemDto.tool` em `sheet.service.ts` (`toItemDto`)
- Web: `apps/web/src/features/professions/` (`ProfessionsPage.tsx` com `PROFESSION_SECTIONS`/`RankLadder`, `InspectPage.tsx`, `api.ts`, `professions.css`), rotas `/professions` e `/professions/inspect/:name` (`router.tsx`), link nos amigos (`FriendsPage.tsx`), botão no Hub (`HomePage.tsx`); ícones/tooltip/filtro de ferramentas (`ItemIcon.tsx`, `ItemTooltip.tsx`, `EquipmentTab.tsx`)
- **Profissão/atividade nova:** só dados em `content/professions.ts` (+ item novo em `MATERIALS`/`TOOLS` se precisar); mudar os 15 ids obriga a migração (como a 0016) e a `RENAMED_PROFESSIONS`
- **Tipo de ferramenta novo:** `ToolType`, `TOOL_TYPE_NAMES`, `TOOLS`, `STARTER_TOOLS`?, `BY_TOOL` (`ItemIcon.tsx`)
- Testes: `game-core/test/professions.test.ts`, `game-core/test/world-systems.test.ts`, `apps/server/test/professions.test.ts` (+ `character-sheet`, `city`, `rifts` contam com as ferramentas na mochila), `e2e` ("professions")

## Admin e conteúdo personalizado (pedido #41, ADR-044)

- Quem é admin: variável `ADMIN_EMAILS` (`apps/server/src/config.ts`, `.env.example`, `playwright.config.ts`, `docs/DEPLOY_RAILWAY.md`) → `isAdminEmail`/`requireAdmin` (`apps/server/src/plugins/auth.ts`) → `AccountDto.isAdmin` (`auth.routes.ts`)
- Contrato: `packages/shared/src/admin.ts` (`customItemInputSchema`, `customAbilityInputSchema`, `customAbilityEffectSchema`, `CustomContentDto`, `AdminCharacterDto`, pedidos `adminGrantItemSchema`/`adminUpdateItemSchema`/`adminTeachSkillSchema`/`adminUpdateCharacterSchema`)
- Regras: `packages/game-core/src/content/custom.ts` (registo: `setCustomContent`, `customItemDef`, `customAbilityDef`, `toCustomItemDef`, `toCustomAbilityDef`), `content/custom-rules.ts` (`validateCustomItem`: espaços por tipo, ataque básico primeiro, duas mãos; `validateCustomAbility`; `customIdFor`); ligações em `getItemDef` (`items.ts`) e `getAbility` (`abilities.ts`)
- BD: `custom_content` (migração 0012); cópias em `items` (`source = 'admin'`) e `character_skills`
- Servidor: `apps/server/src/modules/admin/` (`custom-content.service.ts`: carregar/criar/editar + `content.changed`; `admin.service.ts`: ferramentas de personagem + eventos `admin.*`; `admin.routes.ts`: `/api/admin/*` e `GET /api/content/custom`); `app.ts` (carrega o registo no arranque); `sheet.service.ts` (`sheetOf`)
- Tempo real: `ControlMessage` `content.changed` (`packages/server-kit/src/bus.ts`) → `RealtimeGateway.onContentChanged` (`gateway.ts`)
- Web: `apps/web/src/features/admin/` (`api.ts` com `useCustomContent`, `AdminPage.tsx`, `CharacterTools.tsx`, `ItemEditor.tsx`, `AbilityEditor.tsx`, `catalog.ts`, `fields.tsx`, `admin.css`); `auth/guards.tsx` (`RequireAuth` carrega o conteúdo antes dos ecrãs); rota `/admin` em `router.tsx`; link "Admin" em `CharacterSelectPage.tsx`
- Testes: `game-core/test/custom-content.test.ts`, `apps/server/test/admin.test.ts`, `e2e/admin.spec.ts`; TRUNCATE de `custom_content` em `helpers.ts` e `worker.test.ts`
- Docs: `DATABASE.md` (custom_content, eventos `admin.*`), `DECISIONS.md` ADR-044, `ARCHITECTURE.md` §9
- **Tipo de arma novo / espaço novo / tipo de item novo:** rever `validateCustomItem` (`SLOTS_BY_KIND`, `OFFHAND_TYPES`) e os selects de `ItemEditor.tsx`
- **Estado novo (`STATUS_IDS`):** aparece sozinho nos formulários (vêm de `STATUS_IDS`/`STATUS_NAMES`)
