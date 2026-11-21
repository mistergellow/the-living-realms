# Registo de pedidos

Histórico de tudo o que o dono do projeto pediu, com as decisões tomadas e
onde foi implementado. **Entradas mais recentes no fim.** Ver regras em
[`../CLAUDE.md`](../CLAUDE.md).

---

## Decisões de game design já tomadas (pelo dono do projeto)

| #   | Decisão                                                                                                                                                                                                                                                              | Data       | Onde se reflete                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| D1  | Cada jogador pode ter vários personagens, mas só joga com um de cada vez                                                                                                                                                                                             | 2026-11-17 | `apps/server/src/realtime/gateway.ts` (account.replace), `MAX_CHARACTERS_PER_ACCOUNT`, ADR-012        |
| D2  | Um único mundo, partilhado por todos                                                                                                                                                                                                                                 | 2026-11-17 | `worlds` (slug `main`), `world_id` em tudo, ADR-013                                                   |
| D3  | Criação de personagem na fase 1: só nome + aparência básica                                                                                                                                                                                                          | 2026-11-17 | `packages/shared/src/api.ts`, `CharacterCreatePage.tsx`, ADR-015                                      |
| D4  | Tudo o que é do jogo em inglês (a conversa é em português)                                                                                                                                                                                                           | 2026-11-17 | ADR-014                                                                                               |
| D5  | Mapa do mundo em hexágonos; a distância entre hexágonos custa X AP                                                                                                                                                                                                   | 2026-11-17 | `packages/game-core/src/hex.ts`, `characters.hex_q/hex_r`, ADR-011                                    |
| D6  | Conta só com email + password, por agora                                                                                                                                                                                                                             | 2026-11-17 | `modules/auth/*`                                                                                      |
| D7  | Prioridade: personagem e combate antes do mapa. Rifts = portais para raids; solo ou em lobby; a dificuldade não muda com o nº de jogadores                                                                                                                           | 2026-11-17 | `ROADMAP.md` (Fases 2 e 3)                                                                            |
| D8  | Poder do personagem vem de skills e equipamento. Reputação é uma moeda ganha ao fazer atividades                                                                                                                                                                     | 2026-11-17 | Fase 2                                                                                                |
| D9  | Sem classes: as armas definem como se ataca                                                                                                                                                                                                                          | 2026-11-17 | Fase 2                                                                                                |
| D10 | Atributos: os 6 do D&D (STR, DEX, CON, INT, WIS, CHA)                                                                                                                                                                                                                | 2026-11-17 | Fase 2                                                                                                |
| D11 | Sem limite de skills ("infinitas")                                                                                                                                                                                                                                   | 2026-11-17 | Fase 2/3 (ver perguntas em aberto)                                                                    |
| D12 | Recursos de combate: HP e Mana, por agora                                                                                                                                                                                                                            | 2026-11-17 | Fase 3                                                                                                |
| D13 | Combate em filas como Darkest Dungeon: 6 posições por lado em 2 filas; vista lateral ao estilo Darkest Dungeon                                                                                                                                                       | 2026-11-17 | Fase 3                                                                                                |
| D14 | PvE: primeiro os jogadores, por ordem de iniciativa, depois os inimigos. PvP: todos declaram as ações ao mesmo tempo, depois resolvem por ordem de iniciativa da equipa                                                                                              | 2026-11-17 | Fase 3 (PvP mais tarde)                                                                               |
| D15 | Energia por turno ao estilo Slay the Spire (sem lhe chamar AP); ações diferentes custam quantidades diferentes                                                                                                                                                       | 2026-11-17 | Fase 3                                                                                                |
| D16 | 60 segundos por turno                                                                                                                                                                                                                                                | 2026-11-17 | Fase 3                                                                                                |
| D17 | Rift = várias salas até ao boss                                                                                                                                                                                                                                      | 2026-11-17 | Fase 3                                                                                                |
| D18 | Lobby até 6 jogadores; a dificuldade não muda (quem vai sozinho fica em desvantagem)                                                                                                                                                                                 | 2026-11-17 | Fase 3                                                                                                |
| D19 | Derrota: o equipamento perde qualidade; a 0 parte-se e fica inutilizável                                                                                                                                                                                             | 2026-11-17 | Fases 2/3                                                                                             |
| D20 | Recompensas: drops e reputação                                                                                                                                                                                                                                       | 2026-11-17 | Fase 3                                                                                                |
| D21 | Atributos por point-buy (D&D 5e: 27 pontos, 8–15). Não crescem sozinhos: o equipamento pode dar bónus                                                                                                                                                                | 2026-11-17 | M1                                                                                                    |
| D22 | STR = dano físico; DEX = iniciativa, distância, esquiva, crítico; CON = HP e defesa; INT = Mana máxima e feitiços; WIS = cura, resistência, recuperação de Mana; CHA = buffs/debuffs (e comércio/reputação)                                                          | 2026-11-17 | M1 (`game-core/stats`)                                                                                |
| D23 | Todas as skills conhecidas estão disponíveis em combate: as de arma vêm da arma equipada; as outras aprendem-se por drops                                                                                                                                            | 2026-11-17 | M1/M2                                                                                                 |
| D24 | Energia por turno chama-se **Focus**; o Focus não gasto passa para o turno seguinte; os feitiços gastam Focus e Mana                                                                                                                                                 | 2026-11-17 | M2                                                                                                    |
| D25 | Espaços: mão principal, mão secundária, cabeça, corpo, pernas, 2 acessórios                                                                                                                                                                                          | 2026-11-17 | M1                                                                                                    |
| D26 | Reputação é por personagem                                                                                                                                                                                                                                           | 2026-11-17 | M1                                                                                                    |
| D27 | Sem regra geral de "fila da frente protege": cada ataque define o que atinge (várias filas, fila de trás…); a maioria atinge a primeira. Trocar de posição gasta Focus; trocar com outro jogador gasta aos dois                                                      | 2026-11-17 | M2                                                                                                    |
| D28 | A 0 HP o personagem cai; levanta-se com 1 HP se o grupo passar a sala                                                                                                                                                                                                | 2026-11-17 | M2                                                                                                    |
| D29 | HP e Mana mantêm-se entre salas                                                                                                                                                                                                                                      | 2026-11-17 | M2                                                                                                    |
| D30 | Derrota: −25% de qualidade em todo o equipamento equipado                                                                                                                                                                                                            | 2026-11-17 | M1/M2                                                                                                 |
| D31 | Entrada em Rifts: lista por agora. Convites a amigos + lobby público de Rifts. Mais tarde (mapa) conta o AP gasto para chegar ao hexágono do Rift                                                                                                                    | 2026-11-17 | M2/M3/Fase 4                                                                                          |
| D32 | Visual dos personagens ao estilo da referência enviada (personagens ilustrados tipo "chibi", com animações; equipamento à volta do personagem no ecrã de herói). Para já, aparência = editar o corpo base; mais tarde o equipamento passa a ver-se no personagem     | 2026-11-17 | M2 (renderer em camadas)                                                                              |
| D33 | Atributos: 6 lineares sem "atributos inúteis" (Might, Agility, Precision, Vitality, Arcana, Spirit), base 5 + 12 pontos na criação (máx. 10); o equipamento dá o resto. Armas escalam com 2 atributos; mão principal + secundária combinam habilidades               | 2026-11-17 | Combate 2.0                                                                                           |
| D34 | Defesa passiva com retornos decrescentes (redução = rating ÷ (rating + 50)) + Block ativo que expira no início do próprio turno (estilo Slay the Spire)                                                                                                              | 2026-11-17 | Combate 2.0                                                                                           |
| D35 | Estados: Bleed, Burn, Mark (+25% dano recebido), Weaken (−25% dano), Stun (perde o turno); sinergias entre habilidades                                                                                                                                               | 2026-11-17 | Combate 2.0                                                                                           |
| D36 | O combate é "Slay the Spire sem cartas + Darkest Dungeon": inclui **intenções dos inimigos** visíveis antes do turno dos jogadores                                                                                                                                   | 2026-11-17 | Combate 2.0                                                                                           |
| D37 | Sistema de amigos (adicionar amigo) e Rifts com lobby                                                                                                                                                                                                                | 2026-11-18 | M3                                                                                                    |
| D38 | **Formação corrigida:** cada lado tem 3 colunas (back, mid, front) × 2 linhas = 6 posições (substitui a interpretação "2 filas de 3" do D13)                                                                                                                         | 2026-11-18 | motor, combate, lobby                                                                                 |
| D39 | A coluna mid está a salvo do corpo-a-corpo enquanto houver alguém na front                                                                                                                                                                                           | 2026-11-18 | motor                                                                                                 |
| D40 | Há habilidades que atingem tudo                                                                                                                                                                                                                                      | 2026-11-18 | conteúdo                                                                                              |
| D41 | **Nos ataques escolhe-se a coluna, não o alvo**: um ataque contra a front atinge sempre os dois da front (jogadores e inimigos)                                                                                                                                      | 2026-11-18 | motor, conteúdo, ecrã                                                                                 |
| D42 | Os inimigos jogam com a formação: ocupam as 3 colunas e/ou, na mesma coluna, um bloqueia e o outro ataca — conforme a dificuldade do Rift                                                                                                                            | 2026-11-18 | IA, conteúdo dos Rifts                                                                                |
| D43 | **The Rift:** cada Rift é uma dungeon com mapa ramificado estilo Slay the Spire (≥ 10 salas, caminhos que convergem, salas opcionais, boss obrigatório, geração procedural com templates e regras). Salas: Combat, Elite, Campsite, Random Event, Loot, Secret, Boss | 2026-11-21 | `game-core/src/rift/*`, `content/rifts.ts`, `content/rooms.ts`, `content/events.ts`, ADR-032          |
| D44 | **Regra dos BASE STATS:** todos os testes de exploração (eventos, salas secretas, verificações, rolls na dungeon) usam só os atributos base; equipamento, acessórios e buffs não contam                                                                              | 2026-11-21 | `game-core/src/rift/tests.ts` (`BaseAttributes`), `baseAttributesOf`                                  |
| D45 | Recompensas: combates e elites sem drops; Loot/Secret com recompensas próprias; eventos podem dar vantagens; o loot principal vem do boss. Evitar combates é uma estratégia válida                                                                                   | 2026-11-21 | `run.ts`, `content/rifts.ts`                                                                          |
| D46 | Atributos renomeados: Might, Agility, Precision, **Intellect** (ex-Arcana), **Will** (ex-Spirit), **Endurance** (ex-Vitality), com os papéis da especificação de combate                                                                                             | 2026-11-21 | migração 0008, `ATTRIBUTE_KEYS`, `ATTRIBUTE_SUMMARIES`                                                |
| D47 | **Ronda de combate:** fase de planeamento separada da resolução; resolução alternada entre equipas, uma ação de cada vez; começa a equipa com mais iniciativa (roll + Agility, melhor resultado da equipa). **Substitui D14 (PvE)**                                  | 2026-11-21 | `combat/engine.ts`, ADR-033                                                                           |
| D48 | **Focus** (o antigo "Flow" não existe): gerado por personagem no início de cada ronda pela Precision, mínimo 3. O Focus não gasto **acumula até um limite** (resposta do dono; mantém D24)                                                                           | 2026-11-21 | `FOCUS_RULES`, `COMBAT_RULES.focusMax`                                                                |
| D49 | Dentro de cada equipa, as ações resolvem-se **pela ordem planeada**                                                                                                                                                                                                  | 2026-11-21 | `resolveRound`                                                                                        |
| D50 | Mudar de posição custa 1 Focus; Block custa 1 Focus, acumula e desaparece no fim da ronda (substitui "expira no próprio turno" de D34). Dano no HP = max(0, dano − Block)                                                                                            | 2026-11-21 | `BASIC_ACTIONS`, `absorbWithBlock`                                                                    |
| D51 | Decisões de grupo no Rift (caminho e abordagem dos eventos): **votação**, maioria, o líder desempata                                                                                                                                                                 | 2026-11-21 | `run.ts` (`vote`, `tally`)                                                                            |
| D52 | Num evento com teste, **o grupo escolhe quem tenta** (rola dado + atributo base dessa pessoa)                                                                                                                                                                        | 2026-11-21 | `run.ts` (`resolveDecision`)                                                                          |
| D53 | **Armas:** catálogo por tipo (espada, machado, adaga, lança, maça, arco, cajado, varinha); a mesma arma do mesmo nível tem sempre os mesmos números e o mesmo ataque básico; upgrades +1, +2…; até 5 especiais e 2 slots de runa trancados (Runemaster = futuro)     | 2026-11-21 | `content/weapons.ts`, ADR-034                                                                         |
| D54 | **Custo do ataque básico depende da arma:** armas pesadas e de muito dano custam 3 Focus; adagas 1                                                                                                                                                                   | 2026-11-21 | `WEAPON_TYPES.*.basicAttackCost`                                                                      |
| D55 | **Se a equipa morrer toda, não leva loot do Rift** (nem o que encontrou pelo caminho)                                                                                                                                                                                | 2026-11-21 | `finish()` em `rifts.service.ts`                                                                      |
| D56 | Dungeon Threat: implementar já uma versão simples para testar a mecânica                                                                                                                                                                                             | 2026-11-21 | `THREAT_RULES`, ADR-035                                                                               |
| D57 | Modo PvP de teste                                                                                                                                                                                                                                                    | 2026-11-21 | `createPvpEncounter`, lobbies `pvp_arena`, ADR-037                                                    |
| D58 | **Profissões** (estilo Project Zomboid): muitas (Runesmith, Blacksmith, Pescador, …), com níveis que melhoram o sucesso e os resultados; equilíbrio depois                                                                                                           | 2026-11-21 | `content/professions.ts`, `modules/professions`, ADR-036                                              |
| D59 | **PvE é como Slay the Spire:** as ações dos jogadores acontecem logo (em tempo real); quando todos terminam o turno, os inimigos fazem as ações deles. Mais fácil e fluido. **O PvP mantém** o planeamento + resolução alternada (substitui D47 no PvE)              | 2026-11-21 | `planAction`/`resolveRound` (`combat/engine.ts`), `CombatPage.tsx`, ADR-038                           |
| D60 | **Formação em linha:** 4 posições por lado numa só linha (frente, 2.ª, 3.ª, trás), como na imagem de referência; grupo/lobby de **4** (PvP 4 contra 4). Substitui D38 (3 × 2) e D18 (lobby de 6); D41 (ataque à coluna) passa a ser ataque a uma posição             | 2026-11-21 | `SLOTS_PER_SIDE`, `COMBAT_COLUMNS`, `LOBBY_MAX_MEMBERS`, `combat-layout.ts`, `LobbyPage.tsx`, ADR-039 |
| D61 | **Entrar no jogo = entrar com o último personagem jogado**, no hex onde ficou; escolher personagem passa a ser secundário (botão pequeno no canto)                                                                                                                   | 2026-11-21 | `PlayEntry.tsx` (rota `/`), `GameShell.tsx` (botão "Switch character"), `LoginPage.tsx`, ADR-040      |
| D62 | **O ecrã principal é o hex onde estás** (pode não ser uma cidade): imagem do local + o que se pode fazer lá (falar com NPCs, sair, loja, …) e **chat do hex** com os jogadores que lá estão                                                                          | 2026-11-21 | `content/locations.ts`, `HomePage.tsx`, `LocationScene.tsx`, `chat.send`/`chat.message`, ADR-040      |
| D63 | **2 espaços de personagem por conta**; mais espaços desbloqueiam-se mais tarde (dinheiro real ou outra forma, por decidir)                                                                                                                                           | 2026-11-21 | `MAX_CHARACTERS_PER_ACCOUNT=2`, `CharacterSelectPage.tsx` (espaço bloqueado)                          |

