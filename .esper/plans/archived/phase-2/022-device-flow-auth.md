---
id: 22
title: Device-flow authentication
status: done
type: feature
priority: 1
phase: phase-2
branch: feature/phase-2
created: 2026-02-19
shipped_at: 2026-02-20
pr: https://github.com/sichengchen/sa/pull/2
---
# Device-flow authentication

## Context
The Engine needs to authenticate Connectors. Since SA will support remote Connectors (macOS/iOS/watchOS apps) in future phases, a simple localhost-only approach won't work. Device-flow auth (similar to Apple pairing) provides a UX-friendly pattern: the Engine generates a short code, the Connector displays it, and the user confirms on the Engine side.

For Phase 2 (local-only), this simplifies to: Engine generates a token on start, Connector reads it from `~/.sa/engine.token` or receives it via the pairing flow.

## Approach
1. Create `src/engine/auth.ts` — authentication module:
   - `generateToken()` — generate a cryptographically random bearer token (32 bytes, hex)
   - `generatePairingCode()` — generate a short 6-char alphanumeric code for device-flow
   - `validateToken(token: string)` — check token against stored value
   - Store active tokens in memory with metadata (connector ID, type, paired at timestamp)
2. Implement pairing flow:
   - Engine starts → generates a master token → writes to `~/.sa/engine.token`
   - For local Connectors: read token from file, send via `auth.pair` tRPC procedure
   - For remote Connectors (future): Engine displays pairing code, Connector sends code via `auth.pair`, Engine returns a session token
3. Add tRPC middleware in `src/engine/trpc.ts`:
   - Extract bearer token from request headers
   - Validate against stored tokens
   - Inject `connectorId` into tRPC context
   - `auth.pair` procedure is unauthenticated (it's how you get a token)
   - `health.ping` is unauthenticated
4. Update Connector client (`src/shared/client.ts`) to include auth token in tRPC client headers
5. Write unit tests for token generation, validation, and pairing flow

## Files to change
- `src/engine/auth.ts` (create — token generation, validation, pairing)
- `src/engine/trpc.ts` (modify — add auth middleware)
- `src/engine/router.ts` (modify — implement auth.pair procedure)
- `src/shared/client.ts` (modify — add auth header to tRPC client)
- `tests/auth.test.ts` (create — auth unit tests)

## Verification
- Run: `bun test`
- Expected: Token generation produces valid hex strings, pairing flow issues tokens, auth middleware rejects invalid tokens
- Edge cases: Expired tokens, multiple Connectors with same type, revoked tokens

## Progress
- Created AuthManager with master token, pairing code, validate, revoke
- Master token written to ~/.sa/engine.token (mode 0600), cleaned on shutdown
- Pairing code is 6-char alphanumeric (no confusing chars), single-use
- auth.pair tRPC procedure accepts credential + connector info, returns session token
- auth.code query generates pairing code for remote device-flow
- tRPC client factory updated with optional Bearer auth header
- 15 unit tests covering init, cleanup, pair, validate, revoke, readFromFile
- Modified: runtime.ts, router.ts, server.ts, context.ts, client.ts
- Created: auth.ts, tests/auth.test.ts
- Verification: passed (122 tests, lint clean, typecheck clean)
