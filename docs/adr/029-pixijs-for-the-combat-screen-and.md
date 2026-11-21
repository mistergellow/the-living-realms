# ADR-029 — PixiJS for the combat screen and the world map

**Status:** accepted

**Context.** The game looked like a web page: combat and the map were DOM/SVG
with CSS animations. The owner asked whether to use Phaser (suggested
elsewhere) and approved PixiJS for combat and the map (request #20).

**Decision.**

- **PixiJS 8** draws the combat stage and the hex map. React keeps every menu,
  panel and button. Phaser was not chosen: its scenes, physics and input
  systems duplicate what React and the server already do; we only need a fast
  2D renderer.
- **Loaded lazily:** `features/render/pixi-app.ts` is a dynamic import, so the
  login, character and sheet screens do not download Pixi. The Vite dev server
  pre-bundles it (`optimizeDeps`) to avoid mid-session reloads.
- **One source of art:** the SVG components (`features/avatar`) are rendered
  to markup (`react-dom/server`) and rasterised into cached textures
  (`render/avatar-textures.tsx`), one per layer (body, weapon, head, blink
  frame). Real artwork or Spine can later replace these textures.
- **Input stays in the DOM:** the combat canvas has `pointer-events: none`;
  transparent buttons placed from the same layout (`combat/combat-layout.ts`)
  carry clicks, focus, accessible names and test ids. The map handles drag,
  wheel and pinch on its host element, plus keyboard keys.
- **The server stays the truth:** the scene replays new combat log entries
  (`combat/combat-timeline.ts`) one action at a time. The page holds the text
  log, the controls (during enemy actions) and the result overlays until the
  replay ends, so nothing is revealed before it is shown.
- **CSP:** no `unsafe-eval` (`pixi.js/unsafe-eval` is imported), images via
  `data:` URLs (no blob: or workers).
- **Fallback:** without WebGL, Pixi falls back to its Canvas 2D renderer
  (checked: everything draws; the hit-flash and greyed-out filters are
  skipped). If even that fails, combat shows the SVG art in the buttons and the
  map shows a message.
- **Frame rate:** 60 fps while something moves, 30 fps when idle.

**Consequences.** About 300 KB (gzip ≈ 100 KB) more JavaScript, only on the
map and combat screens. Pure parts (layout, timeline, camera, `pixelToHex`)
are unit-tested; the drawing itself is covered by the e2e combat test and
screenshots. Tests must close pages they open: an open world page keeps its
canvas rendering.
