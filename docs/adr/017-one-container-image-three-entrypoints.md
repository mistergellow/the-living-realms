# ADR-017 — One container image, three entrypoints

**Status:** accepted

**Decision.** `infra/Dockerfile` produces one image containing `server.js`
(which also serves the built SPA when `WEB_DIST_DIR` is set), `worker.js` and
`migrate.js`. Server and worker are esbuild bundles, so the runtime image needs
almost no `node_modules`.

**Consequences.** One artifact per release. Same-origin hosting removes CORS
and simplifies cookies. The SPA can move to a CDN later by setting
`WEB_ORIGIN` accordingly.
