# Registo de pedidos

Histórico de tudo o que o dono do projeto pediu, com as decisões tomadas e
onde foi implementado. **Entradas mais recentes no fim.** Ver regras em
[`../CLAUDE.md`](../CLAUDE.md).

---

## Decisões de game design já tomadas (pelo dono do projeto)

| #   | Decisão                                                                  | Data       | Onde se reflete                                                                                |
| --- | ------------------------------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------- |
| D1  | Cada jogador pode ter vários personagens, mas só joga com um de cada vez | 2026-11-17 | `apps/server/src/realtime/gateway.ts` (account.replace), `MAX_CHARACTERS_PER_ACCOUNT`, ADR-012 |
| D2  | Um único mundo, partilhado por todos                                     | 2026-11-17 | `worlds` (slug `main`), `world_id` em tudo, ADR-013                                            |
| D3  | Criação de personagem na fase 1: só nome + aparência básica              | 2026-11-17 | `packages/shared/src/api.ts`, `CharacterCreatePage.tsx`, ADR-015                               |
| D4  | Tudo o que é do jogo em inglês (a conversa é em português)               | 2026-11-17 | ADR-014                                                                                        |
| D5  | Mapa do mundo em hexágonos; a distância entre hexágonos custa X AP       | 2026-11-17 | `packages/game-core/src/hex.ts`, `characters.hex_q/hex_r`, ADR-011                             |
| D6  | Conta só com email + password, por agora                                 | 2026-11-17 | `modules/auth/*`                                                                               |

## Decisões em aberto / valores provisórios (confirmar com o dono)

| #   | Assunto                             | Valor provisório                          | Onde mudar                              |
| --- | ----------------------------------- | ----------------------------------------- | --------------------------------------- |
| A1  | Máximo de personagens por conta     | 5                                         | `.env` → `MAX_CHARACTERS_PER_ACCOUNT`   |
| A2  | Nome do mundo                       | "The Living Realms" (slug `main`)         | `packages/db/src/seed.ts`, `WORLD_SLUG` |
| A3  | Regras de nome do personagem        | 3–20 letras; espaços, apóstrofos e hífens | `packages/game-core/src/character.ts`   |
| A4  | Aparência                           | cor (8) + emblema (8), provisória         | ver CHANGE_MAP → "Aparência"            |
| A5  | Custo de AP por hexágono (o "X")    | não implementado                          | fase 2                                  |
| A6  | Ritmo do relógio do mundo           | 1 tick a cada 5 s                         | `.env` → `WORLD_TICK_MS`                |
| A7  | Hexágono onde nascem os personagens | (0,0)                                     | `worlds.spawn_q/spawn_r`                |
| A8  | Língua da documentação técnica      | inglês                                    | —                                       |
| A9  | Alojamento                          | Railway (aprovado)                        | `infra/railway/*.json`                  |

---

## Histórico

### #1 — 2026-11-17 — Fase 1: fundação e arquitetura

**Pedido:** analisar o ambiente e propor a stack, a arquitetura, os riscos e o
plano; implementar só a fundação técnica (registo, login, criação de
personagens, interface inicial, testes de infraestrutura), sem mecânicas de jogo.
**Resultado:** monorepo completo (ver `ROADMAP.md` → Fase 1). 43 testes
unitários e de integração e 4 testes e2e a passar.
**Ficheiros:** projeto inteiro; documentação em `README.md`, `ARCHITECTURE.md`,
`DATABASE.md`, `DECISIONS.md`, `ROADMAP.md`.

### #2 — 2026-11-17 — Respostas às perguntas de design

**Pedido:** respostas D1–D6 (ver tabela acima).

### #3 — 2026-11-17 — Memória do projeto e mapa de impacto

**Pedido:** registar tudo o que é pedido num ficheiro, para consulta futura, e
manter um ficheiro com o que está associado a cada item, para que uma alteração
atualize rapidamente tudo o que está ligado.
**Resultado:** `CLAUDE.md` (lido automaticamente em cada sessão, com as regras
de trabalho), `docs/REQUESTS.md` (este ficheiro), `docs/CHANGE_MAP.md` (mapa de
impacto por conceito).

