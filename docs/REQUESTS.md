# Registo de pedidos

Histórico de tudo o que o dono do projeto pediu, com as decisões tomadas e
onde foi implementado. **Entradas mais recentes no fim.** Ver regras em
[`../CLAUDE.md`](../CLAUDE.md).

---

## Decisões de game design já tomadas (pelo dono do projeto)

| #    | Decisão                                                                                                                                                                                                                                                                                                                | Data       | Onde se reflete                                                                                       |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| D1   | Cada jogador pode ter vários personagens, mas só joga com um de cada vez                                                                                                                                                                                                                                               | 2026-11-17 | `apps/server/src/realtime/gateway.ts` (account.replace), `MAX_CHARACTERS_PER_ACCOUNT`, ADR-012        |
| D2   | Um único mundo, partilhado por todos                                                                                                                                                                                                                                                                                   | 2026-11-17 | `worlds` (slug `main`), `world_id` em tudo, ADR-013                                                   |
| D3   | Criação de personagem na fase 1: só nome + aparência básica                                                                                                                                                                                                                                                            | 2026-11-17 | `packages/shared/src/api.ts`, `CharacterCreatePage.tsx`, ADR-015                                      |
| D4   | Tudo o que é do jogo em inglês (a conversa é em português)                                                                                                                                                                                                                                                             | 2026-11-17 | ADR-014                                                                                               |
| D5   | Mapa do mundo em hexágonos; a distância entre hexágonos custa X AP                                                                                                                                                                                                                                                     | 2026-11-17 | `packages/game-core/src/hex.ts`, `characters.hex_q/hex_r`, ADR-011                                    |
| D6   | Conta só com email + password, por agora                                                                                                                                                                                                                                                                               | 2026-11-17 | `modules/auth/*`                                                                                      |
| D7   | Prioridade: personagem e combate antes do mapa. Rifts = portais para raids; solo ou em lobby; a dificuldade não muda com o nº de jogadores                                                                                                                                                                             | 2026-11-17 | `ROADMAP.md` (Fases 2 e 3)                                                                            |
| D8   | Poder do personagem vem de skills e equipamento. Reputação é uma moeda ganha ao fazer atividades                                                                                                                                                                                                                       | 2026-11-17 | Fase 2                                                                                                |
| D9   | Sem classes: as armas definem como se ataca                                                                                                                                                                                                                                                                            | 2026-11-17 | Fase 2                                                                                                |
| D10  | Atributos: os 6 do D&D (STR, DEX, CON, INT, WIS, CHA)                                                                                                                                                                                                                                                                  | 2026-11-17 | Fase 2                                                                                                |
| D11  | Sem limite de skills ("infinitas")                                                                                                                                                                                                                                                                                     | 2026-11-17 | Fase 2/3 (ver perguntas em aberto)                                                                    |
| D12  | Recursos de combate: HP e Mana, por agora                                                                                                                                                                                                                                                                              | 2026-11-17 | Fase 3                                                                                                |
| D13  | Combate em filas como Darkest Dungeon: 6 posições por lado em 2 filas; vista lateral ao estilo Darkest Dungeon                                                                                                                                                                                                         | 2026-11-17 | Fase 3                                                                                                |
| D14  | PvE: primeiro os jogadores, por ordem de iniciativa, depois os inimigos. PvP: todos declaram as ações ao mesmo tempo, depois resolvem por ordem de iniciativa da equipa                                                                                                                                                | 2026-11-17 | Fase 3 (PvP mais tarde)                                                                               |
| D15  | Energia por turno ao estilo Slay the Spire (sem lhe chamar AP); ações diferentes custam quantidades diferentes                                                                                                                                                                                                         | 2026-11-17 | Fase 3                                                                                                |
| D16  | 60 segundos por turno                                                                                                                                                                                                                                                                                                  | 2026-11-17 | Fase 3                                                                                                |
| D17  | Rift = várias salas até ao boss                                                                                                                                                                                                                                                                                        | 2026-11-17 | Fase 3                                                                                                |
| D18  | Lobby até 6 jogadores; a dificuldade não muda (quem vai sozinho fica em desvantagem)                                                                                                                                                                                                                                   | 2026-11-17 | Fase 3                                                                                                |
| D19  | Derrota: o equipamento perde qualidade; a 0 parte-se e fica inutilizável                                                                                                                                                                                                                                               | 2026-11-17 | Fases 2/3                                                                                             |
| D20  | Recompensas: drops e reputação                                                                                                                                                                                                                                                                                         | 2026-11-17 | Fase 3                                                                                                |
| D21  | Atributos por point-buy (D&D 5e: 27 pontos, 8–15). Não crescem sozinhos: o equipamento pode dar bónus                                                                                                                                                                                                                  | 2026-11-17 | M1                                                                                                    |
| D22  | STR = dano físico; DEX = iniciativa, distância, esquiva, crítico; CON = HP e defesa; INT = Mana máxima e feitiços; WIS = cura, resistência, recuperação de Mana; CHA = buffs/debuffs (e comércio/reputação)                                                                                                            | 2026-11-17 | M1 (`game-core/stats`)                                                                                |
| D23  | Todas as skills conhecidas estão disponíveis em combate: as de arma vêm da arma equipada; as outras aprendem-se por drops                                                                                                                                                                                              | 2026-11-17 | M1/M2                                                                                                 |
| D24  | Energia por turno chama-se **Focus**; o Focus não gasto passa para o turno seguinte; os feitiços gastam Focus e Mana                                                                                                                                                                                                   | 2026-11-17 | M2                                                                                                    |
| D25  | Espaços: mão principal, mão secundária, cabeça, corpo, pernas, 2 acessórios                                                                                                                                                                                                                                            | 2026-11-17 | M1                                                                                                    |
| D26  | Reputação é por personagem                                                                                                                                                                                                                                                                                             | 2026-11-17 | M1                                                                                                    |
| D27  | Sem regra geral de "fila da frente protege": cada ataque define o que atinge (várias filas, fila de trás…); a maioria atinge a primeira. Trocar de posição gasta Focus; trocar com outro jogador gasta aos dois                                                                                                        | 2026-11-17 | M2                                                                                                    |
| D28  | A 0 HP o personagem cai; levanta-se com 1 HP se o grupo passar a sala                                                                                                                                                                                                                                                  | 2026-11-17 | M2                                                                                                    |
| D29  | HP e Mana mantêm-se entre salas                                                                                                                                                                                                                                                                                        | 2026-11-17 | M2                                                                                                    |
| D30  | Derrota: −25% de qualidade em todo o equipamento equipado                                                                                                                                                                                                                                                              | 2026-11-17 | M1/M2                                                                                                 |
| D31  | Entrada em Rifts: lista por agora. Convites a amigos + lobby público de Rifts. Mais tarde (mapa) conta o AP gasto para chegar ao hexágono do Rift                                                                                                                                                                      | 2026-11-17 | M2/M3/Fase 4                                                                                          |
| D32  | Visual dos personagens ao estilo da referência enviada (personagens ilustrados tipo "chibi", com animações; equipamento à volta do personagem no ecrã de herói). Para já, aparência = editar o corpo base; mais tarde o equipamento passa a ver-se no personagem                                                       | 2026-11-17 | M2 (renderer em camadas)                                                                              |
| D33  | Atributos: 6 lineares sem "atributos inúteis" (Might, Agility, Precision, Vitality, Arcana, Spirit), base 5 + 12 pontos na criação (máx. 10); o equipamento dá o resto. Armas escalam com 2 atributos; mão principal + secundária combinam habilidades                                                                 | 2026-11-17 | Combate 2.0                                                                                           |
| D34  | Defesa passiva com retornos decrescentes (redução = rating ÷ (rating + 50)) + Block ativo que expira no início do próprio turno (estilo Slay the Spire)                                                                                                                                                                | 2026-11-17 | Combate 2.0                                                                                           |
| D35  | Estados: Bleed, Burn, Mark (+25% dano recebido), Weaken (−25% dano), Stun (perde o turno); sinergias entre habilidades                                                                                                                                                                                                 | 2026-11-17 | Combate 2.0                                                                                           |
| D36  | O combate é "Slay the Spire sem cartas + Darkest Dungeon": inclui **intenções dos inimigos** visíveis antes do turno dos jogadores                                                                                                                                                                                     | 2026-11-17 | Combate 2.0                                                                                           |
| D37  | Sistema de amigos (adicionar amigo) e Rifts com lobby                                                                                                                                                                                                                                                                  | 2026-11-18 | M3                                                                                                    |
| D38  | **Formação corrigida:** cada lado tem 3 colunas (back, mid, front) × 2 linhas = 6 posições (substitui a interpretação "2 filas de 3" do D13)                                                                                                                                                                           | 2026-11-18 | motor, combate, lobby                                                                                 |
| D39  | A coluna mid está a salvo do corpo-a-corpo enquanto houver alguém na front                                                                                                                                                                                                                                             | 2026-11-18 | motor                                                                                                 |
| D40  | Há habilidades que atingem tudo                                                                                                                                                                                                                                                                                        | 2026-11-18 | conteúdo                                                                                              |
| D41  | **Nos ataques escolhe-se a coluna, não o alvo**: um ataque contra a front atinge sempre os dois da front (jogadores e inimigos)                                                                                                                                                                                        | 2026-11-18 | motor, conteúdo, ecrã                                                                                 |
| D42  | Os inimigos jogam com a formação: ocupam as 3 colunas e/ou, na mesma coluna, um bloqueia e o outro ataca — conforme a dificuldade do Rift                                                                                                                                                                              | 2026-11-18 | IA, conteúdo dos Rifts                                                                                |
| D43  | **The Rift:** cada Rift é uma dungeon com mapa ramificado estilo Slay the Spire (≥ 10 salas, caminhos que convergem, salas opcionais, boss obrigatório, geração procedural com templates e regras). Salas: Combat, Elite, Campsite, Random Event, Loot, Secret, Boss                                                   | 2026-11-21 | `game-core/src/rift/*`, `content/rifts.ts`, `content/rooms.ts`, `content/events.ts`, ADR-032          |
| D44  | **Regra dos BASE STATS:** todos os testes de exploração (eventos, salas secretas, verificações, rolls na dungeon) usam só os atributos base; equipamento, acessórios e buffs não contam                                                                                                                                | 2026-11-21 | `game-core/src/rift/tests.ts` (`BaseAttributes`), `baseAttributesOf`                                  |
| D45  | Recompensas: combates e elites sem drops; Loot/Secret com recompensas próprias; eventos podem dar vantagens; o loot principal vem do boss. Evitar combates é uma estratégia válida                                                                                                                                     | 2026-11-21 | `run.ts`, `content/rifts.ts`                                                                          |
| D46  | Atributos renomeados: Might, Agility, Precision, **Intellect** (ex-Arcana), **Will** (ex-Spirit), **Endurance** (ex-Vitality), com os papéis da especificação de combate                                                                                                                                               | 2026-11-21 | migração 0008, `ATTRIBUTE_KEYS`, `ATTRIBUTE_SUMMARIES`                                                |
| D47  | **Ronda de combate:** fase de planeamento separada da resolução; resolução alternada entre equipas, uma ação de cada vez; começa a equipa com mais iniciativa (roll + Agility, melhor resultado da equipa). **Substitui D14 (PvE)**                                                                                    | 2026-11-21 | `combat/engine.ts`, ADR-033                                                                           |
| D48  | **Focus** (o antigo "Flow" não existe): gerado por personagem no início de cada ronda pela Precision, mínimo 3. O Focus não gasto **acumula até um limite** (resposta do dono; mantém D24)                                                                                                                             | 2026-11-21 | `FOCUS_RULES`, `COMBAT_RULES.focusMax`                                                                |
| D49  | Dentro de cada equipa, as ações resolvem-se **pela ordem planeada**                                                                                                                                                                                                                                                    | 2026-11-21 | `resolveRound`                                                                                        |
| D50  | Mudar de posição custa 1 Focus; Block custa 1 Focus, acumula e desaparece no fim da ronda (substitui "expira no próprio turno" de D34). Dano no HP = max(0, dano − Block)                                                                                                                                              | 2026-11-21 | `BASIC_ACTIONS`, `absorbWithBlock`                                                                    |
| D51  | Decisões de grupo no Rift (caminho e abordagem dos eventos): **votação**, maioria, o líder desempata                                                                                                                                                                                                                   | 2026-11-21 | `run.ts` (`vote`, `tally`)                                                                            |
| D52  | Num evento com teste, **o grupo escolhe quem tenta** (rola dado + atributo base dessa pessoa)                                                                                                                                                                                                                          | 2026-11-21 | `run.ts` (`resolveDecision`)                                                                          |
| D53  | **Armas:** catálogo por tipo (espada, machado, adaga, lança, maça, arco, cajado, varinha); a mesma arma do mesmo nível tem sempre os mesmos números e o mesmo ataque básico; upgrades +1, +2…; até 5 especiais e 2 slots de runa trancados (Runemaster = futuro)                                                       | 2026-11-21 | `content/weapons.ts`, ADR-034                                                                         |
| D54  | **Custo do ataque básico depende da arma:** armas pesadas e de muito dano custam 3 Focus; adagas 1                                                                                                                                                                                                                     | 2026-11-21 | `WEAPON_TYPES.*.basicAttackCost`                                                                      |
| D55  | **Se a equipa morrer toda, não leva loot do Rift** (nem o que encontrou pelo caminho)                                                                                                                                                                                                                                  | 2026-11-21 | `finish()` em `rifts.service.ts`                                                                      |
| D56  | Dungeon Threat: implementar já uma versão simples para testar a mecânica                                                                                                                                                                                                                                               | 2026-11-21 | `THREAT_RULES`, ADR-035                                                                               |
| D57  | Modo PvP de teste                                                                                                                                                                                                                                                                                                      | 2026-11-21 | `createPvpEncounter`, lobbies `pvp_arena`, ADR-037                                                    |
| D58  | **Profissões** (estilo Project Zomboid): muitas (Runesmith, Blacksmith, Pescador, …), com níveis que melhoram o sucesso e os resultados; equilíbrio depois                                                                                                                                                             | 2026-11-21 | `content/professions.ts`, `modules/professions`, ADR-036                                              |
| D59  | **PvE é como Slay the Spire:** as ações dos jogadores acontecem logo (em tempo real); quando todos terminam o turno, os inimigos fazem as ações deles. Mais fácil e fluido. **O PvP mantém** o planeamento + resolução alternada (substitui D47 no PvE)                                                                | 2026-11-21 | `planAction`/`resolveRound` (`combat/engine.ts`), `CombatPage.tsx`, ADR-038                           |
| D60  | **Formação em linha:** 4 posições por lado numa só linha (frente, 2.ª, 3.ª, trás), como na imagem de referência; grupo/lobby de **4** (PvP 4 contra 4). Substitui D38 (3 × 2) e D18 (lobby de 6); D41 (ataque à coluna) passa a ser ataque a uma posição                                                               | 2026-11-21 | `SLOTS_PER_SIDE`, `COMBAT_COLUMNS`, `LOBBY_MAX_MEMBERS`, `combat-layout.ts`, `LobbyPage.tsx`, ADR-039 |
| D61  | **Mapa = um continente em 4 zonas:** um país a oeste, um a este, um a norte; no meio, a área neutra infetada pelos Rifts. Hexágonos com a cor do país; 1 hexágono de capital por país (tudo placeholder). A seguir: sistema de AP = tempo das atividades (mover entre hexágonos gasta AP; ganha-se X AP por hora real) | 2026-11-21 | `content/world-map.ts`, `map-scene.ts` (`REGION_COLORS`), `WorldPage.tsx` (`HexInfo`), ADR-040        |
| D62  | **Cartão do item** ao estilo da imagem de referência: efeito base, nome, tipo, requisitos para usar; secção de efeitos bónus (até 5); "Rune slots [usados/total]" só aparece se o item tiver slots desbloqueados                                                                                                       | 2026-11-21 | `ItemCard.tsx`, `ItemDto` (`affixes`, `requirements`, `runeSlots`), ADR-041                           |
| D63  | **Cor/raridade = número de efeitos bónus:** 0 Common (cinza), 1 Uncommon (verde), 2 Rare (azul), 3 Epic (roxo), 4 Legendary (laranja), 5 Mythic (vermelho)                                                                                                                                                             | 2026-11-21 | `rarityOf`, `RARITY_NAMES`, `--rarity-*` (`tokens.css`)                                               |
| D64  | **Requisitos para usar = atributos base** (como a regra dos BASE STATS)                                                                                                                                                                                                                                                | 2026-11-21 | `itemRequirements`, `checkRequirements`, `planEquip`                                                  |
| D65  | **Efeitos bónus variados, em todo o equipamento** (armas, mão secundária, armadura, acessórios): atributos, stats derivados, ofensivos em %, efeitos de combate                                                                                                                                                        | 2026-11-21 | `content/affixes.ts` (`AFFIXES`)                                                                      |
| D66  | **Upgrades +0 a +10 só melhoram os stats base da arma** (dano/valores das habilidades); não mudam requisitos nem efeitos                                                                                                                                                                                               | 2026-11-21 | `upgradeMultiplier`, `itemRequirements` (sem nível)                                                   |
| D67  | **Efeitos bónus = pool:** cada efeito tem um intervalo (ex.: roubo de vida 3–8%); quando aparece num item, o valor é sorteado dentro do intervalo. Os intervalos atuais são aleatórios, por definir (A67)                                                                                                              | 2026-11-21 | `AFFIXES` (`min`/`max`), `rollAffixes`                                                                |
| D68  | **Espaços de equipamento:** mão principal, mão secundária, cabeça, corpo, botas, anel 1, anel 2, pendente ("pelo menos, para já"). Substitui D25                                                                                                                                                                       |
| D69  | **Skills preparadas:** as habilidades (as que se aprendem nos livros) são imensas; prepara-se **8** para o combate. Em combate: 8 skills + as habilidades da arma + Block e Swap Position (garantidos). Substitui D23 ("todas disponíveis")                                                                            |
| D70  | **Perfil do personagem em tabs:** Equipamento + inventário (drag and drop, tooltips dos itens) / Habilidades / Profissões                                                                                                                                                                                              |
| D71  | **Entrar no jogo = entrar com o último personagem jogado**, no hex onde ficou; escolher personagem passa a ser secundário (botão pequeno no canto)                                                                                                                                                                     | 2026-11-21 | `PlayEntry.tsx` (rota `/`), `GameShell.tsx` (botão "Switch character"), `LoginPage.tsx`, ADR-043      |
| D72  | **O ecrã principal é o hex onde estás** (pode não ser uma cidade): imagem do local + o que se pode fazer lá (falar com NPCs, sair, loja, …) e **chat do hex** com os jogadores que lá estão                                                                                                                            | 2026-11-21 | `content/locations.ts`, `HomePage.tsx`, `LocationScene.tsx`, `chat.send`/`chat.message`, ADR-043      |
| D73  | **2 espaços de personagem por conta**; mais espaços desbloqueiam-se mais tarde (dinheiro real ou outra forma, por decidir)                                                                                                                                                                                             | 2026-11-21 | `MAX_CHARACTERS_PER_ACCOUNT=2`, `CharacterSelectPage.tsx` (espaço bloqueado)                          |
| D74  | **Criação de personagem mais curta:** nome, país de origem, kit inicial e aparência; os pontos de atributo gastam-se depois na ficha                                                                                                                                                                                   | 2026-11-21 | `CharacterCreatePage.tsx`, `createCharacterRequestSchema`                                             |
| D75  | **País de origem** escolhido na criação; o personagem começa na **capital** desse país                                                                                                                                                                                                                                 | 2026-11-21 | `NATION_IDS`, `capitalOf`, `characters.nation`                                                        |
| D76  | **AP = tempo das atividades:** andar entre hexágonos gasta AP; **máximo 120**, **+10 AP por hora real**                                                                                                                                                                                                                | 2026-11-21 | `ap.ts` (`AP_RULES`), `characters.ap/ap_updated_at`, `POST /characters/:id/move`                      |
| D77  | **Kits iniciais:** espada, arco, adaga, ou um feitiço de nível 1 (**Fireball**, com varinha)                                                                                                                                                                                                                           | 2026-11-21 | `STARTER_KITS`, habilidade `fireball`                                                                 |
| D78  | **Perder um Rift:** cada peça equipada perde **1–3 %** de durabilidade (substitui D30)                                                                                                                                                                                                                                 | 2026-11-21 | `DEFEAT_QUALITY_LOSS`, `qualityAfterDefeat`                                                           |
| D79  | **Sem Dodge (esquiva aleatória):** o personagem nunca falha por esquiva; os poderes podem falhar pelas regras deles. O antigo **Block passa a chamar-se Dodge** (mesma mecânica, sem sorte)                                                                                                                            | 2026-11-21 | `engine.ts`, `stats.ts`, textos de combate                                                            |
| D80  | **Admin:** o email do dono é sempre admin (guardado como hash, o repositório é público); máx. de personagens = 2                                                                                                                                                                                                       | 2026-11-21 | `plugins/auth.ts`, `MAX_CHARACTERS_PER_ACCOUNT`                                                       |
| D81  | **Rifts em hexágonos específicos** das Riftlands; quanto mais para o centro da zona neutra, mais difíceis e com mais Threat                                                                                                                                                                                            | 2026-11-21 | `world-map.ts` (`placeRifts`), `rifts.ts` (`RIFT_TIER_RULES`)                                         |
| D82  | **World boss** que vagueia pelas Riftlands, temático por **época**, com vida enorme (meses para matar), **leaderboard** das parties por dano; as parties decidem lutar                                                                                                                                                 | 2026-11-21 | `content/world-boss.ts`, `modules/worldboss/`, `WorldBossPage.tsx`                                    |
| D83  | **Menos "browser":** sem o menu do botão direito do navegador                                                                                                                                                                                                                                                          | 2026-11-21 | `lib/app-feel.ts`                                                                                     |
| D84  | **Terreno nos hexágonos** (florestas, rios, minas, …) e as profissões de recolha só se fazem no terreno certo                                                                                                                                                                                                          | 2026-11-21 | `TERRAINS`, `GATHERING_TERRAIN`                                                                       |
| D85  | **Equilibrar os inimigos** (não as armas)                                                                                                                                                                                                                                                                              | 2026-11-21 | `content/enemies.ts`, `content/rifts.ts`, `pnpm sim`                                                  |
| D86  | **Agilidade aumenta o valor da ação Dodge**                                                                                                                                                                                                                                                                            | 2026-11-21 | `BASIC_ACTIONS.block.perAgility`, `engine.ts`                                                         |
| D87  | **Recompensa no fim da época do world boss** para a party que deu mais dano                                                                                                                                                                                                                                            | 2026-11-21 | `WORLD_BOSS_SEASONS[].reward`, `settleSeason`                                                         |
| D88  | **Mais inimigos com mecânicas únicas** nos Rifts; **efeitos com ícones como no Slay the Spire**, também nos poderes                                                                                                                                                                                                    | 2026-11-21 | `enemies.ts`, `EffectIcon.tsx`, `UnitChips.tsx`, `AbilityBar.tsx`                                     |
| D89  | **Mais tipos de arma**, escolhidos por mim a pedido do dono ("pensa tu"): espadão, machado grande, machado de mão, martelo, martelo grande, morning star, lança de cavaleiro, besta                                                                                                                                    | 2026-11-21 | `weapons.ts`, `items.ts`, `abilities.ts`                                                              |
| D90  | **Uma arma por atributo e uma por cada combinação de 2 atributos** (6 + 15 = 21 tipos); **cada arma tem só 2 ações**: o ataque básico e 1 poder                                                                                                                                                                        | 2026-11-21 | `WEAPON_TYPES`, `ITEMS`, `weapons.test.ts`                                                            |
| D91  | **Muitas skills (feitiços aprendidos)**: buffs, debuffs, dano, cura, mudanças de estado; umas livres e outras com requisitos de atributo, coerentes (ex. Espada Rotativa, Investida)                                                                                                                                   | 2026-11-21 | `content/skills.ts`, livros `SKILL_BOOKS`                                                             |
| D92  | **Reputação de Rifts decrescente:** derrotar um Rift dá X; a 2.ª vez menos; depois ainda menos; depois nada (por personagem e por Rift)                                                                                                                                                                                | 2026-11-21 | `reputation.ts`, `rifts.service.ts` (`finish`)                                                        |
| D93  | **Equipamento equipado melhor dá mais reputação**; mais tarde também haverá reputação por profissões                                                                                                                                                                                                                   | 2026-11-21 | `gearReputationBonusPct`, `reputationBonusPct`                                                        |
| D94  | Viajar gasta menos AP; **entrar num Rift gasta 2 AP**; **sem separador "Rifts"** (vai-se ao hexágono e entra-se)                                                                                                                                                                                                       | 2026-11-22 | `AP_RULES`, `GameShell.tsx`                                                                           |
| D95  | **Drops proporcionais ao tier** (raro no tier 1 = muito raro) e **popup** com o que caiu                                                                                                                                                                                                                               | 2026-11-22 | `dropAffixWeightsByTier`, `LootList.tsx`                                                              |
| D96  | **Dinheiro (ouro)**: ao acabar um Rift e encontrado dentro do Rift                                                                                                                                                                                                                                                     | 2026-11-22 | `characters.gold`, `RIFT_GOLD_RULES`                                                                  |
| D97  | **Pesquisa na mochila**; **armazém** e **loja geral** nas cidades; **mochila de 20**                                                                                                                                                                                                                                   | 2026-11-22 | `CityService`, `INVENTORY_RULES`                                                                      |
| D98  | **Ferreiro estilo Metin2**: +1 a +3 só ouro e sorte (pode partir); **Pergaminho da Bênção**: em vez de partir, perde 1 nível; +4 a +10 também pede materiais da família da arma                                                                                                                                        | 2026-11-22 | `UPGRADE_STEPS`, `WEAPON_FAMILIES`                                                                    |
| D99  | **Ler o livro de uma skill que já tens sobe-a de nível**                                                                                                                                                                                                                                                               | 2026-11-22 | `SKILL_RULES`, `useItem`                                                                              |
| D100 | **Tooltips nos atributos** a explicar o que fazem; **slots de cinto e cara (máscaras)**                                                                                                                                                                                                                                | 2026-11-22 | `attributeEffects`, `EQUIP_SLOTS`                                                                     |
| D101 | **Ecrãs do mesmo tamanho**, a usar o ecrã todo                                                                                                                                                                                                                                                                         | 2026-11-22 | `global.css` (`.contain`)                                                                             |
| D102 | **15 profissões** (spec #51): recolha — Hunting, Fishing, Herbalism, Woodcutting, Mining; criação — Crafter, Blacksmith, Runecrafter, Carpentry, Leatherworking, Tailoring, Jewelcrafting, Alchemy, Cooking, Scribing. Todos podem aprender todas                                                                      | 2026-11-22 | `content/professions.ts`                                                                              |
| D103 | **Mastery com 6 ranks** (Novice, Apprentice, Journeyman, Expert, Master, Grandmaster), independente por profissão; o progresso depende da complexidade (farmar coisas baratas não chega a Grandmaster); não mexe nos atributos de combate                                                                              | 2026-11-22 | `MASTERY_RULES`, `complexityFactor`                                                                   |
| D104 | **Ferramentas são itens do inventário** (cana, machado, picareta, faca de caça); não substituem a Mastery                                                                                                                                                                                                              | 2026-11-22 | `TOOLS` (`items.ts`)                                                                                  |
| D105 | **Atributos BASE podem ajudar** nas profissões (§21), configurável e só no servidor; complementam a Mastery                                                                                                                                                                                                            | 2026-11-22 | `ProfessionDef.attributes`, `PROFESSION_ATTRIBUTE_RULES`                                              |
| D106 | Ecrã de profissões com **Gathering Mastery** e **Crafting Mastery**; perfil profissional de outros jogadores                                                                                                                                                                                                           | 2026-11-22 | `ProfessionsPage.tsx`, `InspectPage.tsx`                                                              |
| D107 | Atividades de profissão custam **AP ou tempo real**: recolher gasta AP (sem espera), criar gasta tempo real (sem AP)                                                                                                                                                                                                   | 2026-11-22 | `AP_RULES.gatherCost`, `professions.service.ts`                                                       |
| D108 | **Pesquisa, filtro e arrastar-e-largar no armazém**                                                                                                                                                                                                                                                                    | 2026-11-22 | `CityPage.tsx` (`Storage`)                                                                            |
| D109 | **Skills com 21 níveis: 1–10, M1–M10, P**; fracas no início e a melhorar a cada nível; rever todas (ex. Expose Weakness)                                                                                                                                                                                               | 2026-11-22 | por fazer (pedido #53)                                                                                |
| D110 | **Rifts mudam todos os dias** de posição e de ameaça; **mais Rifts**, alguns já dentro dos territórios; **pirâmide** (muitos de ameaça baixa, poucos de alta)                                                                                                                                                          | 2026-11-22 | `riftLayout`, `RIFT_LAYOUT_RULES`                                                                     |
| D111 | **Trabalhos de profissão**: escolher quantas tentativas e pagar **em AP** (tudo já) ou **em tempo real** (os itens chegam no fim)                                                                                                                                                                                      | 2026-11-22 | `startJob`, `JOB_RULES`                                                                               |
| D112 | **Guildas**: máx. 16 membros; reputação da guilda ganha a fazer coisas juntos (Rifts, raids); ícone e cor; armazém da guilda; o líder convida e expulsa; comprar terreno de guilda                                                                                                                                     | 2026-11-22 | `content/guilds.ts`, `guilds.service.ts`                                                              |
| D113 | **Visual coerente "premium RPG"** pela referência do dono: painéis escuros com molduras douradas, títulos dourados, ícones redondos com gradiente e símbolo branco                                                                                                                                                     | 2026-11-22 | `styles/theme.css`, `tokens.css`                                                                      |
| D114 | **Nenhuma página com scroll**; só caixas por dentro                                                                                                                                                                                                                                                                    | 2026-11-22 | `theme.css`, e2e "screens fit"                                                                        |
| D115 | **Mochila, armazém e loja em grelha**; arrastar e fica na posição; juntar e dividir pilhas; botão de ordenar; **armazém com 80 espaços** (mais espaços pagos com dinheiro real no futuro)                                                                                                                              | 2026-11-22 | `items.slot`, `ItemGrid.tsx`                                                                          |
| D116 | **Valores dos poderes sempre inteiros, arredondados para baixo**                                                                                                                                                                                                                                                       | 2026-11-22 | `skillAtLevel`, `engine.ts`                                                                           |
| D117 | **Rifts com 10–20 salas por percurso (pelo tier)**; **fogueiras raras**: máx. 3 num fácil, mín. 1                                                                                                                                                                                                                      | 2026-11-22 | `RIFT_SIZE_RULES`, `mapTemplateForTier`                                                               |
| D118 | O AP no topo atualiza logo que uma atividade o gasta                                                                                                                                                                                                                                                                   | 2026-11-22 | `GameShell.tsx`                                                                                       |
| D119 | **Itens com nome (named)**: versões de um item base com bónus fixos que crescem com +1…+10 (ex. 10 espadas); **armaduras Light, Medium e Heavy**; filtro de procura                                                                                                                                                    | 2026-11-22 | `content/named.ts`, `ItemDef.armorClass`                                                              |
| D120 | **Mercado de jogadores**: o jogador deixa o item com um preço e fica à venda até alguém comprar; **máx. 20 itens por jogador**; só no mercado da cidade onde foi posto (cidades/aldeias)                                                                                                                               | 2026-11-22 | `market.service.ts`, `MARKET_RULES`                                                                   |
| D121 | **O conteúdo principal ocupa o espaço; a mochila (20) é uma coluna compacta**; o que acontece numa sala do Rift abre **num popup à frente de tudo**; páginas coerentes e óbvias                                                                                                                                        | 2026-11-22 | `city.css`, `sheet.css`, `RunPage.tsx`                                                                |
| D122 | **Livros por nível**: chegar ao nível N pede N livros (1, 2 … 10, M1 = 11 … M10 = 20, P = 21); **a leitura pode falhar**                                                                                                                                                                                               | 2026-11-22 | `booksToReach`, `readChance`                                                                          |

## Decisões em aberto / valores provisórios (confirmar com o dono)

| #    | Assunto                                                         | Valor provisório                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Onde mudar                                                                       |
| ---- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| A1   | Máximo de personagens por conta                                 | **2 (decidido, D73)**; desbloquear mais espaços: forma e preço por decidir                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `.env` → `MAX_CHARACTERS_PER_ACCOUNT`                                            |
| A2   | Nome do mundo                                                   | "The Living Realms" (slug `main`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `packages/db/src/seed.ts`, `WORLD_SLUG`                                          |
| A3   | Regras de nome do personagem                                    | 3–20 letras; espaços, apóstrofos e hífens                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `packages/game-core/src/character.ts`                                            |
| A4   | Aparência                                                       | cor (8) + emblema (8), provisória                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | ver CHANGE_MAP → "Aparência"                                                     |
| A5   | Custo de AP por hexágono (o "X")                                | **ver A79** (o sistema de AP existe desde o pedido #43)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `AP_RULES`                                                                       |
| A6   | Ritmo do relógio do mundo                                       | 1 tick a cada 5 s                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `.env` → `WORLD_TICK_MS`                                                         |
| A7   | Hexágono onde nascem os personagens                             | **decidido em D75**: na capital do país escolhido                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `capitalOf`                                                                      |
| A8   | Língua da documentação técnica                                  | inglês                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | —                                                                                |
| A9   | Alojamento                                                      | Railway (aprovado, a funcionar)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `infra/railway/*.json`                                                           |
| A10  | Fórmulas das estatísticas                                       | HP = 20 + 2×CON; Mana = 10 + 2×INT; Defesa = armadura + mod CON; Iniciativa = mod DEX; Esquiva/Crítico = 5% + 2%×mod DEX (máx. 75%); poderes = mod do atributo                                                                                                                                                                                                                                                                                                                                                                                             | `packages/game-core/src/stats.ts` (`STAT_RULES`)                                 |
| A11  | Conteúdo inicial (armas, armaduras, habilidades, custos, danos) | Espada de treino, arco de caça, cajado de aprendiz; túnica; escudo, gorro, perneiras, 2 acessórios para drops futuros                                                                                                                                                                                                                                                                                                                                                                                                                                      | `packages/game-core/src/content/*`                                               |
| A12  | Kit inicial                                                     | arma escolhida + túnica acolchoada                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `STARTER_WEAPONS`, `STARTER_ARMOR`                                               |
| A13  | Personagens antigos                                             | atributos 10 em tudo + espada de treino + túnica                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | migração `0002_…`                                                                |
| A14  | "Atinge a fila da frente"                                       | = a primeira fila **ocupada** (se a da frente estiver vazia, a de trás fica exposta)                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `content/abilities.ts` (M2)                                                      |
| A15  | Pontos não gastos no point-buy                                  | permitidos                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `validatePointBuy`                                                               |
| A16  | Limite de Focus acumulado                                       | por definir (M2)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | —                                                                                |
| A17  | Inimigos do Rift de teste                                       | placeholders neutros: Rift Husk, Shard Spitter, Hollow Hound, Rift Warden (boss)                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `content/enemies.ts`                                                             |
| A18  | Equilíbrio do Rift de teste (simulação, 300 combates)           | solo: espada 31%, arco 20%, cajado 46% de vitórias; grupo de 2–3: ~100%                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `content/abilities.ts`, `content/enemies.ts`                                     |
| A19  | Abandonar um Rift                                               | conta como derrota (o equipamento perde qualidade), para não se fugir à penalização                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `rifts.service.ts`                                                               |
| A20  | Posição inicial no combate                                      | espada na fila da frente; arco e cajado na fila de trás                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `rifts.service.ts`                                                               |
| A21  | Opções do corpo base                                            | tipo de corpo, tom de pele, penteado, cor do cabelo, cor dos olhos, cor da roupa                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `CharacterAvatar`                                                                |
| A22  | Arte                                                            | desenhada em código (SVG em camadas) como base provisória; arte profissional substitui as camadas mais tarde                                                                                                                                                                                                                                                                                                                                                                                                                                               | ADR-021                                                                          |
| A23  | Meta de dificuldade a solo                                      | média: ~40–50% de vitórias; grupos de 2–3 ~100% (simulação: espada+escudo 52%, machado 32%, adagas 68%, arco 56%, cajado 60%, tomo+talismã 26%; média 49%)                                                                                                                                                                                                                                                                                                                                                                                                 | conteúdo em `game-core/src/content`                                              |
| A24  | Armas iniciais                                                  | espada, machado, adaga, arco, cajado, tomo; mão secundária opcional: escudo, talismã ou adaga                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `STARTER_WEAPONS`, `STARTER_OFFHANDS`                                            |
| A25  | Amigos                                                          | por personagem (adiciona-se pelo nome do personagem); pedido → aceitar/recusar                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `modules/social`                                                                 |
| A26  | Lobby público                                                   | entra quem quiser até 6; o líder pode expulsar; também há lobbies privados (só por convite)                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `lobbies.service.ts`                                                             |
| A27  | Jogador desligado a meio do combate                             | o turno passa aos 60 s (sem controlo automático)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `COMBAT_RULES.turnSeconds`                                                       |
| A28  | Sair de um Rift em grupo                                        | só quem sai sofre a penalização (−25% qualidade); o grupo continua; se for o último, é derrota                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `rifts.service.ts`                                                               |
| A29  | Atualização em tempo real no lobby/combate                      | o browser pergunta ao servidor a cada ~1,5 s (simples e robusto a esta escala; push por WebSocket fica para mais tarde)                                                                                                                                                                                                                                                                                                                                                                                                                                    | `features/rifts/api.ts`                                                          |
| A30  | Alcance por coluna                                              | corpo-a-corpo = primeira coluna ocupada (front → mid → back); distância/magia = qualquer coluna; Volley = coluna de trás inteira; Cleave/Rift Slam = primeira coluna ocupada inteira                                                                                                                                                                                                                                                                                                                                                                       | `content/abilities.ts`                                                           |
| A31  | Posições iniciais                                               | corpo-a-corpo na front; arco, cajado e tomo na back                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `startingSlot`                                                                   |
| A32  | Habilidades de apoio (curar/proteger um aliado)                 | continuam a escolher a pessoa; só os ataques são por coluna                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `content/abilities.ts`                                                           |
| A33  | Proteção de coluna                                              | escudo: "Shield Wall" (Block para a coluna inteira); inimigo-tanque "Rift Bulwark"                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `content/*`                                                                      |
| A34  | Ritmo das animações de combate                                  | 650 ms por ação (420 ms com "reduzir movimento"); a fase dos inimigos joga-se ataque a ataque e os controlos esperam pelo fim                                                                                                                                                                                                                                                                                                                                                                                                                              | `apps/web/src/features/rifts/combat-scene.ts` (`stepMs`)                         |
| A35  | Ecrã inicial (Hub)                                              | losangos: Rifts, Mundo, Herói; menus laterais: Amigos, Lobbies, Crónica / Herói, Inventário, Online, Trocar personagem; barra de baixo: Personagem, Rifts, Home, Mundo, Amigos                                                                                                                                                                                                                                                                                                                                                                             | `apps/web/src/features/game/HomePage.tsx`, `GameShell.tsx`                       |
| A36  | Atalhos das habilidades                                         | teclas 1–9 pela ordem da barra; Esc cancela a escolha de alvo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `apps/web/src/features/rifts/AbilityBar.tsx`                                     |
| A37  | Custo do ataque básico                                          | **decidido em D54** (por arma)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `WEAPON_RULES.basicAttackFocusCost`                                              |
| A38  | Fórmula do Focus por ronda                                      | 3 + 1 por cada 2 de Precision acima de 5, máx. 6 (5→3, 7→4, 9→5, 11→6); limite acumulado 8 (A16)                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `FOCUS_RULES`, `COMBAT_RULES.focusMax`                                           |
| A39  | Iniciativa                                                      | d10 + Agility; empate = moeda ao ar                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `COMBAT_RULES.initiativeDie`                                                     |
| A40  | Block (ação)                                                    | 5 por uso, fixo (sem escala)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `BASIC_ACTIONS.block.amount`                                                     |
| A41  | Números das armas                                               | danos base: espada 6–8, machado 5–10, adaga 8–10, lança 4–6 (atinge as 2 colunas mais próximas), maça 7–9, arco 4–6, cajado 6–8 (mágico, qualquer coluna), varinha 4–6, tomo 4–6; escala 60% primário / 40% secundário; upgrade +10% por nível (máx. +10). Machado passou a uma mão (especificação). Lança, maça e varinha só têm o ataque básico                                                                                                                                                                                                          | `content/weapons.ts`                                                             |
| A42  | Mapa do Rift                                                    | 7 filas + boss, 5 colunas, 4 caminhos (≈ 23 salas, 8 por caminho); 1.ª fila = Combat; fila antes do boss = Campsite; Elite a partir da fila 3; 1–2 salas secretas                                                                                                                                                                                                                                                                                                                                                                                          | `DEFAULT_MAP_TEMPLATE`                                                           |
| A43  | Itens de Loot/Secret/eventos                                    | **substituído por D55**: só são entregues se o grupo vencer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `run.ts` (`grants`), `rifts.service.ts`                                          |
| A44  | Campsite                                                        | automático: +30% HP, +40% Mana, remove todos os debuffs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `EXPLORATION_RULES.campsite`                                                     |
| A45  | Testes de atributos                                             | d10 + atributo base ≥ dificuldade (fácil 11–12, média 13, difícil 14); procura passiva de sala secreta: melhor Precision base do grupo vs 14 ao entrar na sala vizinha                                                                                                                                                                                                                                                                                                                                                                                     | `EXPLORATION_RULES`, `content/events.ts`                                         |
| A46  | Eventos e estados de exploração                                 | 8 eventos (porta selada, ídolo, ponte, névoa tóxica, corredor armadilhado, glifos, aventureiro caído, nascente); debuffs Shaken/Cursed/Poisoned/Exhausted, vantagens Inspired/Warded                                                                                                                                                                                                                                                                                                                                                                       | `content/events.ts`, `CONDITIONS`                                                |
| A47  | Elites                                                          | os mesmos inimigos com ×1,6 HP, ×1,3 poder, +2 Precision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `ELITE_RULES`                                                                    |
| A48  | Tempo para votar sem votos                                      | sem votos: o 1.º caminho / a abordagem sem teste                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `resolveDecision`                                                                |
| A49  | Recompensas do boss                                             | 40 de reputação + 2 drops (antes 25 + 1, a dungeon é mais longa)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `content/rifts.ts`                                                               |
| A50  | Equilíbrio (simulação de corridas completas, 100 por build)     | média a solo 53%: espada+escudo 40%, machado+escudo 54%, lança 55%, maça 54%, adagas 32%, arco 70%, cajado 46%, varinha 60%, tomo+talismã 63%; grupos de 2–3: 100%                                                                                                                                                                                                                                                                                                                                                                                         | `pnpm sim`                                                                       |
| A51  | Dungeon Threat                                                  | versão simples implementada (D56, A54)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | —                                                                                |
| A52  | Custos de ataque básico (além dos definidos)                    | espada 2, lança 2, arco 2, cajado 2, varinha 1, tomo 1 (machado 3, maça 3, adaga 1 = dono); danos base: espada 13–16, machado 18–28, adaga 8–10, lança 8–11, maça 22–26, arco 8–10, cajado 11–14, varinha 4–6, tomo 4–6                                                                                                                                                                                                                                                                                                                                    | `content/weapons.ts`                                                             |
| A53  | Quem sai a meio de um Rift                                      | também perde o loot encontrado (conta como derrota para essa pessoa)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `finish()`                                                                       |
| A54  | Threat (simples)                                                | +1 por teste falhado num evento, +1 por votação que acaba sem decisão; −1 ao limpar uma Elite; máx. 10. Níveis do boss: 2 (+15% HP), 4 (+30% HP, +15% dano), 6 (+45% HP, +30% dano, +1 Focus). Visível no topo do mapa                                                                                                                                                                                                                                                                                                                                     | `THREAT_RULES`                                                                   |
| A55  | PvP de teste                                                    | Arena por lobby (até 6 contra 6; equipa A = slots 0–5, B = 6–11); mesmas regras de combate; planos da outra equipa escondidos; sem recompensas e sem perda de qualidade; sair = a tua equipa perde se ficar vazia                                                                                                                                                                                                                                                                                                                                          | `PVP_ARENA_ID`, `lobbies.service.ts`                                             |
| A56  | Profissões e atividades                                         | 15: Fishing, Mining, Woodcutting, Herbalism, Hunting, Farming, Blacksmithing, Runesmithing, Carpentry, Leatherworking, Tailoring, Jewelcrafting, Alchemy, Cooking, Medicine; níveis 0–10; XP para subir = 40 + 30×nível; +5% de sucesso por nível (máx. 95%); +10% por nível de chance de 1 item extra; reparar = 15 + 4×nível de qualidade; melhorar arma (+1, até +5) fica −15% mais difícil por cada +                                                                                                                                                  | `content/professions.ts`, `PROFESSION_RULES`                                     |
| A57  | Custo de tempo das profissões                                   | sem AP ainda: cada atividade deixa a profissão ocupada 20–40 s                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `cooldownSeconds`                                                                |
| A58  | Materiais e consumíveis                                         | empilham (`items.quantity`); consumíveis (comida, poções, ligaduras) ainda não se usam — futuro: recuperação no Rift; runas: só a pedra em branco                                                                                                                                                                                                                                                                                                                                                                                                          | `MATERIALS`                                                                      |
| A59  | Equilíbrio (100 corridas por build)                             | média a solo 54%: espada+escudo 41%, machado+escudo 49%, lança 61%, maça 53%, adagas 32%, arco 74%, cajado 50%, varinha 60%, tomo+talismã 63%                                                                                                                                                                                                                                                                                                                                                                                                              | `pnpm sim`                                                                       |
| A60  | Equilíbrio depois do PvE estilo Slay the Spire (60 corridas)    | média a solo **80%** (era 54%): adagas e tomo+talismã 100%, varinha 98%, arco 95%, lança 80%, cajado 78%, maça 60%, machado+escudo 57%, espada+escudo 50% — o grupo age sempre primeiro; **por afinar** (inimigos mais fortes ou mais dano)                                                                                                                                                                                                                                                                                                                | `pnpm sim`, `content/enemies.ts`                                                 |
| A61  | Alcance na linha de 4                                           | corpo a corpo = inimigo mais próximo; lança, Cleave, Rift Slam = os 2 mais próximos; distância/magia = qualquer posição; Shield Wall/Bulwark = Block para os 2 da frente; corpo a corpo começa à frente, distância/magia atrás                                                                                                                                                                                                                                                                                                                             | `content/abilities.ts`, `startingSlot`                                           |
| A62  | Corridas e lobbies abertos durante a mudança de formação        | fechados sem penalização (migração 0010)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `0010_one_line_formation.sql`                                                    |
| A63  | Equilíbrio com a linha de 4 (40 corridas por build)             | média a solo 47% (volta ao alvo de 40–50%; o corpo a corpo só alcança o mais próximo)                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `pnpm sim`                                                                       |
| A64  | Mapa (placeholder): nomes, cores, tamanho e forma               | "Kingdom of the West/East/North", "The Riftlands"; capitais "West/East/North Capital"; azul/vermelho/verde/roxo; continente oval ~44 × 32 hexágonos (1 114 hexágonos: ~290 por país, ~300 Riftlands); capitais em (−14, 2), (12, 2), (5, −10)                                                                                                                                                                                                                                                                                                              | `content/world-map.ts`, `REGION_COLORS` (`map-scene.ts`)                         |
| A65  | Onde nascem os personagens                                      | **decidido em D75** (capital do país de origem); Emberhold (A75) deixou de existir                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `characters.service.ts`                                                          |
| A66  | Sistema de AP                                                   | **decidido em D76** (máx. 120, +10 por hora real); custo por hexágono em A79                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `AP_RULES`                                                                       |
| A67  | Catálogo de efeitos bónus (pedido #37)                          | atributos +1–3; Health +5–20, Mana +4–12, Armor/Magic Resist +2–8, Initiative +1–3, Dodge +1–5%, Focus por ronda +1; Damage +3–10%, Critical chance +2–6%, Critical damage +10–25%, Damage vs bosses +5–15%; Bleed/Burn on hit 5–15%, Stun on hit 2–5%, Life steal 3–8%, Thorns 2–6. Sangrar/queimar on hit: 3 por ronda, 2 rondas; atordoar 1 ronda. Cada efeito só pode rolar em certos tipos de item                                                                                                                                                    | `AFFIXES`, `AFFIX_RULES`                                                         |
| A68  | Quantos efeitos traz um drop                                    | 0: 50%, 1: 28%, 2: 13%, 3: 6%, 4: 2,5%, 5: 0,5% (drops do boss e itens encontrados no Rift; itens fabricados e o kit inicial vêm sem efeitos)                                                                                                                                                                                                                                                                                                                                                                                                              | `AFFIX_RULES.dropAffixWeights`, `rollDropAffixes`                                |
| A69  | Requisitos das armas                                            | atributo principal da arma ≥ 5 (por agora sempre cumprido); **não mudam com o upgrade** (D66). Armaduras e acessórios: sem requisitos (campo `requirements` pronto para itens que peçam mais)                                                                                                                                                                                                                                                                                                                                                              | `REQUIREMENT_RULES`, `ItemDef.requirements`                                      |
| A70  | Efeitos que já existem nos itens                                | o campo `items.specials` passa a guardar os efeitos bónus de qualquer equipamento; ids desconhecidos são ignorados                                                                                                                                                                                                                                                                                                                                                                                                                                         | `normalizeAffixes`                                                               |
| A71  | Peças antigas nos espaços novos                                 | Leather Leggings passam a Leather Boots (botas); acessórios → anéis; Charm of Focus → pendente (se estava equipado, volta ao inventário); a receita de Leatherworking faz botas                                                                                                                                                                                                                                                                                                                                                                            | `content/items.ts`, migração 0011                                                |
| A72  | Habilidades por arma                                            | **Não alterado:** as armas dão 1–4 habilidades (espada 3, adaga 4, lança 1…), não 2. Falta decidir se se corta para 2 por arma e quais                                                                                                                                                                                                                                                                                                                                                                                                                     | `content/items.ts` (`abilities`)                                                 |
| A73  | Livros de skills                                                | Ainda não existem livros nem skills de livro: a biblioteca aparece vazia. As skills já aprendidas (se houver) ficaram preparadas nos primeiros 8 espaços                                                                                                                                                                                                                                                                                                                                                                                                   | `content/abilities.ts`, `character_skills`                                       |
| A74  | Loadout dentro do Rift                                          | Não se pode mudar as skills preparadas durante um Rift (como o equipamento)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `sheet.service.ts` (`assertNotInRift`)                                           |
| A75  | Cidade inicial (hex 0,0)                                        | **substituído (pedido #43)**: começa-se na capital do país; (0,0) é agora Riftlands                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `content/locations.ts`                                                           |
| A76  | Hexes sem nome                                                  | "Open wilds": Rifts, Workshop e Leave; imagem genérica de campo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `content/locations.ts`, `LocationScene.tsx`                                      |
| A77  | Imagens dos locais                                              | desenhos SVG provisórios feitos em código (cidade, campo); trocar por ilustrações reais                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `apps/web/src/features/game/LocationScene.tsx`                                   |
| A78  | Chat do hex                                                     | 200 caracteres por mensagem; últimas 50 mensagens guardadas 24 h (Redis); 5 seguidas e depois 1 por segundo                                                                                                                                                                                                                                                                                                                                                                                                                                                | `CHAT_MAX_LENGTH`, `CHAT_HISTORY` (`protocol.ts`), `gateway.ts`, `connection.ts` |
| A79  | Custo de viajar                                                 | **1 AP por hexágono** (pedido #50)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `AP_RULES.moveCostPerHex`                                                        |
| A80  | Entradas de Rift                                                | 14 nas Riftlands, a ≥ 4 hexágonos umas das outras; o centro tem sempre uma (tier 5)                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `RIFT_SITE_COUNT`, `placeRifts`                                                  |
| A81  | Dificuldade por tier                                            | por tier acima de 1: +25 % de vida e +15 % de dano dos inimigos, +1 de Threat inicial, +50 % de reputação; nomes Fringe/Shallow/Deep/Abyssal/Heart Rift                                                                                                                                                                                                                                                                                                                                                                                                    | `RIFT_TIER_RULES`                                                                |
| A82  | Onde se fazem profissões                                        | recolha: pesca = rio; mineração = montanha; lenhador = floresta; ervas e caça = floresta ou planície; agricultura = planície. Ofícios (ferreiro, etc.) em qualquer lado                                                                                                                                                                                                                                                                                                                                                                                    | `GATHERING_TERRAIN`                                                              |
| A83  | Terreno (geração)                                               | montanhas, florestas e planícies por ruído; 1 rio por região, da montanha mais alta até ao mar; arte provisória                                                                                                                                                                                                                                                                                                                                                                                                                                            | `world-map.ts`                                                                   |
| A84  | Personagens antigos                                             | passam a ser do Reino do Oeste e vão para a capital do Oeste (migração 0013)                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `0013_nations_ap_world_boss.sql`                                                 |
| A85  | World boss, época 1                                             | "The Hollow Colossus" (tema "The Hollow"); **5 000 000 de vida**; armadura/resistência 30, dano ×3; muda de hexágono a cada 3 horas                                                                                                                                                                                                                                                                                                                                                                                                                        | `WORLD_BOSS_SEASONS`, `hollow_colossus`                                          |
| A86  | Tentativas no world boss                                        | 1 luta por personagem por dia (UTC); luta até a party cair; solo ou em lobby (todos no hexágono do boss)                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `WORLD_BOSS_RULES`                                                               |
| A87  | Recompensas do world boss                                       | **decidido em D87**; valores em A93                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `WORLD_BOSS_SEASONS`                                                             |
| A88  | Kit inicial e pontos                                            | sem escudo/offhand na criação; os 12 pontos ficam todos por gastar na ficha                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `STARTER_KITS`                                                                   |
| A89  | Fireball (nível 1)                                              | 1 Focus + 4 Mana; 5–7 de dano mágico e Burn 2 por 2 rondas; qualquer posição                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `abilities.ts` (`fireball`)                                                      |
| A90  | Agilidade sem Dodge                                             | a Agilidade passa a dar só Iniciativa (e testes); o efeito bónus "Dodge" deixou de existir                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `stats.ts`, `affixes.ts`                                                         |
| A91  | Equilíbrio sem Dodge                                            | **resolvido no pedido #44** (ver A92)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `pnpm sim`                                                                       |
| A92  | Equilíbrio após o pedido #44 (150–200 corridas por build)       | média a solo **51 %** (alvo 40–50 %): espada+escudo 39 %, machado+escudo 25 %, lança 51 %, maça 40 %, adagas 80 %, arco 66 %, cajado 30 %, varinha 61 %, tomo+talismã 73 %. Mudanças: sala do boss = Warden à frente + Spitter (o corpo a corpo alcança o boss), Warden 130 de vida, armadura 10, dano ×1.2; Husk 30 de vida e dano ×1.15; Spitter 20 de vida e dano ×1.15; Hound dano ×1.1; elites ×1.75 vida e ×1.4 dano. Adagas e tomo continuam fortes, machado e cajado fracos (seria ajuste das armas)                                               | `enemies.ts`, `rifts.ts`                                                         |
| A93  | Recompensa e fim da época 1                                     | fim a 2027-03-01 (ou quando o boss morre); cada membro da party com mais dano recebe 1 000 de reputação e o pendente "Heart of the Hollow" (+2 a todos os atributos)                                                                                                                                                                                                                                                                                                                                                                                       | `WORLD_BOSS_SEASONS`, `hollow_heart`                                             |
| A94  | Dodge e Agilidade                                               | +1 de Dodge por cada 2 de Agilidade na ação Dodge (5 + 2 com Agilidade 5)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `BASIC_ACTIONS.block`                                                            |
| A95  | Inimigos novos (números)                                        | Rift Leech (dreno), Thornback (Espinhos 3), Void Shaman (Força +3 e cura aos aliados), Brood Mother (invoca Volatile Mites), Volatile Mite (rastilho: explode 8 a todos 2 rondas depois), Phase Stalker (Intangível em rondas alternadas), Rift Zealot (Ritual: +2 de Força por ronda)                                                                                                                                                                                                                                                                     | `enemies.ts`, `abilities.ts`                                                     |
| A96  | Ícones                                                          | desenhados em código (SVG); número em baixo à direita = valor, em cima = rondas restantes                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `EffectIcon.tsx`                                                                 |
| A97  | Armas novas (números e poderes)                                 | Espadão 2M 12–16 a 2 inimigos (Executioner ×2 vs Marked); Machado grande 2M 26–34 (Rampage: Bleed 4); Machado de mão 1M, qualquer mão, 14–17 (Throw Axe a qualquer inimigo); Martelo 1M 21–25 (Concuss: atordoa); Martelo grande 2M 24–30 (Earthshaker: 2 inimigos + Weakened); Morning Star 1M 10–13 + Bleed (Flail Spin); Lança 2M 14–17, alcança os 2 mais próximos (Charge: Marked); Besta 2M 12–15 à distância (Piercing Bolt ×2 vs Dodge). Encontram-se nos Rifts (boss e salas de saque). Simulação: entre 43 % e 63 % a solo, média geral 53 %     | `weapons.ts`, `rifts.ts`                                                         |
| A98  | Atributos de cada arma (pedido #46)                             | Só um: Força = machado grande; Agilidade = adaga; Precisão = besta; Resistência = maça; Intelecto = varinha; Vontade = cetro. Pares: For+Agi espada; For+Pre lança curta (spear); For+Res machado; For+Int espadão; For+Von morning star; Agi+Pre arco; Agi+Res machado de mão; Agi+Int chakram; Agi+Von foice; Pre+Res lança de cavaleiro; Pre+Int tomo; Pre+Von funda; Res+Int martelo grande; Res+Von martelo; Int+Von cajado. Os poderes que deixaram as armas (Rend, Volley, Puncture, Shadowstep, Arcane Bolt, Mend) continuam a existir como skills | `weapons.ts`, `items.ts`                                                         |
| A99  | Equilíbrio das 21 armas (150 corridas)                          | média a solo 55 %; de 37 % (morning star+escudo) a 77 % (duas adagas); adagas, lança de cavaleiro e besta ainda fortes (~70–77 %)                                                                                                                                                                                                                                                                                                                                                                                                                          | `pnpm sim`                                                                       |
| A100 | Skills (números e requisitos)                                   | 34 skills (6 livres, 28 com requisitos de 6 a 9 em atributos de BASE; 5 pedem dois atributos); ver lista em `content/skills.ts`. Aprendem-se lendo livros ("Book: …") que caem no boss (peso 0,5 cada) e nas salas secretas (peso 1 cada); ler = duplo clique na mochila; fica logo preparada se houver espaço                                                                                                                                                                                                                                             | `skills.ts`, `rifts.ts`                                                          |
| A101 | Estado e efeito novos                                           | Regeneration (cura no início de cada ronda); Purify/First Aid removem estados maus (Bleed, Burn, Marked, Weakened, Stunned)                                                                                                                                                                                                                                                                                                                                                                                                                                | `engine.ts`                                                                      |
| A102 | Reputação por vitória no mesmo Rift                             | 1.ª vez 100 %, 2.ª 50 %, 3.ª 25 %, a partir da 4.ª 0 % (conta por entrada de Rift, ex. `rift_3_8`)                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `REPUTATION_RULES.riftClearFactors`                                              |
| A103 | Bónus de reputação do equipamento                               | +3 % por cada efeito bónus (raridade) e +2 % por nível de upgrade de cada peça equipada; máximo +100 %                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `REPUTATION_RULES`                                                               |
| A104 | Ouro dos Rifts                                                  | vitória 25–40, sala de saque 5–12, sala secreta 12–25 (cada um ×1 + 0,5 por tier acima de 1)                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `RIFT_GOLD_RULES`                                                                |
| A105 | Raridade por tier (pesos 0…5 efeitos)                           | tier 1: 85/13/1,7/0,25/0,05/0; tier 3: 55/30/11/3/0,8/0,2; tier 5: 25/30/25/13/5/2                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `AFFIX_RULES.dropAffixWeightsByTier`                                             |
| A106 | Mochila e armazém                                               | 20 espaços (uma pilha = 1); o armazém é do personagem e usa-se em qualquer capital; saque que não cabe vai para o armazém                                                                                                                                                                                                                                                                                                                                                                                                                                  | `INVENTORY_RULES`, `giveItem`                                                    |
| A107 | Loja geral                                                      | poções 15, ligadura 5, Blessing Scroll 150, armas básicas 35–40, armaduras básicas 25–35; compra só equipamento usado (base 8–12 + 15 por efeito + 10 por upgrade, × qualidade); nunca materiais                                                                                                                                                                                                                                                                                                                                                           | `SHOP_STOCK`, `npcSellPrice`                                                     |
| A108 | Ferreiro                                                        | +1 50 g 90 %, +2 100 g 80 %, +3 200 g 70 %, +4 350 g 60 % + 1 material, +5 500 g 50 % + 2, +6 750 g 40 % + 3, +7 1000 g 30 % + 4, +8 1500 g 20 % + 5, +9 2000 g 15 % + 6, +10 3000 g 10 % + 8; só armas; famílias: lâminas, machados, contundentes, hastes, à distância, arcanas                                                                                                                                                                                                                                                                           | `UPGRADE_STEPS`                                                                  |
| A109 | AP                                                              | viajar 1 AP por hexágono (era 2); entrar num Rift 2 AP (a solo e em lobby, por cada membro)                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `AP_RULES`                                                                       |
| A110 | Níveis de skill                                                 | máx. 5; +10 % por nível acima do 1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `SKILL_RULES`                                                                    |
| A111 | Profissões antigas fora da lista                                | Farming passou para Herbalism (grão e linho) e Medicine para Tailoring (ligaduras); níveis 0–2 → Novice, 3–5 → Apprentice, 6–8 → Journeyman, 9–10 → Expert                                                                                                                                                                                                                                                                                                                                                                                                 | `RENAMED_PROFESSIONS`, migração 0016                                             |
| A112 | Mastery                                                         | pontos para subir: 100, 250, 600, 1400, 3000; queda por complexidade 100 % / 50 % / 15 % / 0; +10 % de sucesso por rank acima do pedido; +15 % de item extra por rank                                                                                                                                                                                                                                                                                                                                                                                      | `MASTERY_RULES`                                                                  |
| A113 | Ferramentas iniciais                                            | todas as personagens recebem cana, machado, picareta e faca (novas ao criar; existentes na migração); loja vende-as a 20 g; Herbalism não pede ferramenta; ferramentas não gastam durabilidade (ainda)                                                                                                                                                                                                                                                                                                                                                     | `STARTER_TOOLS`, `SHOP_STOCK`                                                    |
| A114 | Ferramentas finas                                               | tier 2: +5 % de sucesso; pedem Apprentice para usar; feitas por Crafters (Apprentice)                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `TOOLS`, `TOOL_RULES`                                                            |
| A115 | Atributos BASE (§21)                                            | +1 % por ponto ponderado acima de 5, máx. 8 %; pesos por profissão (ex. Mining: Might 0,5 + Endurance 0,5)                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `PROFESSION_ATTRIBUTE_RULES`, `ProfessionDef.attributes`                         |
| A116 | Receitas e Scribing                                             | receitas desbloqueiam só por rank nesta fase; Scribing faz pergaminho, tinta e pergaminhos em branco (copiar livros fica para a fase 6); acima de Expert faltam receitas mais complexas (fases 2–3)                                                                                                                                                                                                                                                                                                                                                        | `content/professions.ts`                                                         |
| A117 | AP das profissões                                               | recolher 2 AP por tentativa; criar sem AP, 20 s de espera por defeito                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `AP_RULES.gatherCost`, `cooldownSeconds`                                         |
| A118 | Nós de recursos                                                 | um por hexágono e profissão de recolha; 12 / 20 / 30 cargas (pobre / normal / rico; 25 % pobres, 20 % ricos); 5 cargas por hora; só o sucesso gasta uma carga; partilhados por todos                                                                                                                                                                                                                                                                                                                                                                       | `RESOURCE_NODE_RULES`                                                            |
| A119 | Qualidade dos materiais                                         | Poor, Common, Fine, Superior, Exceptional; rolagem 0–99 + 8 por rank ± 12 pela riqueza; limites 20/70/92/110; gasta-se primeiro o pior; materiais antigos ficam Common                                                                                                                                                                                                                                                                                                                                                                                     | `GRADE_RULES`, `rollGrade`                                                       |
| A120 | Níveis de skill                                                 | 1–10: +10 % por nível (10 = ×1,9); M1–M10: +8 % por nível (M10 = ×2,7); P: +30 % (×3); estados (não Stun) +1 ronda em M1 e +1 em P; Mark/Weaken 25 % no nível 1, máx. +100 % / −75 %; números com uma casa decimal                                                                                                                                                                                                                                                                                                                                         | `SKILL_RULES`, `COMBAT_RULES`                                                    |
| A121 | Rifts diários                                                   | mudam à meia-noite UTC; 30 por dia: 12 × T1, 8 × T2, 5 × T3, 3 × T4, 2 × T5; T1–T2 também nas nações; T4 a partir de 40 % de profundidade e T5 de 65 %; 3 hexágonos de distância entre Rifts e das capitais; uma corrida já começada continua depois da meia-noite                                                                                                                                                                                                                                                                                         | `RIFT_LAYOUT_RULES`                                                              |
| A122 | Trabalhos                                                       | até 50 tentativas; em AP: recolher 2 AP e criar 1 AP por tentativa; em tempo real: recolher 10 min por tentativa, criar o tempo da receita (20 s); um trabalho de cada vez e enquanto corre não se pratica mais nada; materiais e cargas do nó tirados no início (as cargas das tentativas falhadas voltam)                                                                                                                                                                                                                                                | `JOB_RULES`                                                                      |
| A123 | Guildas                                                         | fundar 500 ouro; terreno 2000 ouro do banco (hexágono onde o líder está; não capital, não rio, a ≥ 3 das capitais; um por guilda); armazém 40 espaços, usado em capitais ou no terreno; qualquer membro guarda e tira; reputação = a reputação dos membros num Rift vencido com ≥ 2 membros; 12 ícones e 10 cores; líder sai → passa ao membro mais antigo; último sai → guilda acaba                                                                                                                                                                      | `GUILD_RULES`                                                                    |
| A124 | Tamanho dos Rifts                                               | 10, 13, 15, 18, 20 salas por percurso (tier 1–5, boss incluído); fogueiras por percurso: 3, 3, 2, 2, 1 (a de antes do boss conta); pesos de fogueira muito baixos                                                                                                                                                                                                                                                                                                                                                                                          | `RIFT_SIZE_RULES`                                                                |
| A125 | Grelhas                                                         | mochila 5 × 4; armazém 80 (10 colunas); dividir = Shift ao largar (escolhe-se a quantidade); ordenar: tipo (armas, mãos secundárias, armaduras, acessórios, ferramentas, consumíveis, materiais), depois mais efeitos, mais upgrade, nome, qualidade                                                                                                                                                                                                                                                                                                       | `compareItemsForSort`                                                            |
| A126 | Itens com nome                                                  | 47 itens (10 espadas, 1 por cada outra arma, 2 mãos secundárias, 9 armaduras, 6 acessórios); efeitos fixos × multiplicador do upgrade (arredondado para baixo); caem raramente no boss (peso 0,12 cada) e um pouco mais nas salas secretas (0,3); Dragon Heavy Armor: Armor +5, Agility −3, 25 % de pegar fogo a quem bate corpo a corpo; armaduras: Light (pouca armadura, mais resistência mágica), Medium, Heavy (muita armadura, −1 Agility no peito, pede Endurance)                                                                                  | `NAMED_ITEMS`, `ITEMS`                                                           |
| A127 | Mercado                                                         | só nas capitais (ainda não há aldeias); sem taxa; o vendedor recebe o ouro mesmo offline; tirar de volta só na cidade onde está à venda; uma pilha vende-se inteira                                                                                                                                                                                                                                                                                                                                                                                        | `MARKET_RULES`                                                                   |
| A128 | Falha da leitura                                                | 96 % para o nível 2, −4 por nível, mínimo 20 % (10 = 64 %, M1 = 60 %, P = 20 %); falhar gasta os livros                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `SKILL_RULES.readChance*`                                                        |

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

### #36 — 2026-11-21 — Mapa: continente com 3 países e a zona neutra dos Rifts

**Pedido:** "Vai ser um continente. Dividido em 4 zonas. Um país à esquerda,
outro à direita e outro em cima. A área no meio dos países é a área neutra,
infetada por rift. Para já, preciso de pôr os hex da cor do país que são e ter
1 hex por capital do país (tudo placeholder). Depois vamos fazer o sistema de
AP" (tempo das atividades; mover gasta AP; ganha-se X AP por hora real).
**Decisões:** D61; valores provisórios A64–A66; ADR-040.
**Resultado:**

- `packages/game-core/src/content/world-map.ts`: o continente gerado de forma
  determinística (sem BD): `REGIONS` (3 países + Riftlands, capital de cada
  país), `worldMapHexes`, `mapHexAt`, `regionAt`. Costa com ruído, sem ilhotas;
  as Riftlands ficam no meio, tocam nos 3 países e abrem para a costa sul.
- Mapa (PixiJS): desenha o continente inteiro com a cor de cada região,
  fronteiras e costa, um castelo em cada capital e os nomes das regiões quando
  se afasta o zoom (zoom mínimo 0.45 → 0.2); o mar não se seleciona.
- Painel do hexágono: mostra a região (e a capital), ex. "The Riftlands · Hex (0, 0)".
- Spawn continua em (0, 0), agora no centro das Riftlands (A65).
- e2e do Rift em grupo: traz a página A para a frente e espera até 20 s pela linha "left the Rift" (o registo espera pela animação da fase inimiga, que quase pára numa página em segundo plano; falhava no CI); o teste passa a ter 90 s (eram 30 s).
- Testes: 81 unitários (+6 do mapa), 65 de integração, 18 web, 9 e2e (o e2e
  verifica a região do hexágono inicial e tira captura do continente).
- Docs: CHANGE_MAP, DECISIONS (ADR-040), ROADMAP, ARCHITECTURE.

### #37 — 2026-11-21 — Cartão do item, efeitos bónus, raridade, requisitos e runas

**Pedido:** os equipamentos devem parecer-se com a imagem enviada (cartão da
"Dawn Sword"): efeito base, nome, tipo de item e os requisitos base para usar.
A cor indica quantos efeitos bónus tem (verde = 1). A secção "Stat" passa a ser
a dos efeitos bónus, até 5. Onde diz "Warrior Set" deve dizer
"Rune slot 0/2" se o item tiver slots de runa; se não tiver, nem aparece. Os
efeitos bónus são variados.
**Perguntas ao dono (respondidas):** escala de cores (cinza → verde → azul →
roxo → laranja → vermelho), requisitos = atributos base, tipos de efeitos
(atributos, stats derivados, ofensivos em %, efeitos de combate), em todo o
equipamento.
**Decisões:** D62–D65; valores provisórios A67–A70.
**Resultado:**

- game-core: `content/affixes.ts` (catálogo de 24 efeitos, raridade,
  `rollAffixes`, `gearTotals`); `computeStats` soma os efeitos do equipamento
  (atributos, HP, mana, armadura, resistência, iniciativa, esquiva, crítico,
  Focus); requisitos (`itemRequirements`, `checkRequirements`) e `planEquip`
  recusa equipar sem os atributos base.
- Combate: `CombatantView.gear` (+% dano, +% contra bosses, roubo de vida,
  espinhos, sangrar/queimar/atordoar ao acertar), passado pelo `combatProfile`
  → `RunMember.gear` → `PartyMemberInput.gear`.
- Servidor: `ItemDto` ganha `rarity`, `affixes`, `requirements` (com `met`
  para o personagem) e `runeSlots`; drops e itens encontrados no Rift rolam
  efeitos (A68). Sem migração (usa `items.specials` e `items.rune_slots`).
- Interface: `ItemCard.tsx` — cabeçalho com a cor da raridade, "+N" do
  upgrade, tipo, efeito base grande (dano ou armadura), requisitos (vermelho se
  não cumpridos), "Bonus effects [n/5]", "Rune slots [usados/total]"; inventário
  em grelha de cartões; clicar num item equipado abre o cartão.
- Testes: 84 unitários (9 novos), 67 de integração (2 novos), e2e da ficha com
  o cartão.
- Docs: CHANGE_MAP ("Cartão do item e efeitos bónus"), DECISIONS (ADR-041).

### #38 — 2026-11-21 — Upgrades só mudam os stats base; efeitos são uma pool

**Pedido:** "O efeito de +0 até +10 não muda nada sem ser os stats base da
arma. O resto é uma pool: por exemplo, roubo de vida pode ser de 3% a 8% e,
quando o bónus aparece, é uma % entre esses valores (valores aleatórios, não
pensados). Assim como todos."
**Decisões:** D66, D67; A69 atualizado.
**Resultado:**

- Requisitos já não sobem com o upgrade (`itemRequirements(def)` sem nível);
  o upgrade continua a mudar só o dano base e os valores das habilidades da arma.
- Pool de efeitos: já funcionava assim (`rollAffixes` sorteia o valor entre
  `min` e `max` de cada efeito); fica registado como decisão.
- Testes atualizados (game-core e servidor).

### #39 — 2026-11-21 — Perfil do personagem: tabs, inventário e skills

**Pedido:** "A página de perfil está horrível." Inventário separado das skills;
Block e Swap Position não são skills (são garantidos), tal como as habilidades
das armas; as Abilities são as dos livros. Equipar: mão, cabeça, corpo, off
hand, botas, anel 1, anel 2, pendente. Inventário com drag and drop e tooltips
decentes. Skills numa tab à parte (vão ser imensas); preparar 8 (8 + 2 da arma

- Block e Swap). Outra tab com as profissões.
  **Decisões:** D68, D69, D70; valores provisórios A71–A74.
  **Resultado:**

* Espaços novos `feet`, `ring1`, `ring2`, `pendant` (saem `legs`,
  `accessory1/2`); Leather Leggings → Leather Boots; Charm of Focus → pendente.
* Skills preparadas: coluna `character_skills.loadout_slot` (0–7, única por
  personagem), `PUT /api/characters/:id/loadout`, `planLoadout`; o combate só
  usa as preparadas (+ arma + Block/Swap). Migração 0011 (slots e loadout).
* Ficha: tabs Equipment / Abilities / Professions (`?tab=`). Equipment: boneco
  com 8 espaços, mochila em grelha com filtros, drag and drop por ponteiro
  (rato e toque), duplo clique para equipar/desequipar, tooltips completas
  (dano, custo, escala, habilidades que dá, qualidade), atributos + stats.
  Abilities: 8 espaços preparados (arrastar ou clicar), biblioteca com pesquisa
  e filtros, "Always available" (arma + ações básicas). Professions: o mesmo
  painel da página de profissões.
* Testes: 77 unitários, 67 de integração, 18 web, 9 e2e.
* Docs: CHANGE_MAP, DECISIONS (ADR-042), ROADMAP.

### #40 — 2026-11-21 — Entrar com o último personagem, ecrã do hex, chat e 2 espaços

**Pedido:** (1) ao entrar no jogo, entrar sempre com o último personagem
jogado, sem ter de escolher; (2) ao abrir o jogo aparece-se no hex onde se
ficou (pode não ser uma cidade), com uma imagem do local e as coisas que se
podem fazer lá (falar com NPCs, sair, loja, …); (3) chat do hex com os
jogadores que lá estão; (4) a troca de personagem estava em muitos botões —
deve ser secundária, num canto; (5) 2 espaços de personagem, o resto
desbloqueia-se depois (dinheiro real ou outra coisa).
**Decisões:** D71–D73; valores provisórios A75–A78 (A1 passa a decidido).
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
- Docs: CHANGE_MAP, DECISIONS (ADR-043), ARCHITECTURE, ROADMAP, DATABASE.

### #41 — 2026-11-21 — Controlo de "admin" para testar

**Pedido:** "Cria uma forma de admin control. O user conseguir criar armas /
adicionar poderes etc. para testar. Eu sou o único admin."
**Decisões (técnicas, ADR-044):**

- Admin = contas cujo email está na variável `ADMIN_EMAILS` do servidor (não
  há forma de alguém se tornar admin pelo jogo). **No Railway, o dono tem de
  acrescentar `ADMIN_EMAILS=<o seu email>` ao serviço `server`.**
- Armas e habilidades criadas pelo admin ficam na base de dados
  (`custom_content`) e entram num registo do game-core; funcionam no combate,
  na ficha, na barra de habilidades e na arte (pelo tipo de arma) sem deploy.
- Uma arma personalizada escolhe um tipo do catálogo, que lhe dá o ataque
  básico (sempre o primeiro), as mãos e a arte — respeita o ADR-034.
- Definições editam-se mas não se apagam (itens e corridas podem usá-las).
- Mudanças feitas durante um Rift contam a partir da próxima corrida.

**Resultado:**

- Página `/admin` (link "Admin" no ecrã de personagens, só para o admin) com 3
  separadores:
  - **Characters:** qualquer personagem de qualquer conta — dar itens (com
    upgrade +0–+10 e qualidade), mudar qualidade/upgrade, remover itens,
    ensinar/esquecer habilidades (incluindo as de inimigos e as personalizadas),
    mudar atributos base, pontos por gastar e reputação.
  - **Items & weapons:** criar/editar armas (tipo, uma/duas mãos, mão
    secundária), mãos secundárias (escudo/talismã), armaduras e acessórios, com
    habilidades concedidas, bónus de atributos, armadura e resistência mágica.
  - **Abilities:** criar/editar habilidades (skill ou de arma): custos de
    Focus/Mana, alvo (inimigos/aliados/próprio, alcance, área), até 6 efeitos
    (dano, cura, Block, estado, bónus contra estado) e escala por atributo, com
    pré-visualização do texto.
- Todas as ações do admin ficam em `world_events` (`admin.*`).
- Testes: 6 unitários (game-core), 5 de integração (servidor), 2 e2e.
- Docs: CHANGE_MAP ("Admin e conteúdo personalizado"), DECISIONS ADR-044,
  DATABASE, ARCHITECTURE §9, ROADMAP, DEPLOY_RAILWAY, `.env.example`.

### #42 — 2026-11-21 — Juntar ao main o trabalho das outras sessões

**Pedido:** "Dá commit a tudo e puxa tudo para o main. E a funcionar no
Railway." / "Não deste commit às alterações do inventário e isso que pedi?" —
o trabalho de outras sessões estava em ramos que nunca chegaram ao `main`.
Escolhidos pelo dono: inventário, cartões de itens, hex + chat + 2 espaços,
ferramentas de admin (o ramo de reorganização dos docs, de manhã, ficou de fora).
**Resultado:**

- Juntados os ramos: cartões de itens (#37, #38), perfil com tabs e inventário
  (#39), entrar no hex + chat + 2 espaços (#40), admin (#41; era o #32 no ramo).
  Pedidos, decisões (D62–D73), valores provisórios (A67–A78) e ADRs
  (041–044) renumerados para não colidir.
- Cartão do item + inventário novo: o cartão passou a ser a caixa que aparece
  ao passar o rato num item (raridade com cor, requisitos, efeitos bónus,
  runas); a mochila e os espaços mostram o contorno da raridade.
- Admin com os espaços novos: armaduras head/body/feet; acessórios = anel
  (ring1/ring2) ou pendente; alcances com as 4 posições; skill ensinada pelo
  admin fica logo preparada no 1.º espaço livre; habilidades dadas por uma
  arma do admin aparecem em "From your weapons".
- Migração do admin renumerada: `0012_admin_custom_content.sql` (era 0009).
- Testes: 101 unitários, 76 de integração, 19 web, 11 e2e.

### #43 — 2026-11-21 — País de origem, AP, terreno, Rifts no mapa, world boss

**Pedido:** criação de personagem mais curta com país de origem (começa na
capital); kits: espada, arco, adaga ou Fireball de nível 1. Sistema de AP para
andar (máx. 120, +10 por hora real; o custo por hexágono não interessa para
já). Perder um Rift: −1 a 3 % de durabilidade. Sem mecânica de Dodge; o
"Block" passa a chamar-se Dodge. Admin com o email do dono; máx. 2
personagens. Rifts em hexágonos específicos, mais difíceis e com mais Threat
para o centro da zona neutra. World boss que vagueia na zona neutra, muito
difícil (meses), com leaderboard das parties por dano, temático por época.
"Menos browser": sem o menu do botão direito. Hexágonos de floresta, rio,
minas… onde se fazem as profissões.
**Perguntas feitas:** nome Block/Dodge (→ Block passa a Dodge), arma do
Fireball (→ varinha), formato da luta com o boss (→ até a party cair, 1 por
dia), movimento (→ clicar em qualquer hexágono, paga AP × distância).
**Decisões:** D74–D84; valores provisórios A79–A90; ADR-045, ADR-046.
**Resultado:**

- Criação: nome, país (3 cartões com a cor do país), kit (4) e aparência;
  personagem nasce na capital; Fireball aprendida e preparada no kit dela.
- AP: `currentAp` calculado a partir do valor guardado e da hora;
  `POST /api/characters/:id/move`; o mapa tem "Travel here · N AP"; a barra de
  cima mostra o AP; os outros jogadores veem a viagem (`player.moved`).
- Mapa: terreno com desenho (árvores, picos, água), 14 entradas de Rift com o
  tier (T1–T5), o world boss; o ecrã do hexágono diz o que se pode fazer lá.
- Rifts: só se entra (solo ou lobby) estando no hexágono; o tier aumenta a
  vida e o dano dos inimigos, a Threat inicial e a reputação.
- Profissões de recolha só no terreno certo (a página diz onde).
- World boss: tabelas `world_bosses` / `world_boss_attempts` (migração 0013),
  `/api/world-boss`, página com vida, leaderboard e lutar (sozinho ou lobby).
- Combate: sem esquiva aleatória; Block → Dodge nos textos; perder um Rift
  tira 1–3 % de durabilidade.
- Admin: o email do dono é sempre admin (hash no código, não aparece no
  repositório público). Sem menu do botão direito nem seleção de texto fora dos campos.
- Equilíbrio: sem Dodge a média a solo desceu para 35 % e o corpo a corpo ficou muito fraco (A91, por decidir).
- Testes: 111 unitários, 83 de integração, 20 web, 11 e2e.

### #44 — 2026-11-21 — Equilíbrio, Agilidade no Dodge, recompensa da época, inimigos novos e ícones

**Pedido:** "1. Equilibra os inimigos. 2. Agilidade pode dar também mais dodge
value na ação de dodge. 3. Sim, vai ter recompensa no fim da época para a party
que deu mais dano. 4. Mantém assim." Criar mais inimigos com mecânicas únicas
nos Rifts; os efeitos com ícones como o Slay the Spire, também nos poderes.
"Há algumas armas que escalam com agilidade, como as daggers, acho."
**Decisões:** D85–D88; valores provisórios A92–A96.
**Resultado:**

- 7 inimigos novos com mecânicas próprias (dreno, espinhos, buffs e curas,
  invocação, rastilho/explosão, intangível, ritual) em 5 salas novas e 2 elites;
  a mecânica de cada um aparece na lista de inimigos do combate.
- Estados novos no motor: Força, Espinhos, Intangível, Ritual, Rastilho;
  efeitos de dreno e invocação.
- Ícones (estilo Slay the Spire) nos estados das unidades, nas intenções dos
  inimigos, no Dodge, nos poderes da barra e na ficha (aba Abilities).
- Agilidade: +1 de Dodge por cada 2 pontos na ação Dodge.
- Equilíbrio: média a solo 51 % (era 35 %), corpo a corpo de volta ao jogo (A92).
- World boss: fim da época (data ou morte do boss) dá a recompensa à party com
  mais dano, uma vez (migração 0014).
- Armas com Agilidade: adagas (principal Agilidade + Precisão), espada
  (Força + Agilidade) e arco (Precisão + Agilidade) — já era assim.
- Testes: 116 unitários, 84 de integração, 20 web, 11 e2e.

### #45 — 2026-11-21 — Mais tipos de arma

**Pedido:** "Adiciona também mais weapon types. Temos muitas: lance, dagger, bow,
crossbow, sword, moonstar, greatsword, greataxe, handaxe, hammer, greathammer, e
mais. Pensa tu."
**Decisões:** D89; valores provisórios A97.
**Resultado:**

- 8 tipos novos no catálogo, cada um com ataque básico e um poder próprio, e uma
  arma de cada (Iron Greatsword, Bearded Greataxe, Hand Axe, War Hammer, Great
  Maul, Morning Star, Knight's Lance, Light Crossbow), que caem nos Rifts.
- Mecânica nova: dano extra contra quem tem Dodge (besta).
- Desenhos (provisórios) no personagem para as armas novas e para lança, maça e
  varinha, que ainda não tinham; ícones das habilidades.
- Simulador com as armas novas; afinadas para 43–63 % a solo.
- Testes: 118 unitários, 84 de integração, 20 web, 11 e2e.

### #46 — 2026-11-21 — Uma arma por atributo e por par de atributos

**Pedido:** "Tem que haver uma arma para cada atributo e uma arma de combinação
entre 2 atributos para todos os atributos. E cada arma tem 2 poderes."
**Pergunta feita:** o ataque básico conta? (→ "2 no total": básico + 1 poder).
**Decisões:** D90; valores provisórios A98–A99.
**Resultado:**

- 21 tipos de arma: 6 de um atributo e 15 de dois, cada combinação uma só vez
  (o teste garante-o). Armas existentes redistribuídas; 4 novas: Cetro
  (Vontade), Chakram (Agi+Int), Foice (Agi+Von), Funda (Pre+Von).
- Cada arma tem só o ataque básico + 1 poder; lança curta, maça e varinha
  ganharam um poder (Skewer, Stagger, Focused Bolt).
- Itens novos (Oak Scepter, Rune Chakram, Reaper Scythe, Leather Sling) nos
  saques dos Rifts; desenhos e ícones provisórios.
- Simulador com 21 builds; danos afinados (A99).
- Testes: 120 unitários, 84 de integração, 20 web, 11 e2e.

### #47 — 2026-11-21 — Muitas skills, livres e com requisitos

**Pedido:** "Cria uma data de poderes/skills. Uns com requisitos de atributo e
outros livres (com coerência). Dar buffs, debuffs, poderes, dano, cura, etc.
Status change. Espada rotativa. Investida. Funciona como spells."
**Decisões:** D91; valores provisórios A100–A101.
**Resultado:**

- 34 skills em `content/skills.ts` (livres; Força; Agilidade; Precisão;
  Resistência; Intelecto; Vontade; dois atributos).
- Livros de skill (um por skill) nos saques dos Rifts; ler o livro (duplo
  clique) ensina a skill se os atributos de base chegarem, prepara-a e gasta o
  livro (`POST /api/characters/:id/items/:itemId/use`).
- Estado novo Regeneration e efeito de purificar; o tooltip do livro mostra os
  ícones dos efeitos e os requisitos.
- Testes: 122 unitários, 86 de integração, 20 web, 11 e2e.

### #48 — 2026-11-21 — Como dar coisas ao meu personagem (admin)

**Pedido:** "Como spawno coisas para o meu personagem, visto que sou admin?"
**Resultado:**

- Explicado o painel `/admin` (botão "Admin" no ecrã de escolha de personagem
  → separador Characters → "Give item" / "Teach ability").
- O painel passou a listar também os livros de skill, consumíveis e materiais
  ("Give item") e as 34 skills ("Teach ability"); antes só tinha equipamento e
  habilidades de armas/inimigos.

### #49 — 2026-11-21 — Sistema de reputação

**Pedido:** "Derrotar um Rift dá X reputação, derrotar a segunda vez dá menos, e
depois ainda menos. E depois não dá nada. O equipamento (enquanto equipado),
quanto melhor for, mais reputação dá. Depois também vai haver outras formas
relacionadas com profissões."
**Decisões:** D92–D93; valores provisórios A102–A103.
**Resultado:**

- `packages/game-core/src/reputation.ts`: fatores por vitória (100/50/25/0 %) e
  bónus do equipamento; o servidor conta as vitórias anteriores no mesmo Rift.
- O fim do Rift mostra "time #2: 50 %, gear +12 %"; a ficha mostra o bónus.
- Reputação das profissões: fica para depois (ROADMAP).
- Testes: 124 unitários, 86 de integração, 20 web, 11 e2e.

### #50 — 2026-11-22 — AP, drops, ouro, cidade (loja, armazém, ferreiro), skills, slots, ecrãs

**Pedido:** viagens a gastar muito AP; popup com os drops e drops proporcionais
ao tier; entrar num Rift gasta AP (2); pesquisa no inventário; armazém e lojas
gerais nas cidades; ferreiro estilo Metin2 com Pergaminho da Bênção e materiais
por família de +4 a +10; dinheiro nos Rifts; sem separador "Rifts"; ecrãs do
mesmo tamanho. Depois: subir o nível de uma skill lendo o livro de novo;
inventário com limite de 20; tooltips nos atributos; slots de cinto e cara.
**Decisões:** D94–D101; valores provisórios A104–A110.
**Resultado:**

- AP: 1 por hexágono; 2 para entrar num Rift (erro `NOT_ENOUGH_AP`).
- Drops: raridade pelo tier; ouro nos Rifts; popup com cartões coloridos por
  raridade nas salas de saque e no fim do Rift.
- Cidade (`/city/shop|storage|blacksmith`, só em capitais): loja geral,
  armazém, ferreiro. A melhoria de armas saiu da profissão de ferreiro (passou
  para o ferreiro da cidade), para não haver dois sistemas iguais.
- Mochila: 20 espaços, pesquisa por nome; o saque que não cabe vai para o armazém.
- Skills sobem até nível 5 com livros repetidos; nível visível na aba Abilities.
- Slots novos: cinto e cara (Leather Belt, Bone Mask nos saques e na loja).
- Tooltips nos atributos (gerados das regras reais).
- Todos os ecrãs usam a largura toda.
- Migração 0015 (ouro, armazém, nível das skills).
- Testes: 124 unitários, 90 de integração, 20 web, 11 e2e.

### #51 — 2026-11-22 — Profissões e economia: análise de arquitetura e Fase 1

**Pedido:** especificação longa "Professions & Economy" (secções 1–21): não
duplicar sistemas; analisar a arquitetura primeiro e propor modelos, endpoints,
serviços, interface e um plano por fases; depois implementar a Fase 1 por
inteiro e testar (15 profissões, Mastery independente, desbloqueio de receitas,
interface das profissões, ferramentas e requisitos; §21 atributos BASE).
**Decisões:** D102–D106; valores provisórios A111–A116; ADR-047.
**Resultado:**

- Análise e plano em `docs/PROFESSIONS_ARCHITECTURE.md` (o que existe e se
  reaproveita, conflitos, modelo de dados, endpoints, serviços, interface,
  fases 1–6).
- 15 profissões; Farming e Medicine foram fundidas (A111); Crafter faz as
  ferramentas; Scribing faz pergaminho, tinta e pergaminhos em branco.
- Mastery em 6 ranks com queda por complexidade; receitas bloqueadas até ao rank.
- Ferramentas como itens (básicas e finas), precisas para recolher; filtro
  "Tools" na mochila e tooltip com tipo, tier e rank.
- Bónus dos atributos BASE por profissão (só no servidor, com limite).
- Ecrã com secções Gathering Mastery / Crafting Mastery: rank, progresso,
  ferramenta, atributos, estatísticas, recursos, receitas, histórico,
  encomendas (fase 4). Perfil de outros jogadores em
  `/professions/inspect/:nome` (caixa "Inspect" e link nos amigos).
- Migração 0016 (ranks, estatísticas, ids antigos, ferramentas para todos).
- Testes: 133 unitários (game-core), 93 de integração, 20 web, 11 e2e.

### #52 — 2026-11-22 — Profissões: Fase 2 (nós, regeneração, AP, qualidade) e armazém

**Pedido:** "fazer atividades de profissão requer AP ou tempo real"; avançar
para a Fase 2; pesquisa, filtro e arrastar-e-largar no armazém.
**Decisões:** D107–D108; valores provisórios A117–A119; ADR-048.
**Resultado:**

- Recolher gasta 2 AP por tentativa (sem espera); criar continua com tempo
  real e sem AP.
- Nós de recursos em cada hexágono de recolha (pobre/normal/rico), partilhados
  por todos os jogadores; esgotam-se e regeneram com o tempo (como o AP, sem
  tarefas no worker). Ecrã mostra quanto resta e quando volta.
- Qualidade dos materiais recolhidos (Poor … Exceptional) pela riqueza do nó e
  pela Mastery; pilhas separadas por qualidade; ponto colorido no ícone e
  linha "Quality" na tooltip.
- Armazém: pesquisa por nome, filtros (All, Gear, Materials, Consumables,
  Tools) e arrastar itens entre a mochila e o armazém.
- Migração 0017 (`resource_nodes`, `items.grade`).
- Testes: 140 unitários (game-core), 95 de integração, 20 web, 12 e2e.
- Também pedido (próximo, #53): skills com níveis 1–10, M1–M10, P (D109);
  "o jogo visualmente está meio estranho" — falta saber o quê em concreto.

### #53 — 2026-11-22 — Skills com níveis 1–10, M1–M10, P

**Pedido:** "as skills têm que ser repensadas" — o Expose Weakness em nível 2
não acrescentava nada; fracas em nível baixo e a melhorar; níveis 1…10,
M1…M10, P. (Também pedido nesta altura e na fila: tooltip de comparação no
ferreiro; Rifts a mudar todos os dias, mais Rifts e pirâmide de ameaça;
guildas; trabalhos de profissão por tempo ou AP. "O jogo visualmente está meio
estranho": perguntado o quê em concreto.)
**Decisões:** D109; valores provisórios A120.
**Resultado:**

- 21 níveis com nomes 1–10, M1–M10, P; cada livro repetido sobe um nível.
- Todos os números das skills crescem a cada nível (testado para as 35 skills
  e os 20 passos): dano, cura, Dodge e valores dos estados; a partir de M1 e
  em P os estados duram mais uma ronda (o Stun não).
- Mark e Weaken passaram a ter força (25 % no nível 1, até 75 % em P): o
  Expose Weakness melhora a cada nível.
- A ficha mostra os números do nível (com uma casa decimal) e "Lv M3", etc.
- Testes: 145 unitários (game-core), 95 de integração.

### #54 — 2026-11-22 — Ferreiro: tooltip com a diferença do upgrade

**Pedido:** no ferreiro, ao fazer um upgrade, mostrar a diferença entre a arma
atual e o que o upgrade vai fazer.
**Resultado:** ao passar o rato sobre a arma no ferreiro aparece "Arma → +N":
dano base atual → depois (ganho a verde), bónus das habilidades da arma
(+0 % → +10 %), a probabilidade e o aviso de quebra, e o cartão completo da
arma depois do upgrade. Servidor: `CityDto.upgrades[id].compare` e `preview`.
Testes: `city.test.ts`, e2e "city storage".

### #55 — 2026-11-22 — Rifts diários, mais Rifts e pirâmide de ameaça

**Pedido:** os Rifts mudam todos os dias de posição e de ameaça ("reset");
mais Rifts, alguns já dentro dos territórios; mais de ameaça baixa (pirâmide).
**Decisões:** D110; valores provisórios A121.
**Resultado:** a disposição dos Rifts deriva do dia (UTC) — nada guardado, o
servidor e o browser calculam o mesmo. 30 Rifts por dia em pirâmide; T1–T2
podem abrir nas nações; os mais altos ficam no fundo das Riftlands. O id do
Rift inclui posição, tier e dia: uma corrida ou lobby de ontem continua a
funcionar, mas já não se pode entrar num Rift fechado ("Rifts move every
day"). Ids antigos continuam válidos. Testes: `world-systems.test.ts`.

### #56 — 2026-11-22 — Trabalhos de profissão por tempo real ou por AP

**Pedido:** em vez de andar aos cliques, escolher quanto tempo real gastar
num trabalho (os itens chegam no fim) ou quanto AP gastar (dá logo tudo).
**Decisões:** D111; valores provisórios A122.
**Resultado:** cada receita tem "Attempts", "Now · N AP" e "Wait · tempo".
Em AP resolve tudo de uma vez (a recolha pára se o sítio esgotar e só cobra
as tentativas feitas). Em tempo real fica uma faixa "Working … left"; quando
acaba, o ecrã volta a ler e mostra o resultado ("Job done", botão OK). A
Mastery sobe entre tentativas. Tabela `profession_jobs` (migração 0018),
resolvida quando é lida (sem tarefas no worker). Testes: 3 de integração novos
e passo no e2e de profissões.

### #57 — 2026-11-22 — Guildas

**Pedido:** sistema de guildas com no máximo 16 membros; reputação da guilda
ganha por fazer coisas em guilda (raids, Rifts…); escolher ícone e cor;
armazém da guilda; o líder convida e expulsa membros; comprar um terreno de
guilda, etc.
**Decisões:** D112; valores provisórios A123.
**Resultado:** separador "Guild" no menu de baixo. Sem guilda: convites
(Join/Decline) e fundar (nome, 12 ícones, 10 cores, 500 ouro). Com guilda:
emblema redondo na cor da guilda, reputação, membros (convidar por nome,
expulsar, passar a liderança, sair), banco de ouro, terreno (o líder compra o
hexágono onde está), armazém partilhado com pesquisa. A reputação cresce
quando ≥ 2 membros vencem um Rift juntos. Tabelas `guilds`, `guild_members`,
`guild_invites`, `guild_items` (migração 0019). Testes: `guilds.test.ts`
(5) e e2e "guild". Ainda por fazer: edifícios no terreno (oficinas privadas,
fase 5 das profissões), marcas das guildas no mapa, chat da guilda.

### #58 — 2026-11-22 — Jogo mais coerente e bonito (referência visual)

**Pedido:** "tornar o jogo mais visualmente coerente e mais bonito", com uma
imagem de referência (interface RPG premium) e uma folha de ícones de efeitos
(redondos, com gradiente). Depois do commit, se faltarem tokens, agendar para
continuar sozinho.
**Decisões:** D113.
**Resultado:** tema novo `apps/web/src/styles/theme.css` (carregado por último)
e tokens dourados (`--gold-1…4`, molduras, accent): painéis quase opacos com
moldura dourada fina e cantos ornamentados; títulos dourados; botões escuros
com moldura dourada e principais em dourado antigo; campos de texto escuros;
barra de cima, ações do hub (medalhão redondo) e menu de baixo com o mesmo
estilo; ícones de skills e de efeitos redondos com gradiente da cor e símbolo
branco (como a referência); emblemas das guildas iguais. Arte continua
PLACEHOLDER. Testes: os 13 e2e (incluindo "screens fit every screen size").

### #59 — 2026-11-22 — Sem scroll, inventário/armazém/loja em grelha, ficha compacta

**Pedido:** páginas sem scroll (só dentro das caixas); armazém em grelha (não
em lista); organizar o inventário arrastando (fica na posição), juntar e
dividir pilhas, botão de ordenar (tipo Baldur's Gate); armazém com 80 espaços
(depois pagar para abrir mais); ficha do personagem mais compacta; loja em
grelha com pesquisa e filtro; o AP do topo não atualizava; valores dos poderes
sem decimais (arredondar para baixo). Também pedido e na fila: tooltips todas
como a da arma com valores e palavras-chave coloridos; mercado de jogadores.
**Decisões:** D114–D116, D118; valores provisórios A125.
**Resultado:**

- Cada item tem posição (`items.slot`, migração 0020) na mochila (20) ou no
  armazém (`characters.storage_slots`, 80). API `POST /characters/:id/items/move`
  (mover, dividir, juntar, trocar, tirar equipamento para uma posição) e
  `/items/sort`. Entre mochila e armazém só numa capital.
- Grelha partilhada `ItemGrid` na ficha, no armazém e na loja; pesquisa e
  filtros escurecem o que não corresponde (nada muda de sítio); Shift ao
  largar abre a janela de dividir.
- Loja: grelha de ofertas com preço e grelha da mochila para vender.
- Nenhuma página com scroll (o teste e2e dos tamanhos de ecrã verifica-o em
  13 ecrãs × 6 tamanhos); a ficha ficou mais pequena e cabe no ecrã.
- O AP no topo segue logo as ações que o gastam.
- Poderes: números inteiros, arredondados para baixo.
- Limite de pedidos configurável (`RATE_LIMIT`, 300/min; o e2e usa mais).

### #60 — 2026-11-22 — Rifts maiores e fogueiras raras

**Pedido:** Rifts com dimensão 10–20 (pelo tier) e fogueiras bem mais raras:
máximo 3 num fácil, mínimo 1. "Está muito fácil fazer os Rifts."
**Decisões:** D117; valores provisórios A124.
**Resultado:** cada entrada no mapa usa `mapTemplateForTier(tier)`: percursos
de 10 a 20 salas; nenhum percurso passa por mais fogueiras do que o limite
do tier (validado na geração, `maxOnAnyPath`); a fogueira antes do boss fica
sempre. Testes: `rift-size.test.ts` (5 tiers × 15 mapas).

### #61 — 2026-11-22 — Tooltips iguais e valores coloridos

**Pedido (em #59):** havia várias tooltips diferentes; todas deviam seguir a
lógica da tooltip da arma; valores e palavras-chave com cor diferente.
**Resultado:** um só aspeto para todas as tooltips (itens, skills na ficha e
no combate, atributos, ícones de efeitos — estes deixaram a tooltip do browser
e passaram a ter um cartão); componente `Rich` (`shared/ui/Rich.tsx`) pinta
números/percentagens a dourado e palavras-chave por tipo (atributos, estados,
físico/mágico/à distância, Focus, Mana, HP…). Estilos em `theme.css`.

### #62 — 2026-11-22 — Itens com nome e armaduras Light/Medium/Heavy

**Pedido:** itens "named": uma espada base só tem o dano, mas há ~10 espadas
diferentes com um bónus extra fixo que também sobe com +1…+10; o mesmo para
os acessórios. Armadura com 3 tipos base (Light, Medium, Heavy) e versões com
nome (ex. Dragon Heavy Armor: +X Armor, −3 Agility, quem te acerta corpo a
corpo fica com "ignite"). Mais um filtro de procura. Depois: artefacto com a
lista das armas e das skills; commit a tudo.
**Decisões:** D119; valores provisórios A126.
**Resultado:** `content/named.ts` (47 itens com nome sobre os itens base;
efeitos fixos do catálogo de efeitos, que crescem com o upgrade); efeito novo
"quando te acertam corpo a corpo" (`whenHit`: Burn/Bleed no atacante); 6
armaduras novas (Cloth Robe, Plate Cuirass, Chain Coif, Iron Helm, Chain
Boots, Iron Greaves) e classes nas existentes; tooltip com "Named · base",
efeitos fixos e classe da armadura; filtro "Named" e pesquisa pelo tipo base;
itens com nome e armaduras novas no saque dos Rifts. Testes: `named.test.ts`.

### #63 — 2026-11-22 — Mercado de jogadores

**Pedido:** Player Market: o jogador deixa lá o item, define o preço e fica
até alguém comprar; limite de 20 itens por jogador; só fica à venda no
mercado do hexágono em questão (cidades/aldeias).
**Decisões:** D120; valores provisórios A127.
**Resultado:** separador "Market" na cidade (e ação no hub): grelha do que se
vende nesta cidade (preço, vendedor, comprar ou "Take back" se for teu),
grelha da mochila para escolher o item e o preço, e a lista dos teus itens à
venda em todas as cidades. Tabela `market_listings` (migração 0021); rotas
`/characters/:id/market` (+ `list`, `buy`, `cancel`). Testes: `market.test.ts`
(4) e passo no e2e. Também neste pedido: artefacto "Living Realms Arsenal" com
todas as armas, itens com nome, armaduras e skills (níveis 1, 10 e P).

### #64 — 2026-11-22 — Revisão de todas as páginas (proporções, popups, clareza)

**Pedido:** as janelas estavam desproporcionadas (a loja é mais importante do
que a mochila de 20 espaços); rever todas as páginas, incluindo as dungeons,
para serem coerentes e óbvias (ex. uma sala de desafio aparecia no canto em vez
de ser um popup à frente de tudo); o mais "user friendly" possível.
**Decisões:** D121.
**Resultado:**

- Loja, mercado e armazém: o painel principal (ofertas, itens à venda, armazém)
  à esquerda e a encher o espaço; a mochila numa coluna compacta à direita
  (o armazém passou para a esquerda). As grelhas principais enchem a largura.
- Ficha: o boneco e os atributos ocupam o espaço; o inventário é uma coluna
  compacta (como na loja).
- Rifts: eventos/desafios, salas de saque, fogueiras e salas secretas abrem
  num popup centrado à frente do mapa (antes ficavam no painel do canto).
- Profissões: cada receita diz porque não se pode fazer agora (ir a um rio,
  falta a ferramenta, faltam materiais, sítio esgotado, trabalho a decorrer).
- Amigos, world boss e fundar guilda: largura legível e centrada em vez de
  caixas de 1900 px quase vazias.

### #65 — 2026-11-22 — Tooltip das armas mais clara; dano só físico ou mágico

**Pedido:** a tooltip do item era confusa — o "13–16" era o dano já com os
meus atributos? Mostrar o dano base e o dano real quando equipado; tirar a
descrição ("Balanced…") mas dizer que é dano físico; "Grants" com os ícones
das habilidades. Depois: não há dano "ranged" (ou é físico ou é mágico); e o
"Scales with" tem de ficar.
**Resultado:** a tooltip das armas mostra "Damage type", "Base damage" (da
arma, com o upgrade), "With your attributes" (o teu dano real com os teus
atributos totais), "Scales with" e "Basic attack"; upgrade só quando há; as
runas só quando há espaços desbloqueados; "Abilities while equipped" com os
ícones e nomes; a descrição das armas base saiu (as das armas com nome ficam).
"Ranged" passou a ser só a forma do ataque: o dano mostra-se sempre como
físico ou mágico (`damageTypeLabel`), como já era no cálculo (a Armadura
reduz o dano à distância).

### #66 — 2026-11-22 — Livros por nível e leitura que pode falhar

**Pedido:** para subir uma skill de nível são precisos cada vez mais livros:
nível 1 = 1 livro, 2 = 2, 3 = 3 … 10 = 10, M1 = 11 … M10 = 20, P = 21; e a
leitura tem probabilidade de falhar.
**Decisões:** D122; valores provisórios A128.
**Resultado:** ao ler o livro de uma skill que já tens, são precisos (e
gastos) N livros para chegar ao nível N; a probabilidade desce com o nível;
se falhar, a skill fica no nível e os livros perdem-se. A aba Abilities e a
tooltip do livro dizem quantos livros e que probabilidade tem o próximo
nível; depois de ler aparece o resultado (verde ou vermelho). Testes:
`skill-levels.test.ts`, `character-sheet.test.ts`.
