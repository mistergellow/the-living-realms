# Registo de pedidos

Histórico de tudo o que o dono do projeto pediu, com as decisões tomadas e
onde foi implementado. **Entradas mais recentes no fim.** Ver regras em
[`../CLAUDE.md`](../CLAUDE.md).

---

## Decisões de game design já tomadas (pelo dono do projeto)

| #   | Decisão                                                                                                                                                                                                                                                          | Data       | Onde se reflete                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------- |
| D1  | Cada jogador pode ter vários personagens, mas só joga com um de cada vez                                                                                                                                                                                         | 2026-11-17 | `apps/server/src/realtime/gateway.ts` (account.replace), `MAX_CHARACTERS_PER_ACCOUNT`, ADR-012 |
| D2  | Um único mundo, partilhado por todos                                                                                                                                                                                                                             | 2026-11-17 | `worlds` (slug `main`), `world_id` em tudo, ADR-013                                            |
| D3  | Criação de personagem na fase 1: só nome + aparência básica                                                                                                                                                                                                      | 2026-11-17 | `packages/shared/src/api.ts`, `CharacterCreatePage.tsx`, ADR-015                               |
| D4  | Tudo o que é do jogo em inglês (a conversa é em português)                                                                                                                                                                                                       | 2026-11-17 | ADR-014                                                                                        |
| D5  | Mapa do mundo em hexágonos; a distância entre hexágonos custa X AP                                                                                                                                                                                               | 2026-11-17 | `packages/game-core/src/hex.ts`, `characters.hex_q/hex_r`, ADR-011                             |
| D6  | Conta só com email + password, por agora                                                                                                                                                                                                                         | 2026-11-17 | `modules/auth/*`                                                                               |
| D7  | Prioridade: personagem e combate antes do mapa. Rifts = portais para raids; solo ou em lobby; a dificuldade não muda com o nº de jogadores                                                                                                                       | 2026-11-17 | `ROADMAP.md` (Fases 2 e 3)                                                                     |
| D8  | Poder do personagem vem de skills e equipamento. Reputação é uma moeda ganha ao fazer atividades                                                                                                                                                                 | 2026-11-17 | Fase 2                                                                                         |
| D9  | Sem classes: as armas definem como se ataca                                                                                                                                                                                                                      | 2026-11-17 | Fase 2                                                                                         |
| D10 | Atributos: os 6 do D&D (STR, DEX, CON, INT, WIS, CHA)                                                                                                                                                                                                            | 2026-11-17 | Fase 2                                                                                         |
| D11 | Sem limite de skills ("infinitas")                                                                                                                                                                                                                               | 2026-11-17 | Fase 2/3 (ver perguntas em aberto)                                                             |
| D12 | Recursos de combate: HP e Mana, por agora                                                                                                                                                                                                                        | 2026-11-17 | Fase 3                                                                                         |
| D13 | Combate em filas como Darkest Dungeon: 6 posições por lado em 2 filas; vista lateral ao estilo Darkest Dungeon                                                                                                                                                   | 2026-11-17 | Fase 3                                                                                         |
| D14 | PvE: primeiro os jogadores, por ordem de iniciativa, depois os inimigos. PvP: todos declaram as ações ao mesmo tempo, depois resolvem por ordem de iniciativa da equipa                                                                                          | 2026-11-17 | Fase 3 (PvP mais tarde)                                                                        |
| D15 | Energia por turno ao estilo Slay the Spire (sem lhe chamar AP); ações diferentes custam quantidades diferentes                                                                                                                                                   | 2026-11-17 | Fase 3                                                                                         |
| D16 | 60 segundos por turno                                                                                                                                                                                                                                            | 2026-11-17 | Fase 3                                                                                         |
| D17 | Rift = várias salas até ao boss                                                                                                                                                                                                                                  | 2026-11-17 | Fase 3                                                                                         |
| D18 | Lobby até 6 jogadores; a dificuldade não muda (quem vai sozinho fica em desvantagem)                                                                                                                                                                             | 2026-11-17 | Fase 3                                                                                         |
| D19 | Derrota: o equipamento perde qualidade; a 0 parte-se e fica inutilizável                                                                                                                                                                                         | 2026-11-17 | Fases 2/3                                                                                      |
| D20 | Recompensas: drops e reputação                                                                                                                                                                                                                                   | 2026-11-17 | Fase 3                                                                                         |
| D21 | Atributos por point-buy (D&D 5e: 27 pontos, 8–15). Não crescem sozinhos: o equipamento pode dar bónus                                                                                                                                                            | 2026-11-17 | M1                                                                                             |
| D22 | STR = dano físico; DEX = iniciativa, distância, esquiva, crítico; CON = HP e defesa; INT = Mana máxima e feitiços; WIS = cura, resistência, recuperação de Mana; CHA = buffs/debuffs (e comércio/reputação)                                                      | 2026-11-17 | M1 (`game-core/stats`)                                                                         |
| D23 | Todas as skills conhecidas estão disponíveis em combate: as de arma vêm da arma equipada; as outras aprendem-se por drops                                                                                                                                        | 2026-11-17 | M1/M2                                                                                          |
| D24 | Energia por turno chama-se **Focus**; o Focus não gasto passa para o turno seguinte; os feitiços gastam Focus e Mana                                                                                                                                             | 2026-11-17 | M2                                                                                             |
| D25 | Espaços: mão principal, mão secundária, cabeça, corpo, pernas, 2 acessórios                                                                                                                                                                                      | 2026-11-17 | M1                                                                                             |
| D26 | Reputação é por personagem                                                                                                                                                                                                                                       | 2026-11-17 | M1                                                                                             |
| D27 | Sem regra geral de "fila da frente protege": cada ataque define o que atinge (várias filas, fila de trás…); a maioria atinge a primeira. Trocar de posição gasta Focus; trocar com outro jogador gasta aos dois                                                  | 2026-11-17 | M2                                                                                             |
| D28 | A 0 HP o personagem cai; levanta-se com 1 HP se o grupo passar a sala                                                                                                                                                                                            | 2026-11-17 | M2                                                                                             |
| D29 | HP e Mana mantêm-se entre salas                                                                                                                                                                                                                                  | 2026-11-17 | M2                                                                                             |
| D30 | Derrota: −25% de qualidade em todo o equipamento equipado                                                                                                                                                                                                        | 2026-11-17 | M1/M2                                                                                          |
| D31 | Entrada em Rifts: lista por agora. Convites a amigos + lobby público de Rifts. Mais tarde (mapa) conta o AP gasto para chegar ao hexágono do Rift                                                                                                                | 2026-11-17 | M2/M3/Fase 4                                                                                   |
| D32 | Visual dos personagens ao estilo da referência enviada (personagens ilustrados tipo "chibi", com animações; equipamento à volta do personagem no ecrã de herói). Para já, aparência = editar o corpo base; mais tarde o equipamento passa a ver-se no personagem | 2026-11-17 | M2 (renderer em camadas)                                                                       |
| D33 | Atributos: 6 lineares sem "atributos inúteis" (Might, Agility, Precision, Vitality, Arcana, Spirit), base 5 + 12 pontos na criação (máx. 10); o equipamento dá o resto. Armas escalam com 2 atributos; mão principal + secundária combinam habilidades           | 2026-11-17 | Combate 2.0                                                                                    |
| D34 | Defesa passiva com retornos decrescentes (redução = rating ÷ (rating + 50)) + Block ativo que expira no início do próprio turno (estilo Slay the Spire)                                                                                                          | 2026-11-17 | Combate 2.0                                                                                    |
| D35 | Estados: Bleed, Burn, Mark (+25% dano recebido), Weaken (−25% dano), Stun (perde o turno); sinergias entre habilidades                                                                                                                                           | 2026-11-17 | Combate 2.0                                                                                    |
| D36 | O combate é "Slay the Spire sem cartas + Darkest Dungeon": inclui **intenções dos inimigos** visíveis antes do turno dos jogadores                                                                                                                               | 2026-11-17 | Combate 2.0                                                                                    |
| D37 | Sistema de amigos (adicionar amigo) e Rifts com lobby                                                                                                                                                                                                            | 2026-11-18 | M3                                                                                             |
| D38 | **Formação corrigida:** cada lado tem 3 colunas (back, mid, front) × 2 linhas = 6 posições (substitui a interpretação "2 filas de 3" do D13)                                                                                                                     | 2026-11-18 | motor, combate, lobby                                                                          |
| D39 | A coluna mid está a salvo do corpo-a-corpo enquanto houver alguém na front                                                                                                                                                                                       | 2026-11-18 | motor                                                                                          |
| D40 | Há habilidades que atingem tudo                                                                                                                                                                                                                                  | 2026-11-18 | conteúdo                                                                                       |
| D41 | **Nos ataques escolhe-se a coluna, não o alvo**: um ataque contra a front atinge sempre os dois da front (jogadores e inimigos)                                                                                                                                  | 2026-11-18 | motor, conteúdo, ecrã                                                                          |
| D42 | Os inimigos jogam com a formação: ocupam as 3 colunas e/ou, na mesma coluna, um bloqueia e o outro ataca — conforme a dificuldade do Rift                                                                                                                        | 2026-11-18 | IA, conteúdo dos Rifts                                                                         |

