# Mapa de impacto — Personagem

Ver regras e ordem de alteração em [`../CHANGE_MAP.md`](../CHANGE_MAP.md).

## Personagem (character) — campos, criação, listagem, apagar

- Contrato: `packages/shared/src/api.ts` (`CharacterDto`, `createCharacterRequestSchema`, `CharacterListResponse`, `CharacterSheetDto`)
- Regras: `packages/game-core/src/character.ts` (validação e normalização do nome)
- BD: `schema.ts` → `characters` (índice único `characters_world_name_uq`) + migração
- Servidor: `apps/server/src/modules/characters/characters.repository.ts`, `characters.service.ts` (`toCharacterDto`, limite, eventos), `characters.routes.ts`
- Tempo real: `gateway.ts` → `enterWorld` (constrói `PresencePlayer` a partir do personagem)
- Web: `apps/web/src/features/characters/api.ts`, `CharacterSelectPage.tsx`, `CharacterCreatePage.tsx`, `CharacterSheetPage.tsx` (rota `/characters/:id`), `active-character.ts`
- Testes: `apps/server/test/characters.test.ts`, `helpers.ts` (`createCharacter`), `game-core/test/character.test.ts`, `apps/web/test/world-state.test.ts` (fixture `self`), `e2e/foundation.spec.ts`
- Docs: `docs/DATABASE.md` → characters, `docs/adr/` ADR-015

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
- Usos no DOM: `CharacterToken.tsx` (retrato), `AppearanceEditor.tsx` + `CharacterCreatePage.tsx` (editor), `CharacterSheetPage.tsx` (herói), `combat/CombatStage.tsx` (só sem WebGL)
- Usos no canvas (PixiJS): `apps/web/src/features/render/avatar-textures.tsx` transforma as camadas em texturas (`part`: `base`/`weapon`/`head` + `eyesClosed`; âncoras usadas em `combat/combat-scene.ts` → `UnitView`). **Camada nova** (ex.: equipamento) → acrescentar a `AvatarPart`, a `characterTextures` e ao `UnitView` (a mão secundária já é a camada `offhand`); retrato do mapa → `portraitTexture` (`world/map-scene.ts`)
- Presença: `PresencePlayer.appearance` (`protocol.ts`)
- Testes: `helpers.ts` (v1, compatibilidade), `server-kit/test/presence.test.ts`, `web/test/world-state.test.ts`, `e2e` (botões "Hair style …")
- Futuro (D32): camadas de equipamento por cima do corpo base, no mesmo `CharacterAvatar`
