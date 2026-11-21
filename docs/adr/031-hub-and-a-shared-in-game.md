# ADR-031 — Hub and a shared in-game shell

**Status:** accepted

**Context.** The owner wants the look of a mobile RPG home screen (request
#30) and chose a hub as the entry screen, with the map opened from it.

**Decision.** A layout route (`GameShell`) wraps `/home`, `/world`, `/rifts`
and `/friends`. It owns the world WebSocket connection, the top bar and the
bottom navigation, so the player stays online and the connection is not
re-opened when moving between these screens. Character select/creation, the
sheet, lobbies and combat stay outside (own frames). Backdrop art is an
original placeholder SVG (`Landscape`) until real illustration exists.

**Consequences.** Pages inside the shell render content only. Presence now
covers the Rifts and Friends screens too. Tests navigate from the hub.