## Decisões em aberto / valores provisórios (confirmar com o dono)

| #   | Assunto                                                         | Valor provisório                                                                                                                                                                     | Onde mudar                                               |
| --- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| A1  | Máximo de personagens por conta                                 | 5                                                                                                                                                                                    | `.env` → `MAX_CHARACTERS_PER_ACCOUNT`                    |
| A2  | Nome do mundo                                                   | "The Living Realms" (slug `main`)                                                                                                                                                    | `packages/db/src/seed.ts`, `WORLD_SLUG`                  |
| A3  | Regras de nome do personagem                                    | 3–20 letras; espaços, apóstrofos e hífens                                                                                                                                            | `packages/game-core/src/character.ts`                    |
| A4  | Aparência                                                       | cor (8) + emblema (8), provisória                                                                                                                                                    | ver CHANGE_MAP → "Aparência"                             |
| A5  | Custo de AP por hexágono (o "X")                                | não implementado                                                                                                                                                                     | fase 2                                                   |
| A6  | Ritmo do relógio do mundo                                       | 1 tick a cada 5 s                                                                                                                                                                    | `.env` → `WORLD_TICK_MS`                                 |
| A7  | Hexágono onde nascem os personagens                             | (0,0)                                                                                                                                                                                | `worlds.spawn_q/spawn_r`                                 |
| A8  | Língua da documentação técnica                                  | inglês                                                                                                                                                                               | —                                                        |
| A9  | Alojamento                                                      | Railway (aprovado, a funcionar)                                                                                                                                                      | `infra/railway/*.json`                                   |
| A10 | Fórmulas das estatísticas                                       | HP = 20 + 2×CON; Mana = 10 + 2×INT; Defesa = armadura + mod CON; Iniciativa = mod DEX; Esquiva/Crítico = 5% + 2%×mod DEX (máx. 75%); poderes = mod do atributo                       | `packages/game-core/src/stats.ts` (`STAT_RULES`)         |
| A11 | Conteúdo inicial (armas, armaduras, habilidades, custos, danos) | Espada de treino, arco de caça, cajado de aprendiz; túnica; escudo, gorro, perneiras, 2 acessórios para drops futuros                                                                | `packages/game-core/src/content/*`                       |
| A12 | Kit inicial                                                     | arma escolhida + túnica acolchoada                                                                                                                                                   | `STARTER_WEAPONS`, `STARTER_ARMOR`                       |
| A13 | Personagens antigos                                             | atributos 10 em tudo + espada de treino + túnica                                                                                                                                     | migração `0002_…`                                        |
| A14 | "Atinge a fila da frente"                                       | = a primeira fila **ocupada** (se a da frente estiver vazia, a de trás fica exposta)                                                                                                 | `content/abilities.ts` (M2)                              |
| A15 | Pontos não gastos no point-buy                                  | permitidos                                                                                                                                                                           | `validatePointBuy`                                       |
| A16 | Limite de Focus acumulado                                       | por definir (M2)                                                                                                                                                                     | —                                                        |
| A17 | Inimigos do Rift de teste                                       | placeholders neutros: Rift Husk, Shard Spitter, Hollow Hound, Rift Warden (boss)                                                                                                     | `content/enemies.ts`                                     |
| A18 | Equilíbrio do Rift de teste (simulação, 300 combates)           | solo: espada 31%, arco 20%, cajado 46% de vitórias; grupo de 2–3: ~100%                                                                                                              | `content/abilities.ts`, `content/enemies.ts`             |
| A19 | Abandonar um Rift                                               | conta como derrota (o equipamento perde qualidade), para não se fugir à penalização                                                                                                  | `rifts.service.ts`                                       |
| A20 | Posição inicial no combate                                      | espada na fila da frente; arco e cajado na fila de trás                                                                                                                              | `rifts.service.ts`                                       |
| A21 | Opções do corpo base                                            | tipo de corpo, tom de pele, penteado, cor do cabelo, cor dos olhos, cor da roupa                                                                                                     | `CharacterAvatar`                                        |
| A22 | Arte                                                            | desenhada em código (SVG em camadas) como base provisória; arte profissional substitui as camadas mais tarde                                                                         | ADR-021                                                  |
| A23 | Meta de dificuldade a solo                                      | média: ~40–50% de vitórias; grupos de 2–3 ~100% (simulação: espada+escudo 52%, machado 32%, adagas 68%, arco 56%, cajado 60%, tomo+talismã 26%; média 49%)                           | conteúdo em `game-core/src/content`                      |
| A24 | Armas iniciais                                                  | espada, machado, adaga, arco, cajado, tomo; mão secundária opcional: escudo, talismã ou adaga                                                                                        | `STARTER_WEAPONS`, `STARTER_OFFHANDS`                    |
| A25 | Amigos                                                          | por personagem (adiciona-se pelo nome do personagem); pedido → aceitar/recusar                                                                                                       | `modules/social`                                         |
| A26 | Lobby público                                                   | entra quem quiser até 6; o líder pode expulsar; também há lobbies privados (só por convite)                                                                                          | `lobbies.service.ts`                                     |
| A27 | Jogador desligado a meio do combate                             | o turno passa aos 60 s (sem controlo automático)                                                                                                                                     | `COMBAT_RULES.turnSeconds`                               |
| A28 | Sair de um Rift em grupo                                        | só quem sai sofre a penalização (−25% qualidade); o grupo continua; se for o último, é derrota                                                                                       | `rifts.service.ts`                                       |
| A29 | Atualização em tempo real no lobby/combate                      | o browser pergunta ao servidor a cada ~1,5 s (simples e robusto a esta escala; push por WebSocket fica para mais tarde)                                                              | `features/rifts/api.ts`                                  |
| A30 | Alcance por coluna                                              | corpo-a-corpo = primeira coluna ocupada (front → mid → back); distância/magia = qualquer coluna; Volley = coluna de trás inteira; Cleave/Rift Slam = primeira coluna ocupada inteira | `content/abilities.ts`                                   |
| A31 | Posições iniciais                                               | corpo-a-corpo na front; arco, cajado e tomo na back                                                                                                                                  | `startingSlot`                                           |
| A32 | Habilidades de apoio (curar/proteger um aliado)                 | continuam a escolher a pessoa; só os ataques são por coluna                                                                                                                          | `content/abilities.ts`                                   |
| A33 | Proteção de coluna                                              | escudo: "Shield Wall" (Block para a coluna inteira); inimigo-tanque "Rift Bulwark"                                                                                                   | `content/*`                                              |
| A34 | Ritmo das animações de combate                                  | 650 ms por ação (420 ms com "reduzir movimento"); a fase dos inimigos joga-se ataque a ataque e os controlos esperam pelo fim                                                        | `apps/web/src/features/rifts/combat-scene.ts` (`stepMs`) |

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

