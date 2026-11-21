# ADR-004 — Fastify on Node.js 22

**Status:** accepted

**Decision.** Fastify 5 for HTTP and WebSockets (`@fastify/websocket`, i.e.
`ws`). Domain modules use a routes → service → repository structure.

**Alternatives.** Express (slower, weaker typing and plugins). NestJS (heavy
abstractions for a small team). Go or Rust (faster, but we would lose shared
types and rules with the client; Node is ample for a turn-based game).
