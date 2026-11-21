# ADR-030 — Game-styled UI: fluid rem scaling and full-screen layouts

**Status:** accepted

**Context.** Besides the canvas map and combat (ADR-029), the menus still
looked like a website. A theme was prepared in another session (paused before
the move to PixiJS) and merged on top of the current screens (request #29).

**Decision.** Self-hosted fonts (Cinzel for titles, Alegreya Sans for text)
through `@fontsource` packages, so no third-party font requests are needed
under the CSP. Every size in the UI is in `rem` and the root font size scales
with the viewport (`tokens.css`), so the same layout fits a phone and a 4K
monitor. Each screen is a full-viewport `Screen` (backdrop, embers, vignette)
whose page never scrolls; long content scrolls inside `screen-body`. Avatars
in the DOM are sized in `rem`; the canvas uses exact pixels (`inSvg`).

**Consequences.** An e2e test checks that no screen overflows at six viewport
sizes. New screens must use the same frame (see docs/change-map/ui.md → "Tema visual").