### #11 — 2026-11-17 — Server e worker com erro no Railway

**Pedido:** captura do painel: `server` "Crashed", `worker` com "1 Change" por
aplicar.
**Diagnóstico:** o worker tem alterações guardadas mas ainda não aplicadas (é
preciso clicar em Deploy / Apply changes). Para o server, pedidos ao dono os logs
do deploy mais recente (Build Logs e Deploy Logs) e o commit desse deploy.

### #12 — 2026-11-17 — Continua "relation worlds does not exist"

**Pedido:** logs do novo deploy (já com `/app/server.js`, ou seja, com o
Dockerfile).
**Causa:** o Railway não executou o `preDeployCommand` (migrações), por isso as
tabelas continuavam por criar.
**Correção:** o servidor e o worker passam a aplicar as migrações sozinhos ao
arrancar (`migrateWithLock`, com advisory lock do PostgreSQL;
`MIGRATE_ON_START=true` por defeito). O `preDeployCommand` foi removido do
`railway.json`. Testado: base de dados vazia, servidor e worker a arrancar em
simultâneo, ambos arrancam sem erros. ADR-019.

### #13 — 2026-11-17 — Deploy no Railway a funcionar; avançar para a Fase 2

**Pedido:** o jogo está online (o dono vê o mapa); passar à próxima fase.
**Resultado:** Fase 1 fechada (deploy confirmado). Apresentados o plano da
Fase 2 (mapa e movimento) e as decisões de design necessárias.
**Substituído pelo pedido #14** (mudança de prioridade). As perguntas sobre o mapa ficam guardadas para a Fase 4.