### #4 — 2026-11-17 — Guardar o código no GitHub

**Pedido:** onde colocar o código; o dono criou o repositório
`mistergellow/the-living-realms`.
**Resultado:** primeiro commit ("Phase 1: technical foundation") enviado para o
ramo `main` do GitHub. A partir daqui, cada sessão nova começa por clonar este
repositório. O `CLAUDE.md` é lido automaticamente e aponta para este registo e
para o mapa de impacto.

### #5 — 2026-11-17 — Abrir o projeto no Visual Studio Code

**Pedido:** como começar com o editor aberto no computador.
**Resultado:** guia passo a passo (clonar no VS Code, instalar requisitos,
arrancar). Sem alterações ao código.

### #6 — 2026-11-17 — Instalação do Docker Desktop falhou (Windows)

**Pedido:** o que é o Docker e para que serve; a instalação falhou porque a
funcionalidade "Virtual Machine Platform" do Windows não está ativa.
**Resultado:** explicação e solução (`wsl --install` numa PowerShell de
administrador, reiniciar, voltar a instalar). Alternativa sem Docker:
PostgreSQL e Redis na cloud, mudando só `DATABASE_URL` e `REDIS_URL` no `.env`.
Sem alterações ao código.

### #7 — 2026-11-17 — Publicar online em vez de usar o Docker localmente

**Pedido:** em vez do Docker, pôr o jogo já num serviço como a Cloudflare.
**Resultado:** análise apresentada. A Cloudflare (Workers/Pages) não corre o
servidor Node.js com WebSockets nem o worker sem reescrever o backend.
Recomendação: Railway (frontend + API + worker + PostgreSQL + Redis, deploy
automático a partir do GitHub), com a Cloudflare opcional mais tarde à frente
(domínio/DNS/proteção). **Aprovado no pedido #8.**

### #8 — 2026-11-17 — Railway aprovado; o dono já tem conta

**Pedido:** avançar com o Railway.
**Resultado:** configuração por serviço em `infra/railway/server.json` e
`infra/railway/worker.json`; a imagem define `WEB_DIST_DIR`; o cliente Redis
aceita IPv6 (`family: 0`). Guia de cliques em `docs/DEPLOY_RAILWAY.md`. A
imagem de produção foi simulada sem Docker (migrações numa BD vazia, servidor,
worker, registo e personagem) e funciona. ADR-018; ARCHITECTURE → Deployment;
CHANGE_MAP → "Deploy / produção".
**Pendente:** o dono segue o guia; primeiro deploy real por confirmar.

### #9 — 2026-11-17 — Railway não mostra o repositório

**Pedido:** ao criar o serviço a partir do GitHub, o Railway diz "No
repositories found".
**Resultado:** a GitHub App do Railway ainda não tinha acesso ao repositório.
Passos dados ao dono: Configure GitHub App → dar acesso a
`the-living-realms` → Save → Refresh. Sem alterações ao código.

### #10 — 2026-11-17 — Servidor a crashar no Railway ("relation worlds does not exist")

**Pedido:** o serviço `server` crashava em ciclo.
**Causa:** o Railway não aplicou o ficheiro de configuração indicado no painel.
Detetou o projeto sozinho (Railpack), correu `pnpm start` sem o Dockerfile e
sem o passo de migrações, por isso as tabelas não existiam. A ligação à base de
dados funcionava.
**Correção:** a configuração do servidor passou a ser o `railway.json` na raiz
do repositório, que o Railway lê sempre automaticamente (antes era
`infra/railway/server.json`). O worker continua com
`/infra/railway/worker.json`, que tem de ser indicado no painel. Guia, ARCHITECTURE
e CHANGE_MAP atualizados.
**Lição:** confirmar sempre nos logs a mensagem de arranque esperada (ver
`docs/DEPLOY_RAILWAY.md` → Verificar).
