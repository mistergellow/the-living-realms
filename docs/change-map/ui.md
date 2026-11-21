# Mapa de impacto — Interface e renderer

Ver regras e ordem de alteração em [`../CHANGE_MAP.md`](../CHANGE_MAP.md).

## Renderer canvas (PixiJS) — combate e mapa

- Decisão: `docs/adr/` ADR-029; dependência `pixi.js` em `apps/web/package.json`
- Arranque: `apps/web/src/features/render/pixi-app.ts` (imports de `pixi.js/*` que registam o que desenhamos — **um tipo de objeto novo do Pixi pode precisar de mais um import aqui**; `unsafe-eval` por causa da CSP)
- Ciclo de vida React: `render/usePixiScene.ts` (`PixiScene`: `resize`, `destroy`; recurso sem WebGL → `failed`)
- Texturas: `render/svg-texture.ts` (SVG → textura por `data:` URL, brilho, vinheta, gradientes), `render/avatar-textures.tsx` (arte dos personagens e inimigos)
- Cenas: `combat/combat-scene.ts` (orquestra; peças em `combat/unit-view.ts`, `combat/backdrop.ts`, `combat/scene-kit.ts` — cores, easing, RNG), `world/map-scene.ts`
- CSP do servidor: `apps/server/src/plugins/security.ts` (`imgSrc` tem de manter `data:`; sem `blob:`/workers)
- Dev server: `apps/web/vite.config.ts` → `optimizeDeps.include` (acrescentar aqui qualquer novo import `pixi.js/*`)
- Testes e2e: fechar as páginas/contextos abertos (um mapa aberto continua a desenhar)
- Docs: `docs/ARCHITECTURE.md` §7–§9

## Tema visual (aspeto de jogo) e tamanhos de ecrã

- Cores, espaçamentos e escala fluida: `apps/web/src/styles/tokens.css` (tudo em `rem`; `--hud-gap`)
- Estilos: `apps/web/src/styles/global.css` é só o índice de `@import` (a ordem conta): `base.css`, `layout.css` (`screen`, cenário, `topbar`), `components.css` (painéis, botões, formulários, utilitários, mensagens), `screens/*.css` (auth, seleção, criação, mundo, ficha, social), `a11y.css`; estilos de uma feature ficam junto dela: `features/combat/combat.css`, `features/rifts/rifts.css`, `features/game/game.css`
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