### #14 — 2026-11-17 — Nova prioridade: sistema de personagem e combate (Rifts)

**Pedido:** começar pelo sistema de personagem e testar o combate, por ser o
mais importante do jogo. Conceito: **Rifts** são portais que levam a **raids**.
Pode-se entrar **em lobby (grupo) ou sozinho**; **a dificuldade não muda** com o
número de jogadores.
**Resultado:** ROADMAP reordenado: Fase 2 = sistema de personagem; Fase 3 =
combate e Rifts; Fase 4 = mapa e movimento; Fase 5 = social e reputação.
Perguntas de design enviadas ao dono.
**A aguardar:** respostas às perguntas sobre personagem, combate e Rifts.

### #15 — 2026-11-17 — Respostas de design: personagem, combate e Rifts

**Pedido:** respostas às perguntas do pedido #14 (registadas como D8–D20).
**Resultado:** plano das Fases 2 e 3 apresentado em marcos (M1–M4), com as
últimas perguntas em aberto.
**A aguardar:** respostas às perguntas finais e aprovação do plano.

### #16 — 2026-11-17 — Respostas finais; início do M1 (sistema de personagem)

**Pedido:** respostas às últimas perguntas (decisões D21–D31) e luz verde.
**Resultado (M1 concluído):**

- Atributos D&D com point-buy (27 pontos, 8–15), validados no cliente e no servidor.
- Estatísticas derivadas calculadas (fórmulas provisórias A10).
- Itens com qualidade (0 = partido), 7 espaços de equipamento, regras de duas mãos, bónus de atributos.
- As armas dão as habilidades; tabela de skills aprendidas; reputação por personagem.
- Criação com escolha de arma inicial; ficha de personagem (`/characters/:id`) com equipar/desequipar.
- Migrações `0001_character_system` e `0002_starter_kit_for_existing_characters` (testada sobre uma BD com personagens antigos).
- Testes: 17 unitários no game-core, 37 de integração no servidor (9 novos), 5 e2e.
- Docs: CHANGE_MAP (atributos, estatísticas, itens, habilidades, reputação), DATABASE, ARCHITECTURE, ADR-020, ROADMAP.
  **Próximo:** M2 (motor de combate + Rift a solo).

