# Registo de pedidos

Pedidos recentes do dono do projeto (**mais recentes no fim**). Acrescentar
uma entrada por pedido, no mesmo trabalho em que é implementado.

- Decisões de design em vigor (D#) e valores provisórios (A#): [`GAME_DESIGN.md`](GAME_DESIGN.md)
- Pedidos antigos: [`archive/`](archive/) — quando este ficheiro passar de ~10
  entradas, mover as mais antigas para um ficheiro de arquivo novo.
- Para acrescentar uma entrada basta ler o fim do ficheiro (`tail -40`).

Formato: `### #N — AAAA-MM-DD — título`, depois **Pedido**, **Decisão** (se
houve), **Resultado** (curto, com os ficheiros principais).

---

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

### #31 — 2026-11-21 — Gasto de tokens; organizar o projeto para navegar barato

**Pedido:** "estás a gastar muitos tokens"; que plugins são esses; organizar os
ficheiros para navegar no código sem consumir tokens, de forma coerente e leve,
como um dev / game designer profissional.
**Resultado:**

- Docs: `ARCHITECTURE.md`, `DATABASE.md`, `ROADMAP.md` → `docs/`;
  `DECISIONS.md` → `docs/adr/` (um ficheiro por ADR + índice, ADR-032).
- `docs/REQUESTS.md` dividido: decisões D# e valores A# → `docs/GAME_DESIGN.md`
  (tabelas → listas compactas, 29 KB → 11 KB); pedidos #1–#25 →
  `docs/archive/requests-001-025.md`; aqui ficam só os recentes.
- `docs/CHANGE_MAP.md` → índice curto + um ficheiro por área em `docs/change-map/`.
- `CLAUDE.md` reescrito: regras, protocolo de navegação e mapa do código por domínio.
- Código: ecrã de combate de `features/rifts` → `features/combat`;
  `combat-scene.ts` (1200 linhas) partido em `unit-view.ts`, `backdrop.ts`,
  `scene-kit.ts`; estilos da lista de Rifts → `features/rifts/rifts.css`;
  `styles/global.css` (1660 linhas) → índice de `@import` com partes por ecrã
  (CSS final idêntico). Sem alterações de comportamento.
