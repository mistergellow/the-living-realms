# ADR-002 — React SPA with Vite (no SSR framework)

**Status:** accepted

**Context.** The game is an interactive, logged-in, UI-heavy client (panels,
map, lists, chat). SEO and first-paint SSR do not matter behind a login.

**Decision.** React 19 + Vite + React Router 7. Exploration is DOM/SVG. Combat
will get its own canvas renderer (planned: PixiJS) on its own route.
_(Update: the combat screen and the world map now render with PixiJS — ADR-029.)_

**Alternatives.** Next.js (SSR and server components: complexity without
benefit here). Phaser for everything (a poor fit for a UI-heavy interface; may
still be used for combat). Svelte/Vue (viable; React chosen for ecosystem and
hiring).
