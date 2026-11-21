# ADR-014 — English-only game content

**Status:** accepted (game design decision by the project owner)

**Decision.** All player-facing text is English. No i18n framework for now;
strings stay in components. Error _codes_ (not messages) are the client/server
contract, so translation can be added later without API changes. In-game
"languages" (a game mechanic) are unrelated to UI language.
