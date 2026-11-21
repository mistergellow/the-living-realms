# ADR-009 — Opaque server-side sessions in HttpOnly cookies (not JWT)

**Status:** accepted

**Decision.** A 256-bit random token in an `HttpOnly; SameSite=Lax` (+
`Secure` in production) cookie; the database stores only its SHA-256. 30-day
sliding expiry; logout revokes the session and closes its WebSockets.
Passwords are hashed with Argon2id.

**Why not JWT.** It cannot be revoked instantly (bans, logout, stolen tokens)
without a server-side list anyway; tokens readable by JS are exposed to XSS.
The same cookie authenticates the WebSocket handshake. Cost: one indexed
lookup per request (cacheable in Redis later).
