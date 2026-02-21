---
id: 48
title: Webhook connector
status: done
type: feature
priority: 2
phase: phase-3
branch: feature/phase-3
created: 2026-02-21
shipped_at: 2026-02-21
pr: https://github.com/sichengchen/sa/pull/7
---
# Webhook connector

## Context
SA has three connectors (TUI, Telegram, Discord) but no programmatic HTTP interface. A webhook connector would allow external systems (CI/CD, GitHub webhooks, IFTTT, cron scripts, other agents) to send messages to SA and receive responses via HTTP. The Engine already runs an HTTP server for tRPC — the webhook connector can share it or use a separate endpoint.

## Approach

1. **Add "webhook" to ConnectorType** — extend `ConnectorType` in `src/shared/types.ts` to include `"webhook"`. Update `session.create` input validation in `procedures.ts`.

2. **Create webhook endpoint on Engine** — add a REST endpoint (not tRPC) to the Engine HTTP server:
   - `POST /webhook` — accepts JSON body: `{ message: string, sessionId?: string, secret?: string }`
   - If `sessionId` is provided, resumes that session; otherwise creates a new one
   - Authenticates via a shared `secret` (configured in config.json) or via existing Engine auth token
   - Processes the message synchronously and returns the full response as JSON: `{ sessionId, response, toolCalls: [...] }`
   - For streaming, support `Accept: text/event-stream` header to return SSE

3. **Add webhook config to SAConfigFile** — in `src/engine/config/types.ts`:
   - `webhook: { enabled: boolean, secret?: string, toolApproval: "never" | "always" }`
   - Default: disabled. When enabled, auto-approve tools by default (webhooks are programmatic)

4. **Wire into Engine server** — in `src/engine/server.ts`, add the webhook route handler alongside the tRPC handler.

5. **Add webhook setup to wizard/config CLI** — optional step in wizard, toggle in ConnectorSettings.

## Files to change
- `src/shared/types.ts` (modify — add "webhook" to ConnectorType)
- `src/engine/server.ts` (modify — add webhook REST endpoint)
- `src/engine/procedures.ts` (modify — allow "webhook" in session.create)
- `src/engine/config/types.ts` (modify — add webhook config)
- `src/engine/config/defaults.ts` (modify — default webhook config)
- `src/cli/config/ConnectorSettings.tsx` (modify — add webhook toggle)

## Verification
- Run: `bun test`
- Expected: POST /webhook with a message returns a response; SSE streaming works; auth via secret
- Edge cases: Missing secret when required; concurrent webhook requests to same session; very long responses; tool approval in webhook context

## Progress
- Added "webhook" to ConnectorType in shared/types.ts
- Updated session.create z.enum in procedures.ts (both occurrences)
- Added webhook config (enabled, secret) to RuntimeConfig in types.ts
- Added webhook defaults in defaults.ts (enabled: false, toolApproval: "never")
- Added POST /webhook REST endpoint in server.ts with secret auth, session create/resume, SSE streaming, and synchronous JSON response
- Added webhook enabled toggle and approval mode to ConnectorSettings.tsx
- Verification: typecheck ✓, lint ✓, 201 tests pass ✓
- Modified: src/shared/types.ts, src/engine/server.ts, src/engine/procedures.ts, src/engine/config/types.ts, src/engine/config/defaults.ts, src/cli/config/ConnectorSettings.tsx
