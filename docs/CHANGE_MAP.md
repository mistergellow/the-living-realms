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

- Contrato: `packages/shared/src/api.ts` (`CharacterDto`, `createCharacterRequestSchema`, `CharacterListResponse`)
- Regras: `packages/game-core/src/character.ts` (validação e normalização do nome)
- BD: `schema.ts` → `characters` (índice único `characters_world_name_uq`) + migração
- Servidor: `apps/server/src/modules/characters/characters.repository.ts`, `characters.service.ts` (`toCharacterDto`, limite, eventos), `characters.routes.ts`
- Tempo real: `gateway.ts` → `enterWorld` (constrói `PresencePlayer` a partir do personagem)
- Web: `apps/web/src/features/characters/api.ts`, `CharacterSelectPage.tsx`, `CharacterCreatePage.tsx`, `active-character.ts`
- Testes: `apps/server/test/characters.test.ts`, `helpers.ts` (`createCharacter`), `game-core/test/character.test.ts`, `apps/web/test/world-state.test.ts` (fixture `self`), `e2e/foundation.spec.ts`
- Docs: `DATABASE.md` → characters, `DECISIONS.md` ADR-015

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

## Aparência do personagem

- Contrato: `packages/shared/src/api.ts` (`APPEARANCE_COLORS`, `APPEARANCE_EMBLEMS`, `characterAppearanceSchema`, `version`)
- BD: `characters.appearance` (JSONB) — ao mudar a forma, **subir `version`** e prever a conversão dos personagens existentes
- Web: `CharacterToken.tsx` (desenho dos emblemas, `EMBLEM_PATHS`), `CharacterCreatePage.tsx` (escolha), `HexMap.tsx`, `WorldPage.tsx`, `CharacterSelectPage.tsx`
- Presença: `packages/shared/src/protocol.ts` (`PresencePlayer.appearance`)
- Testes: `helpers.ts` (`appearance`), `characters.test.ts`, `server-kit/test/presence.test.ts`, `web/test/world-state.test.ts`, `e2e` (botão "Emblem star")

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

## Deploy / produção (Railway)

- Imagem: `infra/Dockerfile` (um passo novo de build ou um ficheiro novo no runtime têm de ser acrescentados aqui)
- Configuração por serviço: `infra/railway/server.json`, `infra/railway/worker.json` (comando de arranque, migrações antes do deploy, health check, `watchPatterns`)
- Pasta nova em `apps/` ou `packages/`: acrescentar aos `watchPatterns` dos dois JSON e um `COPY …/package.json` no Dockerfile
- Guia do dono: `docs/DEPLOY_RAILWAY.md`; arquitetura: `ARCHITECTURE.md` → Deployment; decisão: ADR-018
- Ligação ao Redis: `packages/server-kit/src/redis.ts` (`family: 0`, necessário para IPv6)