## Decisões em aberto / valores provisórios (confirmar com o dono)

| #   | Assunto                                                         | Valor provisório                                                                                                                                                                                                                                                                                                                                                                                          | Onde mudar                                                                       |
| --- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| A1  | Máximo de personagens por conta                                 | **2 (decidido, D63)**; desbloquear mais espaços: forma e preço por decidir                                                                                                                                                                                                                                                                                                                                | `.env` → `MAX_CHARACTERS_PER_ACCOUNT`                                            |
| A2  | Nome do mundo                                                   | "The Living Realms" (slug `main`)                                                                                                                                                                                                                                                                                                                                                                         | `packages/db/src/seed.ts`, `WORLD_SLUG`                                          |
| A3  | Regras de nome do personagem                                    | 3–20 letras; espaços, apóstrofos e hífens                                                                                                                                                                                                                                                                                                                                                                 | `packages/game-core/src/character.ts`                                            |
| A4  | Aparência                                                       | cor (8) + emblema (8), provisória                                                                                                                                                                                                                                                                                                                                                                         | ver CHANGE_MAP → "Aparência"                                                     |
| A5  | Custo de AP por hexágono (o "X")                                | não implementado                                                                                                                                                                                                                                                                                                                                                                                          | fase 2                                                                           |
| A6  | Ritmo do relógio do mundo                                       | 1 tick a cada 5 s                                                                                                                                                                                                                                                                                                                                                                                         | `.env` → `WORLD_TICK_MS`                                                         |
| A7  | Hexágono onde nascem os personagens                             | (0,0)                                                                                                                                                                                                                                                                                                                                                                                                     | `worlds.spawn_q/spawn_r`                                                         |
| A8  | Língua da documentação técnica                                  | inglês                                                                                                                                                                                                                                                                                                                                                                                                    | —                                                                                |
| A9  | Alojamento                                                      | Railway (aprovado, a funcionar)                                                                                                                                                                                                                                                                                                                                                                           | `infra/railway/*.json`                                                           |
| A10 | Fórmulas das estatísticas                                       | HP = 20 + 2×CON; Mana = 10 + 2×INT; Defesa = armadura + mod CON; Iniciativa = mod DEX; Esquiva/Crítico = 5% + 2%×mod DEX (máx. 75%); poderes = mod do atributo                                                                                                                                                                                                                                            | `packages/game-core/src/stats.ts` (`STAT_RULES`)                                 |
| A11 | Conteúdo inicial (armas, armaduras, habilidades, custos, danos) | Espada de treino, arco de caça, cajado de aprendiz; túnica; escudo, gorro, perneiras, 2 acessórios para drops futuros                                                                                                                                                                                                                                                                                     | `packages/game-core/src/content/*`                                               |
| A12 | Kit inicial                                                     | arma escolhida + túnica acolchoada                                                                                                                                                                                                                                                                                                                                                                        | `STARTER_WEAPONS`, `STARTER_ARMOR`                                               |
| A13 | Personagens antigos                                             | atributos 10 em tudo + espada de treino + túnica                                                                                                                                                                                                                                                                                                                                                          | migração `0002_…`                                                                |
| A14 | "Atinge a fila da frente"                                       | = a primeira fila **ocupada** (se a da frente estiver vazia, a de trás fica exposta)                                                                                                                                                                                                                                                                                                                      | `content/abilities.ts` (M2)                                                      |
| A15 | Pontos não gastos no point-buy                                  | permitidos                                                                                                                                                                                                                                                                                                                                                                                                | `validatePointBuy`                                                               |
| A16 | Limite de Focus acumulado                                       | por definir (M2)                                                                                                                                                                                                                                                                                                                                                                                          | —                                                                                |
| A17 | Inimigos do Rift de teste                                       | placeholders neutros: Rift Husk, Shard Spitter, Hollow Hound, Rift Warden (boss)                                                                                                                                                                                                                                                                                                                          | `content/enemies.ts`                                                             |
| A18 | Equilíbrio do Rift de teste (simulação, 300 combates)           | solo: espada 31%, arco 20%, cajado 46% de vitórias; grupo de 2–3: ~100%                                                                                                                                                                                                                                                                                                                                   | `content/abilities.ts`, `content/enemies.ts`                                     |
| A19 | Abandonar um Rift                                               | conta como derrota (o equipamento perde qualidade), para não se fugir à penalização                                                                                                                                                                                                                                                                                                                       | `rifts.service.ts`                                                               |
| A20 | Posição inicial no combate                                      | espada na fila da frente; arco e cajado na fila de trás                                                                                                                                                                                                                                                                                                                                                   | `rifts.service.ts`                                                               |
| A21 | Opções do corpo base                                            | tipo de corpo, tom de pele, penteado, cor do cabelo, cor dos olhos, cor da roupa                                                                                                                                                                                                                                                                                                                          | `CharacterAvatar`                                                                |
| A22 | Arte                                                            | desenhada em código (SVG em camadas) como base provisória; arte profissional substitui as camadas mais tarde                                                                                                                                                                                                                                                                                              | ADR-021                                                                          |
| A23 | Meta de dificuldade a solo                                      | média: ~40–50% de vitórias; grupos de 2–3 ~100% (simulação: espada+escudo 52%, machado 32%, adagas 68%, arco 56%, cajado 60%, tomo+talismã 26%; média 49%)                                                                                                                                                                                                                                                | conteúdo em `game-core/src/content`                                              |
| A24 | Armas iniciais                                                  | espada, machado, adaga, arco, cajado, tomo; mão secundária opcional: escudo, talismã ou adaga                                                                                                                                                                                                                                                                                                             | `STARTER_WEAPONS`, `STARTER_OFFHANDS`                                            |
| A25 | Amigos                                                          | por personagem (adiciona-se pelo nome do personagem); pedido → aceitar/recusar                                                                                                                                                                                                                                                                                                                            | `modules/social`                                                                 |
| A26 | Lobby público                                                   | entra quem quiser até 6; o líder pode expulsar; também há lobbies privados (só por convite)                                                                                                                                                                                                                                                                                                               | `lobbies.service.ts`                                                             |
| A27 | Jogador desligado a meio do combate                             | o turno passa aos 60 s (sem controlo automático)                                                                                                                                                                                                                                                                                                                                                          | `COMBAT_RULES.turnSeconds`                                                       |
| A28 | Sair de um Rift em grupo                                        | só quem sai sofre a penalização (−25% qualidade); o grupo continua; se for o último, é derrota                                                                                                                                                                                                                                                                                                            | `rifts.service.ts`                                                               |
| A29 | Atualização em tempo real no lobby/combate                      | o browser pergunta ao servidor a cada ~1,5 s (simples e robusto a esta escala; push por WebSocket fica para mais tarde)                                                                                                                                                                                                                                                                                   | `features/rifts/api.ts`                                                          |
| A30 | Alcance por coluna                                              | corpo-a-corpo = primeira coluna ocupada (front → mid → back); distância/magia = qualquer coluna; Volley = coluna de trás inteira; Cleave/Rift Slam = primeira coluna ocupada inteira                                                                                                                                                                                                                      | `content/abilities.ts`                                                           |
| A31 | Posições iniciais                                               | corpo-a-corpo na front; arco, cajado e tomo na back                                                                                                                                                                                                                                                                                                                                                       | `startingSlot`                                                                   |
| A32 | Habilidades de apoio (curar/proteger um aliado)                 | continuam a escolher a pessoa; só os ataques são por coluna                                                                                                                                                                                                                                                                                                                                               | `content/abilities.ts`                                                           |
| A33 | Proteção de coluna                                              | escudo: "Shield Wall" (Block para a coluna inteira); inimigo-tanque "Rift Bulwark"                                                                                                                                                                                                                                                                                                                        | `content/*`                                                                      |
| A34 | Ritmo das animações de combate                                  | 650 ms por ação (420 ms com "reduzir movimento"); a fase dos inimigos joga-se ataque a ataque e os controlos esperam pelo fim                                                                                                                                                                                                                                                                             | `apps/web/src/features/rifts/combat-scene.ts` (`stepMs`)                         |
| A35 | Ecrã inicial (Hub)                                              | losangos: Rifts, Mundo, Herói; menus laterais: Amigos, Lobbies, Crónica / Herói, Inventário, Online, Trocar personagem; barra de baixo: Personagem, Rifts, Home, Mundo, Amigos                                                                                                                                                                                                                            | `apps/web/src/features/game/HomePage.tsx`, `GameShell.tsx`                       |
| A36 | Atalhos das habilidades                                         | teclas 1–9 pela ordem da barra; Esc cancela a escolha de alvo                                                                                                                                                                                                                                                                                                                                             | `apps/web/src/features/rifts/AbilityBar.tsx`                                     |
| A37 | Custo do ataque básico                                          | **decidido em D54** (por arma)                                                                                                                                                                                                                                                                                                                                                                            | `WEAPON_RULES.basicAttackFocusCost`                                              |
| A38 | Fórmula do Focus por ronda                                      | 3 + 1 por cada 2 de Precision acima de 5, máx. 6 (5→3, 7→4, 9→5, 11→6); limite acumulado 8 (A16)                                                                                                                                                                                                                                                                                                          | `FOCUS_RULES`, `COMBAT_RULES.focusMax`                                           |
| A39 | Iniciativa                                                      | d10 + Agility; empate = moeda ao ar                                                                                                                                                                                                                                                                                                                                                                       | `COMBAT_RULES.initiativeDie`                                                     |
| A40 | Block (ação)                                                    | 5 por uso, fixo (sem escala)                                                                                                                                                                                                                                                                                                                                                                              | `BASIC_ACTIONS.block.amount`                                                     |
| A41 | Números das armas                                               | danos base: espada 6–8, machado 5–10, adaga 8–10, lança 4–6 (atinge as 2 colunas mais próximas), maça 7–9, arco 4–6, cajado 6–8 (mágico, qualquer coluna), varinha 4–6, tomo 4–6; escala 60% primário / 40% secundário; upgrade +10% por nível (máx. +10). Machado passou a uma mão (especificação). Lança, maça e varinha só têm o ataque básico                                                         | `content/weapons.ts`                                                             |
| A42 | Mapa do Rift                                                    | 7 filas + boss, 5 colunas, 4 caminhos (≈ 23 salas, 8 por caminho); 1.ª fila = Combat; fila antes do boss = Campsite; Elite a partir da fila 3; 1–2 salas secretas                                                                                                                                                                                                                                         | `DEFAULT_MAP_TEMPLATE`                                                           |
| A43 | Itens de Loot/Secret/eventos                                    | **substituído por D55**: só são entregues se o grupo vencer                                                                                                                                                                                                                                                                                                                                               | `run.ts` (`grants`), `rifts.service.ts`                                          |
| A44 | Campsite                                                        | automático: +30% HP, +40% Mana, remove todos os debuffs                                                                                                                                                                                                                                                                                                                                                   | `EXPLORATION_RULES.campsite`                                                     |
| A45 | Testes de atributos                                             | d10 + atributo base ≥ dificuldade (fácil 11–12, média 13, difícil 14); procura passiva de sala secreta: melhor Precision base do grupo vs 14 ao entrar na sala vizinha                                                                                                                                                                                                                                    | `EXPLORATION_RULES`, `content/events.ts`                                         |
| A46 | Eventos e estados de exploração                                 | 8 eventos (porta selada, ídolo, ponte, névoa tóxica, corredor armadilhado, glifos, aventureiro caído, nascente); debuffs Shaken/Cursed/Poisoned/Exhausted, vantagens Inspired/Warded                                                                                                                                                                                                                      | `content/events.ts`, `CONDITIONS`                                                |
| A47 | Elites                                                          | os mesmos inimigos com ×1,6 HP, ×1,3 poder, +2 Precision                                                                                                                                                                                                                                                                                                                                                  | `ELITE_RULES`                                                                    |
| A48 | Tempo para votar sem votos                                      | sem votos: o 1.º caminho / a abordagem sem teste                                                                                                                                                                                                                                                                                                                                                          | `resolveDecision`                                                                |
| A49 | Recompensas do boss                                             | 40 de reputação + 2 drops (antes 25 + 1, a dungeon é mais longa)                                                                                                                                                                                                                                                                                                                                          | `content/rifts.ts`                                                               |
| A50 | Equilíbrio (simulação de corridas completas, 100 por build)     | média a solo 53%: espada+escudo 40%, machado+escudo 54%, lança 55%, maça 54%, adagas 32%, arco 70%, cajado 46%, varinha 60%, tomo+talismã 63%; grupos de 2–3: 100%                                                                                                                                                                                                                                        | `pnpm sim`                                                                       |
| A51 | Dungeon Threat                                                  | versão simples implementada (D56, A54)                                                                                                                                                                                                                                                                                                                                                                    | —                                                                                |
| A52 | Custos de ataque básico (além dos definidos)                    | espada 2, lança 2, arco 2, cajado 2, varinha 1, tomo 1 (machado 3, maça 3, adaga 1 = dono); danos base: espada 13–16, machado 18–28, adaga 8–10, lança 8–11, maça 22–26, arco 8–10, cajado 11–14, varinha 4–6, tomo 4–6                                                                                                                                                                                   | `content/weapons.ts`                                                             |
| A53 | Quem sai a meio de um Rift                                      | também perde o loot encontrado (conta como derrota para essa pessoa)                                                                                                                                                                                                                                                                                                                                      | `finish()`                                                                       |
| A54 | Threat (simples)                                                | +1 por teste falhado num evento, +1 por votação que acaba sem decisão; −1 ao limpar uma Elite; máx. 10. Níveis do boss: 2 (+15% HP), 4 (+30% HP, +15% dano), 6 (+45% HP, +30% dano, +1 Focus). Visível no topo do mapa                                                                                                                                                                                    | `THREAT_RULES`                                                                   |
| A55 | PvP de teste                                                    | Arena por lobby (até 6 contra 6; equipa A = slots 0–5, B = 6–11); mesmas regras de combate; planos da outra equipa escondidos; sem recompensas e sem perda de qualidade; sair = a tua equipa perde se ficar vazia                                                                                                                                                                                         | `PVP_ARENA_ID`, `lobbies.service.ts`                                             |
| A56 | Profissões e atividades                                         | 15: Fishing, Mining, Woodcutting, Herbalism, Hunting, Farming, Blacksmithing, Runesmithing, Carpentry, Leatherworking, Tailoring, Jewelcrafting, Alchemy, Cooking, Medicine; níveis 0–10; XP para subir = 40 + 30×nível; +5% de sucesso por nível (máx. 95%); +10% por nível de chance de 1 item extra; reparar = 15 + 4×nível de qualidade; melhorar arma (+1, até +5) fica −15% mais difícil por cada + | `content/professions.ts`, `PROFESSION_RULES`                                     |
| A57 | Custo de tempo das profissões                                   | sem AP ainda: cada atividade deixa a profissão ocupada 20–40 s                                                                                                                                                                                                                                                                                                                                            | `cooldownSeconds`                                                                |
| A58 | Materiais e consumíveis                                         | empilham (`items.quantity`); consumíveis (comida, poções, ligaduras) ainda não se usam — futuro: recuperação no Rift; runas: só a pedra em branco                                                                                                                                                                                                                                                         | `MATERIALS`                                                                      |
| A59 | Equilíbrio (100 corridas por build)                             | média a solo 54%: espada+escudo 41%, machado+escudo 49%, lança 61%, maça 53%, adagas 32%, arco 74%, cajado 50%, varinha 60%, tomo+talismã 63%                                                                                                                                                                                                                                                             | `pnpm sim`                                                                       |
| A60 | Equilíbrio depois do PvE estilo Slay the Spire (60 corridas)    | média a solo **80%** (era 54%): adagas e tomo+talismã 100%, varinha 98%, arco 95%, lança 80%, cajado 78%, maça 60%, machado+escudo 57%, espada+escudo 50% — o grupo age sempre primeiro; **por afinar** (inimigos mais fortes ou mais dano)                                                                                                                                                               | `pnpm sim`, `content/enemies.ts`                                                 |
| A61 | Alcance na linha de 4                                           | corpo a corpo = inimigo mais próximo; lança, Cleave, Rift Slam = os 2 mais próximos; distância/magia = qualquer posição; Shield Wall/Bulwark = Block para os 2 da frente; corpo a corpo começa à frente, distância/magia atrás                                                                                                                                                                            | `content/abilities.ts`, `startingSlot`                                           |
| A62 | Corridas e lobbies abertos durante a mudança de formação        | fechados sem penalização (migração 0010)                                                                                                                                                                                                                                                                                                                                                                  | `0010_one_line_formation.sql`                                                    |
| A63 | Cidade inicial (hex 0,0)                                        | **Emberhold**, cidade muralhada com castelo; ações: Talk to people (em breve), Market (em breve), Workshop (= profissões), Rifts, Leave (mapa)                                                                                                                                                                                                                                                            | `content/locations.ts`                                                           |
| A64 | Hexes sem nome                                                  | "Open wilds": Rifts, Workshop e Leave; imagem genérica de campo                                                                                                                                                                                                                                                                                                                                           | `content/locations.ts`, `LocationScene.tsx`                                      |
| A65 | Imagens dos locais                                              | desenhos SVG provisórios feitos em código (cidade, campo); trocar por ilustrações reais                                                                                                                                                                                                                                                                                                                   | `apps/web/src/features/game/LocationScene.tsx`                                   |
| A66 | Chat do hex                                                     | 200 caracteres por mensagem; últimas 50 mensagens guardadas 24 h (Redis); 5 seguidas e depois 1 por segundo                                                                                                                                                                                                                                                                                               | `CHAT_MAX_LENGTH`, `CHAT_HISTORY` (`protocol.ts`), `gateway.ts`, `connection.ts` |
| A63 | Equilíbrio com a linha de 4 (40 corridas por build)             | média a solo 47% (volta ao alvo de 40–50%; o corpo a corpo só alcança o mais próximo)                                                                                                                                                                                                                                                                                                                     | `pnpm sim`                                                                       |

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

