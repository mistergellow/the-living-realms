# ADR-018 — Hosting on Railway

**Status:** accepted (approved by the project owner)

**Context.** The owner's machine cannot run Docker Desktop easily, and the
owner mainly needs to _see and play_ the game; development and tests run in
the AI session. Cloudflare was considered, but Workers/Pages cannot run a
long-lived Node.js server with WebSockets, the world worker, PostgreSQL or
Redis without rewriting the backend for their runtime.

**Decision.** Deploy to Railway: managed PostgreSQL + Redis, and two services
(`server`, `worker`) built from `infra/Dockerfile`, configured as code in
`infra/railway/*.json`. Migrations run as the server's pre-deploy command.
Automatic deploys from `main`.

**Consequences.** No local infrastructure is needed to try the game. Hosting
costs a few dollars a month at this stage. The Docker image stays portable
(Render, Fly.io, any VPS). The Redis client resolves IPv4 and IPv6
(`family: 0`) because private networks may be IPv6. Cloudflare can later sit in
front for the domain, DNS and DDoS protection.
