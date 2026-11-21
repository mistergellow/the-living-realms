# Game design — fonte de verdade

Decisões do dono do projeto (**D#**) e valores provisórios por confirmar
(**A#**). Antes de mexer em regras do jogo, procurar aqui o número relevante
(`grep -n "D38\|formação" docs/GAME_DESIGN.md`) em vez de ler tudo.
Novo valor provisório → nova linha A# em "Decisões em aberto" e perguntar ao dono.

---

## Decisões de game design já tomadas (pelo dono do projeto)

- **D1** (2026-11-17) Cada jogador pode ter vários personagens, mas só joga com um de cada vez → `apps/server/src/realtime/gateway.ts` (account.replace), `MAX_CHARACTERS_PER_ACCOUNT`, ADR-012
- **D2** (2026-11-17) Um único mundo, partilhado por todos → `worlds` (slug `main`), `world_id` em tudo, ADR-013
- **D3** (2026-11-17) Criação de personagem na fase 1: só nome + aparência básica → `packages/shared/src/api.ts`, `CharacterCreatePage.tsx`, ADR-015
- **D4** (2026-11-17) Tudo o que é do jogo em inglês (a conversa é em português) → ADR-014
- **D5** (2026-11-17) Mapa do mundo em hexágonos; a distância entre hexágonos custa X AP → `packages/game-core/src/hex.ts`, `characters.hex_q/hex_r`, ADR-011
- **D6** (2026-11-17) Conta só com email + password, por agora → `modules/auth/*`
- **D7** (2026-11-17) Prioridade: personagem e combate antes do mapa. Rifts = portais para raids; solo ou em lobby; a dificuldade não muda com o nº de jogadores → `ROADMAP.md` (Fases 2 e 3)
- **D8** (2026-11-17) Poder do personagem vem de skills e equipamento. Reputação é uma moeda ganha ao fazer atividades → Fase 2
- **D9** (2026-11-17) Sem classes: as armas definem como se ataca → Fase 2
- **D10** (2026-11-17) Atributos: os 6 do D&D (STR, DEX, CON, INT, WIS, CHA) → Fase 2
- **D11** (2026-11-17) Sem limite de skills ("infinitas") → Fase 2/3 (ver perguntas em aberto)
- **D12** (2026-11-17) Recursos de combate: HP e Mana, por agora → Fase 3
- **D13** (2026-11-17) Combate em filas como Darkest Dungeon: 6 posições por lado em 2 filas; vista lateral ao estilo Darkest Dungeon → Fase 3
- **D14** (2026-11-17) PvE: primeiro os jogadores, por ordem de iniciativa, depois os inimigos. PvP: todos declaram as ações ao mesmo tempo, depois resolvem por ordem de iniciativa da equipa → Fase 3 (PvP mais tarde)
- **D15** (2026-11-17) Energia por turno ao estilo Slay the Spire (sem lhe chamar AP); ações diferentes custam quantidades diferentes → Fase 3
- **D16** (2026-11-17) 60 segundos por turno → Fase 3
- **D17** (2026-11-17) Rift = várias salas até ao boss → Fase 3
- **D18** (2026-11-17) Lobby até 6 jogadores; a dificuldade não muda (quem vai sozinho fica em desvantagem) → Fase 3
- **D19** (2026-11-17) Derrota: o equipamento perde qualidade; a 0 parte-se e fica inutilizável → Fases 2/3
- **D20** (2026-11-17) Recompensas: drops e reputação → Fase 3
- **D21** (2026-11-17) Atributos por point-buy (D&D 5e: 27 pontos, 8–15). Não crescem sozinhos: o equipamento pode dar bónus → M1
- **D22** (2026-11-17) STR = dano físico; DEX = iniciativa, distância, esquiva, crítico; CON = HP e defesa; INT = Mana máxima e feitiços; WIS = cura, resistência, recuperação de Mana; CHA = buffs/debuffs (e comércio/reputação) → M1 (`game-core/stats`)
- **D23** (2026-11-17) Todas as skills conhecidas estão disponíveis em combate: as de arma vêm da arma equipada; as outras aprendem-se por drops → M1/M2
- **D24** (2026-11-17) Energia por turno chama-se **Focus**; o Focus não gasto passa para o turno seguinte; os feitiços gastam Focus e Mana → M2
- **D25** (2026-11-17) Espaços: mão principal, mão secundária, cabeça, corpo, pernas, 2 acessórios → M1
- **D26** (2026-11-17) Reputação é por personagem → M1
- **D27** (2026-11-17) Sem regra geral de "fila da frente protege": cada ataque define o que atinge (várias filas, fila de trás…); a maioria atinge a primeira. Trocar de posição gasta Focus; trocar com outro jogador gasta aos dois → M2
- **D28** (2026-11-17) A 0 HP o personagem cai; levanta-se com 1 HP se o grupo passar a sala → M2
- **D29** (2026-11-17) HP e Mana mantêm-se entre salas → M2
- **D30** (2026-11-17) Derrota: −25% de qualidade em todo o equipamento equipado → M1/M2
- **D31** (2026-11-17) Entrada em Rifts: lista por agora. Convites a amigos + lobby público de Rifts. Mais tarde (mapa) conta o AP gasto para chegar ao hexágono do Rift → M2/M3/Fase 4
- **D32** (2026-11-17) Visual dos personagens ao estilo da referência enviada (personagens ilustrados tipo "chibi", com animações; equipamento à volta do personagem no ecrã de herói). Para já, aparência = editar o corpo base; mais tarde o equipamento passa a ver-se no personagem → M2 (renderer em camadas)
- **D33** (2026-11-17) Atributos: 6 lineares sem "atributos inúteis" (Might, Agility, Precision, Vitality, Arcana, Spirit), base 5 + 12 pontos na criação (máx. 10); o equipamento dá o resto. Armas escalam com 2 atributos; mão principal + secundária combinam habilidades → Combate 2.0
- **D34** (2026-11-17) Defesa passiva com retornos decrescentes (redução = rating ÷ (rating + 50)) + Block ativo que expira no início do próprio turno (estilo Slay the Spire) → Combate 2.0
- **D35** (2026-11-17) Estados: Bleed, Burn, Mark (+25% dano recebido), Weaken (−25% dano), Stun (perde o turno); sinergias entre habilidades → Combate 2.0
- **D36** (2026-11-17) O combate é "Slay the Spire sem cartas + Darkest Dungeon": inclui **intenções dos inimigos** visíveis antes do turno dos jogadores → Combate 2.0
- **D37** (2026-11-18) Sistema de amigos (adicionar amigo) e Rifts com lobby → M3
- **D38** (2026-11-18) **Formação corrigida:** cada lado tem 3 colunas (back, mid, front) × 2 linhas = 6 posições (substitui a interpretação "2 filas de 3" do D13) → motor, combate, lobby
- **D39** (2026-11-18) A coluna mid está a salvo do corpo-a-corpo enquanto houver alguém na front → motor
- **D40** (2026-11-18) Há habilidades que atingem tudo → conteúdo
- **D41** (2026-11-18) **Nos ataques escolhe-se a coluna, não o alvo**: um ataque contra a front atinge sempre os dois da front (jogadores e inimigos) → motor, conteúdo, ecrã
- **D42** (2026-11-18) Os inimigos jogam com a formação: ocupam as 3 colunas e/ou, na mesma coluna, um bloqueia e o outro ataca — conforme a dificuldade do Rift → IA, conteúdo dos Rifts

## Decisões em aberto / valores provisórios (confirmar com o dono)

- **A1** Máximo de personagens por conta: 5 → `.env` → `MAX_CHARACTERS_PER_ACCOUNT`
- **A2** Nome do mundo: "The Living Realms" (slug `main`) → `packages/db/src/seed.ts`, `WORLD_SLUG`
- **A3** Regras de nome do personagem: 3–20 letras; espaços, apóstrofos e hífens → `packages/game-core/src/character.ts`
- **A4** Aparência: cor (8) + emblema (8), provisória → ver CHANGE_MAP → "Aparência"
- **A5** Custo de AP por hexágono (o "X"): não implementado → fase 2
- **A6** Ritmo do relógio do mundo: 1 tick a cada 5 s → `.env` → `WORLD_TICK_MS`
- **A7** Hexágono onde nascem os personagens: (0,0) → `worlds.spawn_q/spawn_r`
- **A8** Língua da documentação técnica: inglês → —
- **A9** Alojamento: Railway (aprovado, a funcionar) → `infra/railway/*.json`
- **A10** Fórmulas das estatísticas: HP = 20 + 2×CON; Mana = 10 + 2×INT; Defesa = armadura + mod CON; Iniciativa = mod DEX; Esquiva/Crítico = 5% + 2%×mod DEX (máx. 75%); poderes = mod do atributo → `packages/game-core/src/stats.ts` (`STAT_RULES`)
- **A11** Conteúdo inicial (armas, armaduras, habilidades, custos, danos): Espada de treino, arco de caça, cajado de aprendiz; túnica; escudo, gorro, perneiras, 2 acessórios para drops futuros → `packages/game-core/src/content/*`
- **A12** Kit inicial: arma escolhida + túnica acolchoada → `STARTER_WEAPONS`, `STARTER_ARMOR`
- **A13** Personagens antigos: atributos 10 em tudo + espada de treino + túnica → migração `0002_…`
- **A14** "Atinge a fila da frente": = a primeira fila **ocupada** (se a da frente estiver vazia, a de trás fica exposta) → `content/abilities.ts` (M2)
- **A15** Pontos não gastos no point-buy: permitidos → `validatePointBuy`
- **A16** Limite de Focus acumulado: por definir (M2) → —
- **A17** Inimigos do Rift de teste: placeholders neutros: Rift Husk, Shard Spitter, Hollow Hound, Rift Warden (boss) → `content/enemies.ts`
- **A18** Equilíbrio do Rift de teste (simulação, 300 combates): solo: espada 31%, arco 20%, cajado 46% de vitórias; grupo de 2–3: ~100% → `content/abilities.ts`, `content/enemies.ts`
- **A19** Abandonar um Rift: conta como derrota (o equipamento perde qualidade), para não se fugir à penalização → `rifts.service.ts`
- **A20** Posição inicial no combate: espada na fila da frente; arco e cajado na fila de trás → `rifts.service.ts`
- **A21** Opções do corpo base: tipo de corpo, tom de pele, penteado, cor do cabelo, cor dos olhos, cor da roupa → `CharacterAvatar`
- **A22** Arte: desenhada em código (SVG em camadas) como base provisória; arte profissional substitui as camadas mais tarde → ADR-021
- **A23** Meta de dificuldade a solo: média: ~40–50% de vitórias; grupos de 2–3 ~100% (simulação: espada+escudo 52%, machado 32%, adagas 68%, arco 56%, cajado 60%, tomo+talismã 26%; média 49%) → conteúdo em `game-core/src/content`
- **A24** Armas iniciais: espada, machado, adaga, arco, cajado, tomo; mão secundária opcional: escudo, talismã ou adaga → `STARTER_WEAPONS`, `STARTER_OFFHANDS`
- **A25** Amigos: por personagem (adiciona-se pelo nome do personagem); pedido → aceitar/recusar → `modules/social`
- **A26** Lobby público: entra quem quiser até 6; o líder pode expulsar; também há lobbies privados (só por convite) → `lobbies.service.ts`
- **A27** Jogador desligado a meio do combate: o turno passa aos 60 s (sem controlo automático) → `COMBAT_RULES.turnSeconds`
- **A28** Sair de um Rift em grupo: só quem sai sofre a penalização (−25% qualidade); o grupo continua; se for o último, é derrota → `rifts.service.ts`
- **A29** Atualização em tempo real no lobby/combate: o browser pergunta ao servidor a cada ~1,5 s (simples e robusto a esta escala; push por WebSocket fica para mais tarde) → `features/rifts/api.ts`
- **A30** Alcance por coluna: corpo-a-corpo = primeira coluna ocupada (front → mid → back); distância/magia = qualquer coluna; Volley = coluna de trás inteira; Cleave/Rift Slam = primeira coluna ocupada inteira → `content/abilities.ts`
- **A31** Posições iniciais: corpo-a-corpo na front; arco, cajado e tomo na back → `startingSlot`
- **A32** Habilidades de apoio (curar/proteger um aliado): continuam a escolher a pessoa; só os ataques são por coluna → `content/abilities.ts`
- **A33** Proteção de coluna: escudo: "Shield Wall" (Block para a coluna inteira); inimigo-tanque "Rift Bulwark" → `content/*`
- **A34** Ritmo das animações de combate: 650 ms por ação (420 ms com "reduzir movimento"); a fase dos inimigos joga-se ataque a ataque e os controlos esperam pelo fim → `apps/web/src/features/combat/combat-scene.ts` (`stepMs`)
- **A35** Ecrã inicial (Hub): losangos: Rifts, Mundo, Herói; menus laterais: Amigos, Lobbies, Crónica / Herói, Inventário, Online, Trocar personagem; barra de baixo: Personagem, Rifts, Home, Mundo, Amigos → `apps/web/src/features/game/HomePage.tsx`, `GameShell.tsx`
- **A36** Atalhos das habilidades: teclas 1–9 pela ordem da barra; Esc cancela a escolha de alvo → `apps/web/src/features/combat/AbilityBar.tsx`

---
