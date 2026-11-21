# Mapa de impacto — Plataforma (BD, erros, env, rotas, módulos, deploy)

Ver regras e ordem de alteração em [`../CHANGE_MAP.md`](../CHANGE_MAP.md).

## Código de erro (adicionar)

- `packages/shared/src/errors.ts` (`ErrorCode`)
- Onde é lançado (`new AppError(...)` no serviço)
- Web: tratar em `apps/web/src/lib/api.ts` / no ecrã, se precisar de comportamento próprio
- Testes do módulo

## Tabela ou coluna nova na base de dados

1. `packages/db/src/schema.ts`
2. `pnpm db:generate` → rever o SQL em `packages/db/migrations/` → `pnpm db:migrate`
3. Repositório e serviço do módulo; DTO em `packages/shared/src/api.ts` se for exposta
4. `apps/server/test/helpers.ts` → `resetState` (TRUNCATE) e `apps/worker/test/worker.test.ts` (TRUNCATE)
5. `docs/DATABASE.md`

## Variável de ambiente

- Validação: `apps/server/src/config.ts` e/ou `apps/worker/src/config.ts`
- `.env.example` (com comentário) e o `.env` local
- `infra/docker-compose.prod.yml`, `.github/workflows/ci.yml`, `playwright.config.ts` (se for relevante nesses ambientes)
- `apps/server/test/helpers.ts` (valores de teste)
- **Railway (produção):** as variáveis vivem no painel do Railway, não no código. Atualizar a lista em `docs/DEPLOY_RAILWAY.md` e avisar o dono para a acrescentar no serviço certo (`server` e/ou `worker`)

## Ecrã / rota nova no frontend

- `apps/web/src/app/router.tsx` (+ comentário com o mapa de rotas)
- Ecrã de jogo (com barra de topo/navegação e ligação ao mundo): pôr a rota dentro do `GameShell` no router e renderizar só o conteúdo (`<div className="screen-body">` ou posição absoluta em `.game-main`); acrescentar à `BottomNav` (`features/game/GameShell.tsx`) se for um destino principal
- Pasta `apps/web/src/features/<feature>/`
- Estilos: ficheiro `.css` junto da feature, importado pela página; estilos partilhados por vários ecrãs em `apps/web/src/styles/` (ver `global.css`)
- e2e em `e2e/`; Docs: `docs/ARCHITECTURE.md` §9

## Módulo de servidor novo (ex.: combat, economy)

- `apps/server/src/modules/<domínio>/{routes,service,repository}.ts`
- Registar em `apps/server/src/app.ts`
- Contratos em `packages/shared`, regras em `packages/game-core`
- Testes em `apps/server/test/<domínio>.test.ts`; `docs/ROADMAP.md`, `docs/adr/` se houver decisão

## Deploy / produção (Railway)

- Imagem: `infra/Dockerfile` (um passo novo de build ou um ficheiro novo no runtime têm de ser acrescentados aqui)
- Configuração por serviço: `railway.json` (raiz; serviço `server`), `infra/railway/worker.json` (serviço `worker`) (comando de arranque, migrações antes do deploy, health check, `watchPatterns`)
- Pasta nova em `apps/` ou `packages/`: acrescentar aos `watchPatterns` de `railway.json` e `infra/railway/worker.json` e um `COPY …/package.json` no Dockerfile
- Guia do dono: `docs/DEPLOY_RAILWAY.md`; arquitetura: `docs/ARCHITECTURE.md` → Deployment; decisão: ADR-018
- Migrações no arranque: `packages/db/src/client.ts` (`migrateWithLock`), `apps/server/src/main.ts`, `apps/worker/src/main.ts`, variável `MIGRATE_ON_START` (ADR-019)
- Onde estão as migrações e o site em produção: `findMigrationsDir` (`packages/db/src/client.ts`) e `findWebDist` (`apps/server/src/app.ts`). Funcionam com o Dockerfile (`MIGRATIONS_DIR`, `WEB_DIST_DIR`) e também se o Railway construir sozinho e correr `pnpm start` (pedido #26). **Mudar a estrutura de pastas** → rever as listas de caminhos nestas duas funções
- Ligação ao Redis: `packages/server-kit/src/redis.ts` (`family: 0`, necessário para IPv6)