### #17 — 2026-11-17 — "Faz o combate, siga" + referência visual

**Pedido:** avançar com o combate (M2). Durante o trabalho: imagem de referência
de um ecrã de herói (personagem ilustrado ao centro, equipamento à volta,
estatísticas por baixo); personagens com visual e animações parecidos; para já,
editar o corpo base; mais tarde, equipamento visível no personagem.
**Decisões:** D32; valores provisórios A16–A22.
**Resultado (M2 concluído):**

- Motor de combate determinístico no `game-core` (filas 2×3, iniciativa, Focus com acumulação até 6, alvos por fila, troca de posição, IA dos inimigos, salas → boss, reviver com 1 HP, 60 s por turno).
- Rift de teste "Shattered Breach" (3 salas, boss Rift Warden); inimigos e números provisórios (A17/A18).
- Corridas guardadas a cada ação (`rift_runs`, `rift_run_participants`); vitória dá reputação + 1 drop; derrota/abandono tira 25% de qualidade ao equipamento.
- Equipar/desequipar/apagar bloqueados dentro de um Rift (`IN_RIFT`).
- Ecrã de Rifts (lista; "Enter solo"; lobby desativado até ao M3) e ecrã de combate em vista lateral com animações.
- Personagens desenhados em SVG por camadas com corpo base editável (aparência v2); personagens antigos convertidos automaticamente; ficha em formato "herói" com equipamento à volta.
- Testes: 29 unitários no game-core, 46 de integração no servidor, 6 e2e (incluindo um combate no browser).
- Docs: CHANGE_MAP (aparência/arte, combate, inimigos, Rifts), DATABASE, ARCHITECTURE §7, ADR-021, ADR-022, ROADMAP.
  **Próximo:** M3 (lobby até 6 jogadores, convites, lista pública, combate em tempo real entre jogadores).