### #29 — 2026-11-18 — "Faz merge a tudo; quero as versões melhores online"

**Pedido:** juntar tudo e pôr online: o Pixi (#27/#28) e a aparência de jogo da
outra sessão ("Aparência gamificada e responsiva", que tinha ficado parada no
ramo `claude/gracious-mendel-l2buie`, antes do Combate 2.0 e dos lobbies).
**Resultado:**

- Tema de jogo aplicado por cima da versão atual: fontes Cinzel/Alegreya Sans
  (instaladas no projeto), painéis ornamentados, cenário com brasas, escala
  fluida da UI em `rem` (`tokens.css`), ecrãs que ocupam a janela inteira sem
  scroll da página (`Screen`, `topbar`, `screen-body`).
- Ecrãs refeitos com o layout do tema e a lógica atual: criação (3 colunas,
  com mão secundária e as estatísticas novas), ficha (pontos por gastar),
  Rifts (lobbies, convites), mundo em HUD sobre o mapa Pixi (com Amigos),
  lobby e amigos.
- Combate: a cena Pixi mantém-se; o tema dá a barra de cima e os botões.
  No telemóvel, as intenções mostram só ícone e valor.
- Teste e2e novo do tema: "screens fit every screen size" (telemóvel → 4K).
- Docs: CHANGE_MAP ("Tema visual"), ADR-030.

### #30 — 2026-11-18 — Aspeto de jogo mobile (Hub) e habilidades estilo MMO

**Pedido:** imagem de referência de um jogo mobile (cenário ilustrado, menus de
ícones com nome, botões grandes em losango, barra de navegação em baixo); fazer
o jogo "mais com este aspeto". Personagens continuam placeholders. Habilidades
"mais clássicas": um ícone (placeholder) com o nome; ao passar o rato, diz o que
é — estilo MMO.
**Decisão do dono:** Hub novo como ecrã inicial; o mapa abre a partir do Hub.
**Resultado:**

- `GameShell` (layout partilhado pelo Hub, Mundo, Rifts e Amigos): barra de
  topo (retrato, nome, ligação, reputação, jogadores online, mundo/tick, sair)
  e barra de navegação em baixo (Personagem, Rifts, Home, Mundo, Amigos). A
  ligação ao mundo passou para aqui: continuas online ao andar entre ecrãs.
- Hub (`/home`): cenário ilustrado, cartão de atividade (retomar combate, o teu
  lobby, convites ou ir aos Rifts), menus laterais, losangos (Rifts, Mundo,
  Herói) e faixa com a última entrada da Crónica. Depois de escolher/criar o
  personagem entra-se no Hub.
- Cenário pintado original desenhado em código (`shared/ui/Landscape.tsx`,
  placeholder para substituir por ilustração) em todos os ecrãs, escurecido nos
  menus.
- Paleta inspirada na referência: vidro escuro com bordas claras finas e laranja
  nas ações principais.
- Barra de habilidades estilo MMO (`AbilityBar.tsx`, `AbilityIcon.tsx`): ícone
  placeholder colorido por tipo, nome por baixo, custo (Focus/Mana), tecla
  1–9 e tooltip com custo, alvo, efeitos, descrição e escala.
- Testes e2e atualizados (Hub; teste de tamanhos inclui o Hub).
- Docs: CHANGE_MAP, ADR-031, ARCHITECTURE §9, ROADMAP. Valores provisórios A35–A36.

### #31 — 2026-11-21 — The Rift (dungeons), combate por rondas e armas

**Pedido:** três especificações: (1) **The Rift** — dungeons com mapa
ramificado estilo Slay the Spire (≥ 10 salas, branches que convergem, salas
opcionais e secretas, boss), salas Combat/Elite/Campsite/Random Event/Loot/
Secret/Boss, eventos com testes de atributos usando **só os BASE STATS**,
gestão de HP/Mana/debuffs, recompensas sobretudo no boss, Dungeon Threat como
proposta; (2) **combate** — "Flow" passa a chamar-se Focus (gerado pela
Precision, mínimo 3), rondas com fase de planeamento e resolução alternada por
iniciativa de equipa, Block (1 Focus, acumula, reset por ronda), mudar de
posição (1 Focus), apresentação tática; (3) **armas** — catálogo com números
iguais por tipo e nível, ataque básico por tipo, upgrades, 5 especiais e 2
runas trancadas. Durante o trabalho: imagem de referência do ecrã de combate
("não te foques ainda no UI, mas sim na posição das coisas").
**Perguntas feitas e respostas:** Focus acumula com limite (D48); ordem das
ações dentro da equipa = ordem planeada (D49); decisões de grupo por votação
(D51); o grupo escolhe quem testa (D52).
**Decisões:** D43–D53; valores provisórios A37–A51.
**Resultado:**

- Análise: o motor de combate, atributos, equipamento e corridas foram
  reaproveitados; o Rift embrulha o motor (`game-core/src/rift`) em vez de o
  substituir; o estado da corrida continua em `rift_runs.state` (v2).
- Rift: gerador procedural validado em centenas de seeds; votos com
  desempate do líder; eventos/condições/tipos de sala em dados; salas
  secretas escondidas do cliente até serem descobertas (procura passiva ou
  evento); campsites parciais; loot imediato; boss com as recompensas
  principais.
- Regra dos Base Stats: tipo `BaseAttributes` (só se cria a partir dos
  atributos base) usado por todos os testes; o ecrã mostra "Might 12 (base)".
- Combate: planear → pronto → resolução alternada; iniciativa por equipa;
  Focus por Precision (inimigos também); Block universal; ações de quem caiu
  não acontecem; intenções dos inimigos continuam visíveis.
- Armas: catálogo (`content/weapons.ts`), lança/maça/varinha novas (iniciais),
  machado a uma mão, colunas `upgrade_level`/`specials`/`rune_slots`.
- Atributos renomeados (Endurance, Intellect, Will) com migração das colunas.
- Ecrãs: mapa do Rift (SVG) com grupo, legenda e painel de eventos/salas;
  combate reorganizado como na imagem (plano à esquerda, ronda/iniciativa em
  cima, intenções à direita, painel do personagem em baixo à esquerda, barra
  de habilidades + Ready em baixo à direita).
- Dungeon Threat avaliado (ADR-035), não implementado: precisa de decisões.
- Corridas ativas no formato antigo foram fechadas sem penalização (migração 0008).
- Testes: 68 unitários no game-core, 59 de integração no servidor, 8 e2e;
  `pnpm sim` refeito para corridas completas.
- Docs: CHANGE_MAP, DECISIONS (ADR-032–035), ARCHITECTURE §7, DATABASE,
  ROADMAP, CLAUDE.md.

### #32 — 2026-11-21 — Pôr o The Rift online

**Pedido:** fazer commit/merge para experimentar no site.
**Resultado:** PR #4 com CI verde, merge no `main` (`ce467b7`); deploy no
Railway concluído com sucesso. A migração 0008 é aplicada no arranque.

### #33 — 2026-11-21 — Custos por arma, loot, Threat, PvP e profissões

**Pedido:** (1) o custo do ataque básico depende da arma: pesadas 3, adagas 1;
(2) se a equipa morrer toda, não leva loot do Rift; (3) Threat simples para
testar; (4) modo PvP de teste; (5) profissões (Runesmith, Blacksmith,
Pescador, … "tudo o que achas relevante, tipo Project Zomboid"), com níveis
que melhoram o sucesso e os resultados; equilíbrio depois.
**Decisões:** D54–D58; valores provisórios A52–A59 (A37, A43 e A51 atualizados).
**Resultado:**

- Armas: `basicAttackCost` por tipo; danos ajustados ao custo; a ficha mostra
  tipo, dano, custo do ataque básico, especiais e runas de cada arma.
- Loot: o que se encontra no Rift fica guardado na corrida e só é entregue na
  vitória (com as recompensas do boss); quem sai ou um grupo derrotado perde-o.
- Threat: valor e nível visíveis no mapa e no combate do boss; reforça o boss.
- PvP: "PvP Arena (test)" na página dos Rifts → lobby com equipas A e B →
  um combate com as regras normais (planeamento simultâneo, iniciativa por
  equipa, resolução alternada); o plano da outra equipa fica escondido.
- Profissões: 15 profissões em 3 categorias, ecrã `/professions` (atalho no
  Hub), materiais que empilham, Ferreiro repara e melhora armas (+1), outras
  fabricam equipamento, comida, poções, ligaduras e pedras rúnicas.
- Migração 0009 (`character_professions`, `items.quantity`).
- Testes: 77 unitários no game-core, 65 de integração no servidor, 19 web, 9 e2e.
- Docs: CHANGE_MAP, DECISIONS (ADR-035 atualizado, ADR-036, ADR-037),
  DATABASE, ROADMAP, ARCHITECTURE.

### #34 — 2026-11-21 — PvE como no Slay the Spire

**Pedido:** no PvE, as ações acontecem em tempo real e depois o inimigo faz as
dele (mais fácil e fluido); o PvP mantém-se. Dar commit e pull para ver.
**Decisões:** D59.
**Resultado:**

- Motor: no PvE cada ação resolve-se no momento; "End turn" quando todos
  terminam → fase dos inimigos (intenções por ordem de iniciativa). Sem
  rolagem de iniciativa no PvE (o grupo começa sempre). O Block do grupo
  desaparece no início da ronda; o Block dos inimigos dura até à fase deles
  (como no Slay the Spire). O PvP continua com planeamento escondido e
  resolução alternada por iniciativa de equipa.
- Ecrã: no PvE o painel da esquerda mostra o registo, o botão é "End turn" e
  as tuas ações animam logo; no PvP mantém-se o plano e o "Ready".
- Testes: 76 unitários, 65 de integração, 19 web, 9 e2e.
- Docs: CHANGE_MAP, DECISIONS (ADR-038), ARCHITECTURE.

### #35 — 2026-11-21 — Merge + formação em linha de 4

**Pedido:** fazer merge (PR #5 → online). "O PvE também está em linha? Parece
que ainda está em 2 × 3." "Até o join de players está antigo. Devia ser 4
slots e tudo em linha" (com captura do lobby antigo).
**Decisões:** D60; valores provisórios A61–A62.
**Resultado:**

- PR #5 com merge no `main` (`8d9b2cf`) e deploy no Railway concluído.
- Formação: 4 posições numa linha por lado (combate, lobby, PvP 4 v 4);
  posições `front`, `second`, `third`, `back`; ataques de "coluna" atingem uma
  posição; Cleave/Rift Slam/Shield Wall/Bulwark afetam as 2 da frente.
- Encontros dos Rifts reposicionados em linha; ecrã de combate com toda a
  gente numa linha; intenções mais curtas ("→ front").
- Migração 0010: fecha corridas ativas e lobbies abertos da formação antiga.
- Testes: 75 unitários, 65 de integração, 18 web, 9 e2e.

### #36 — 2026-11-21 — Entrar com o último personagem, ecrã do hex, chat e 2 espaços

**Pedido:** (1) ao entrar no jogo, entrar sempre com o último personagem
jogado, sem ter de escolher; (2) ao abrir o jogo aparece-se no hex onde se
ficou (pode não ser uma cidade), com uma imagem do local e as coisas que se
podem fazer lá (falar com NPCs, sair, loja, …); (3) chat do hex com os
jogadores que lá estão; (4) a troca de personagem estava em muitos botões —
deve ser secundária, num canto; (5) 2 espaços de personagem, o resto
desbloqueia-se depois (dinheiro real ou outra coisa).
**Decisões:** D61–D63; valores provisórios A63–A66 (A1 passa a decidido).
**Resultado:**

- Rota `/` (`PlayEntry`): escolhe o personagem ativo do separador ou o último
  jogado e vai direto para `/home`; sem personagens → criação. O login e o
  `GuestOnly` vão para `/`; as páginas do jogo sem personagem também.
- `/home` é agora o ecrã do hex: imagem do local, nome, descrição e ações
  (`content/locations.ts`): Emberhold em (0, 0); os outros hexes são "Open
  wilds". Falar com NPCs e Market aparecem como "soon" (fases futuras).
- Chat do hex: `chat.send` → `chat.message` só para quem está no mesmo hex
  (em qualquer instância), histórico recente ao entrar (Redis).
- Troca de personagem: só um botão pequeno no topo (⇄), ao lado de "Log out";
  saiu do hub; "Back" na ficha volta ao jogo.
- 2 espaços por conta (`MAX_CHARACTERS_PER_ACCOUNT=2`); o ecrã de personagens
  mostra um espaço bloqueado "More slots soon". **No Railway, a variável
  `MAX_CHARACTERS_PER_ACCOUNT` tem de passar a 2 se estiver definida.** Contas
  com mais de 2 personagens mantêm-nos, mas não podem criar mais.
- Testes: 78 unitários, 67 de integração, 19 web, 9 e2e.
- Docs: CHANGE_MAP, DECISIONS (ADR-040), ARCHITECTURE, ROADMAP, DATABASE.
