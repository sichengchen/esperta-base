---
id: 093
title: "fix: standardize tRPC mutation return shapes and session ID pairing entropy"
status: pending
type: fix
priority: 2
phase: 007-memory-redesign
branch: fix/api-consistency
created: 2026-02-23
---

# fix: standardize tRPC mutation return shapes and session ID pairing entropy

## Context

Two API consistency issues identified in the audit:

**1. tRPC mutation return inconsistency**
`session.create` returns a raw `Session` object while `session.destroy` returns `{ destroyed: boolean }`. Across other procedures, mutations return a mix of raw objects and boolean-wrapped responses. Clients must handle different shapes for similar operations. The audit also flags `{ added: boolean }` vs raw object returns elsewhere. A consistent convention reduces bugs in connector code.

**2. Pairing code brute-force risk (medium security)**
The 6-character alphanumeric pairing code has ~2 billion combinations but there is no rate limiting on pairing attempts. A local attacker (malicious process on the same machine) can brute-force the code quickly. Adding a delay or lockout after failed attempts closes this attack surface without a major architectural change.

## Approach

**tRPC return standardization:**
1. Audit all `.mutation()` handlers in `procedures.ts` for return shape consistency.
2. Adopt a convention: mutations that create a resource return `{ data: T }`, mutations that destroy/remove return `{ ok: boolean }` or `{ success: boolean }`.
3. Update `session.create` to return `{ session: Session }` (wrapping the raw object) and `session.destroy` to return `{ ok: boolean }`.
4. Update all connector clients (TUI, Telegram, Discord) that destructure these returns.

**Pairing rate limiting:**
1. In `auth.ts` or `procedures.ts`, track failed pairing attempt timestamps in a module-level variable.
2. After 5 failed attempts within 60 seconds, return an error for subsequent attempts for 30 seconds (simple in-memory backoff — no persistence needed since pairing is a short-lived operation).
3. On successful pairing, clear the counter.

## Files to change

- [src/engine/procedures.ts](src/engine/procedures.ts) (modify — standardize session.create/destroy return shapes; add pairing attempt rate limit)
- [src/engine/auth.ts](src/engine/auth.ts) (modify — optionally centralize rate limit logic here)
- [src/connectors/tui/](src/connectors/tui/) (modify — update session.create response destructuring)
- [src/connectors/telegram/](src/connectors/telegram/) (modify — update session.create response destructuring if used)
- [src/connectors/discord/](src/connectors/discord/) (modify — update session.create response destructuring if used)

## Verification

- Run: `bun run typecheck` — must pass (return types must be consistent)
- Run: `bun test` — full suite must pass
- Manual test: TUI connects successfully (session.create return shape change handled)
- Manual test pairing: 5 failed pairing attempts result in a 30s lockout; correct code succeeds on first try
- Regression check: Telegram and Discord connectors connect without errors