### #18 — 2026-11-17 — Equilíbrio fraco; substituir os atributos de D&D?

**Pedido:** o equilíbrio está um pouco mau e o dono não gosta muito dos
atributos de D&D; pede uma recomendação "do género, mas melhor".
**Resultado:** apresentado o diagnóstico e três alternativas, com
recomendação (4 atributos lineares + crescimento pelo equipamento + fórmulas de
dano/armadura em percentagem). Sem alterações ao código.
**A aguardar:** escolha do dono e o que sentiu de errado no equilíbrio.

### #19 — 2026-11-17 — Opção C, mas com mais variedade; dúvida sobre armadura em %

**Pedido:** o dono prefere a opção C (atributos + crescimento pelo equipamento),
mas quer mais variedade de builds, e não tem a certeza de que a redução em
percentagem seja a melhor opção.
**Resultado:** proposta apresentada: 6 atributos sem "atributos inúteis", armas
que escalam com 2 atributos, armadura com retornos decrescentes
(armadura/(armadura+K)), Block ativo ao estilo Slay the Spire, estados
(sangrar, queimar, marcar, atordoar…) e, mais tarde, afixos no equipamento e
traços. Sem alterações ao código.
**A aguardar:** aprovação da proposta e respostas sobre o equilíbrio (#18).

### #20 — 2026-11-17 — Avançar com a proposta (Combate 2.0)

**Pedido:** aprovada a proposta do #19. Durante o trabalho: "o combate é quase
suposto ser um Slay the Spire sem cartas + Darkest Dungeon".
**Decisões:** D33–D36; valores provisórios A23–A24 (sem resposta às perguntas
de equilíbrio, usada a dificuldade média).
**Resultado (Combate 2.0):**

- 6 atributos lineares (base 5, 12 pontos, máx. 10); pontos por gastar podem ser distribuídos depois na ficha; personagens existentes convertidos (tudo a 5 + 12 pontos).
- 6 armas iniciais (espada, machado, adaga, arco, cajado, tomo), cada uma a escalar com 2 atributos; mão secundária opcional (escudo, talismã, adaga) cujas habilidades se juntam às da arma.
- Armadura e resistência com retornos decrescentes (rating ÷ (rating + 50)); dano em intervalo; Block que expira no próprio turno; estados Bleed, Burn, Mark, Weaken, Stun com sinergias (ex.: Backstab ×1,6 contra alvos a sangrar).
- Intenções dos inimigos visíveis antes do turno dos jogadores (agrupadas, ex.: "4–6 ×3 → alvo").
- Equilíbrio por simulação: média a solo 49%, todas as armas entre 26% e 68% (A23).
- Bug encontrado pelos testes e corrigido: habilidades só para o próprio (ex.: Raise Shield) passavam a pedir um alvo.
- Testes: 37 unitários no game-core, 48 de integração no servidor, 6 e2e.
- Docs: CHANGE_MAP (atributos, estatísticas, itens, estados/Block/intenções), DATABASE, ARCHITECTURE §7, ADR-023, ADR-024, ROADMAP.
  **Próximo:** M3 (lobby até 6 jogadores) — perguntas pendentes no pedido #17.

### #21 — 2026-11-18 — "O que fazer agora?"

**Pedido:** orientação sobre o próximo passo.
**Resultado:** recomendado: (1) testar a versão online com uma lista de
verificação e dar feedback sobre a sensação do combate e o equilíbrio;
(2) responder às 3 perguntas do lobby para avançar com o M3. Alternativas
apresentadas: mais conteúdo (Rifts/inimigos), direção de arte, mapa (Fase 4).

### #22 — 2026-11-18 — Amigos e lobby de Rifts (M3)

**Pedido:** "faz já a cena de adicionar amigo e fazer o Rift dar para fazer lobby".
**Decisões:** D37; valores provisórios A25–A29 (perguntas do lobby sem resposta
explícita).
**Resultado (M3 concluído):**

- Amigos: pedir pelo nome do personagem, aceitar/recusar/cancelar/remover, estado online, contador de pedidos no ecrã do mundo (`/friends`).
- Lobbies até 6: público ou privado, convidar amigos, convites na página de Rifts, escolher/trocar posição na formação, "pronto", expulsar, a liderança passa se o líder sair, o líder inicia o Rift para todos.
- Combate em grupo: iniciativa entre todos os jogadores, "Waiting for X…", sair a meio só penaliza quem sai e o grupo continua.
- Problema encontrado pelo teste com 2 browsers e corrigido: durante o próprio turno o ecrã não se atualizava (não se via um colega sair).
- Testes: 39 unitários no game-core, 58 de integração no servidor, 7 e2e (incluindo 2 jogadores em simultâneo).
- Docs: CHANGE_MAP (amigos, lobbies, combate em grupo), DATABASE, ARCHITECTURE §7, ADR-025, ADR-026, ROADMAP.

### #23 — 2026-11-18 — Posicionamento errado: é 3 × 2

**Pedido:** "os posicionamentos estão mal: é 3 × 2 — duas linhas, três
colunas: back, mid e frontline".
**Decisões:** D38; valores provisórios A30–A31.
**Resultado:**

- Motor: posições 0–1 front, 2–3 mid, 4–5 back; alcance "primeira coluna ocupada" / "qualquer posição" / colunas específicas; habilidades de coluna atingem as 2 linhas.
- Inimigos reposicionados (sala 2 com o Shard Spitter na coluna mid); jogadores começam na front (corpo-a-corpo) ou na back (distância/magia).
- Ecrãs de combate e de lobby com 3 colunas × 2 linhas; intenções iguais agrupadas para não se sobreporem; registo de combate com as últimas 40 linhas; quem sai aparece com "(left)".
- Equilíbrio inalterado na simulação (média a solo ~49%).
- Testes: 40 unitários no game-core, 58 de integração, 7 e2e (corridos 2× seguidas).
- Docs: CHANGE_MAP ("Formação / posições"), ARCHITECTURE §7, ADR-027, ROADMAP, CLAUDE.md.

### #24 — 2026-11-18 — Ataques por coluna; inimigos jogam com a formação

**Pedido:** (1) sim, a mid está a salvo; (2) há habilidades que atingem tudo;
"no ataque não escolhemos alvos, escolhemos linhas — um ataque contra o da
frente atinge sempre os dois da frente"; os inimigos devem jogar com isso
(ocupar as 3 colunas e/ou, na mesma coluna, 1 bloqueia e outro ataca),
conforme a dificuldade do Rift.
**Decisões:** D39–D42; valores provisórios A32–A33.
**Resultado:**

- Motor: todos os ataques escolhem uma coluna e atingem as 2 unidades dessa coluna; o apoio a aliados continua a escolher a pessoa; Volley passa a atingir todos os inimigos.
- IA: os inimigos escolhem a coluna com mais valor; um tanque valoriza Block quando partilha a coluna; intenções mostram a coluna ("→ front column (A, B)").
- Conteúdo: novo inimigo **Rift Bulwark** (bloqueia a coluna); salas redesenhadas com formação (bloqueador + atacante na front, inimigos espalhados por front/mid/back); escudo com **Shield Wall** (Block para uma coluna de aliados).
- Ecrã: ao escolher um ataque, passar o rato acende a coluna inteira; se só houver uma coluna ao alcance, o ataque sai logo.
- Equilíbrio refeito (corpo-a-corpo mais forte, distância/magia mais fraca): média a solo 46%, todas as armas entre 31% e 63%.
- Simulador guardado no projeto: `pnpm sim` (`scripts/simulate-balance.ts`).
- Testes: 42 unitários no game-core, 58 de integração, 7 e2e.
- Docs: CHANGE_MAP, ARCHITECTURE §7, ADR-028, ROADMAP, CLAUDE.md.

### #25 — 2026-11-18 — "Dá full commit para eu experimentar"

**Pedido:** garantir que tudo está commitado para testar.
**Resultado:** confirmado: sem alterações pendentes; `main` no GitHub = commit
`7d8fa39` (ataques por coluna) com CI verde. O Railway publica a partir do `main`.

### #26 — 2026-11-18 — Servidor a crashar no Railway ("Can't find meta/_journal.json")

**Pedido:** logs do Railway com o servidor a reiniciar em ciclo.
**Causa:** o mesmo do #10. O Railway não usou o Dockerfile: construiu o
projeto sozinho e correu `pnpm start` (`node apps/server/dist/main.js`). Nesse
modo, o código procurava as migrações em `apps/server/migrations`, que não
existe.
**Correção (rede de segurança no código):** `findMigrationsDir`
(`packages/db/src/client.ts`) procura as migrações nos sítios possíveis (variável
`MIGRATIONS_DIR` da imagem Docker, ao lado do código, `packages/db/migrations`
do repositório) e, se não as encontrar, diz onde procurou. Em produção, o
servidor também encontra sozinho o site (`apps/web/dist`) quando não há
`WEB_DIST_DIR` (`findWebDist` em `apps/server/src/app.ts`). Testado a imitar o
Railway: base de dados vazia, `pnpm start` e `pnpm start:worker` arrancam,
aplicam as migrações e servem o jogo.
**Para o dono:** confirmar no Railway que o serviço `server` usa o Dockerfile
(Settings → Build → Builder = Dockerfile; Railway Config File vazio ou
`/railway.json`). Ver `docs/DEPLOY_RAILWAY.md`.

### #27 — 2026-11-18 — Usar Phaser? → PixiJS para o combate e o mapa

**Pedido:** o ChatGPT tinha sugerido fazer parte do jogo em Phaser; o jogo
"parece quase browser". Depois de explicada a situação (tudo era React +
DOM/SVG; o ADR-002 já previa PixiJS para o combate), o dono aprovou a
recomendação: **PixiJS para o combate e para o mapa do mundo**, React para os
menus e painéis.
**Decisões técnicas:** ADR-029 (PixiJS em vez de Phaser; arte SVG
rasterizada em texturas; botões DOM por cima do canvas). Valor provisório A34.
**Resultado:**

- Infraestrutura Pixi partilhada em `apps/web/src/features/render/` (arranque
  preguiçoso — o Pixi só é descarregado no mapa e no combate —, SVG → textura,
  hook React, compatível com a CSP sem `unsafe-eval`).
- Combate (`rifts/combat-scene.ts`): cenário animado (céu, montanhas, o Rift a
  pulsar, partículas), personagens em camadas (corpo, arma, cabeça) a respirar
  e a piscar os olhos, investidas corpo a corpo, setas/estilhaços/orbes,
  faíscas, tremor de ecrã nos críticos, números a flutuar, quedas e reviver,
  barras de vida animadas. A fase dos inimigos joga-se ataque a ataque; o
  registo de texto, os controlos e os ecrãs de resultado esperam pela animação.
  Cliques e teclado continuam em botões reais por cima do canvas
  (`CombatStage.tsx`); sem WebGL, mostra a arte SVG antiga.
- Mapa (`world/map-scene.ts`): hexágonos desenhados em canvas, arrastar para
  mover, roda/pinça/botões/teclas para zoom, centrar em mim, token animado do
  jogador, névoa; a legenda mostra o hexágono por baixo do rato.
- `game-core`: `pixelToHex` / `hexRound` (clicar num hexágono).
- Testes: unitários do layout, da timeline e da câmara; e2e atualizado (o turno
  dos inimigos agora demora a jogar-se; fecho de páginas abertas entre testes).
- Docs: CHANGE_MAP (renderer canvas, aparência, mapa, combate), ADR-029,
  ADR-002/021 (notas), ARCHITECTURE §7–§9, ROADMAP.
- Integrado com o Combate 2.0 (#20): Block, estados, dano por estado e
  atordoado têm animação própria; as intenções dos inimigos e os chips de
  Block/estados ficam em HTML por cima do canvas; armas novas e mão
  secundária (escudo, talismã, adaga) como camadas animadas.

### #28 — 2026-11-18 — "Faz o update total"

**Pedido:** o jogo online ainda mostrava o mapa antigo (o PR do Pixi não
estava no `main`); pôr tudo atualizado.
**Resultado:** o ramo do Pixi recebeu o `main` mais recente (lobbies e amigos,
formação 3 × 2 do D38, ataques por coluna do D41) e a correção do Railway
(#26). O combate em Pixi segue a nova formação: frente, meio e trás a partir
do centro, com a linha de cima recuada para se poder clicar nas duas unidades
de cada coluna. Nos ataques por coluna, o rato sobre uma unidade destaca a
coluna inteira. O ADR do Pixi passou a ADR-029 e o pedido a #27.
