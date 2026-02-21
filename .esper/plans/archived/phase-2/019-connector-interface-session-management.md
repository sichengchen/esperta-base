---
id: 19
title: Connector interface & session management
status: done
type: feature
priority: 1
phase: phase-2
branch: feature/phase-2
created: 2026-02-19
shipped_at: 2026-02-20
pr: https://github.com/sichengchen/sa/pull/2
---
# Connector interface & session management

## Context
Currently, the TUI (`src/tui/`) and Telegram (`src/telegram/`) directly import and call the Agent class. Phase 2 replaces this with a Connector abstraction — each frontend implements a generic interface and communicates with the Engine via tRPC.

Sessions are per-Connector: each Connector gets its own conversation thread. The Engine manages all sessions and can transfer them between Connectors.

## Approach
1. Define `Connector` interface in `src/shared/connector.ts`:
   - `id: string` — unique Connector identifier
   - `type: "tui" | "telegram" | "discord"` — Connector type
   - `connect(engineUrl: string, token: string): Promise<void>` — connect to Engine
   - `disconnect(): Promise<void>` — graceful disconnect
   - `onAgentEvent(handler: (event: AgentEvent) => void): void` — subscribe to events
   - `sendMessage(text: string): Promise<void>` — send user message to Engine
   - `handleApproval(requestId: string, approved: boolean): Promise<void>` — respond to tool approval
2. Define `Session` type in `src/shared/types.ts`:
   - `id: string`, `connectorId: string`, `connectorType: string`
   - `createdAt: number`, `lastActiveAt: number`
   - `messages: Message[]` (reference, not full copy)
3. Implement `SessionManager` in `src/engine/sessions.ts`:
   - `createSession(connectorId, connectorType)` — creates and registers a session
   - `getSession(sessionId)` — retrieve session by ID
   - `listSessions()` — list all active sessions
   - `transferSession(sessionId, targetConnectorId)` — move session to another Connector
   - `destroySession(sessionId)` — clean up session
4. Create `src/shared/client.ts` — tRPC client factory that Connectors use to connect to Engine
5. Write unit tests for SessionManager

## Files to change
- `src/shared/connector.ts` (create — Connector interface definition)
- `src/shared/types.ts` (modify — add Session, ToolApprovalRequest types)
- `src/shared/client.ts` (create — tRPC client factory)
- `src/engine/sessions.ts` (create — SessionManager implementation)
- `src/engine/router.ts` (modify — wire session procedures to SessionManager)
- `tests/sessions.test.ts` (create — SessionManager unit tests)

## Verification
- Run: `bun test`
- Expected: SessionManager creates, retrieves, lists, transfers, and destroys sessions correctly
- Edge cases: Transfer to non-existent Connector, destroy active session, concurrent session creation

## Progress
- Created Connector interface in src/shared/connector.ts (connect, disconnect, onEngineEvent, sendMessage, handleApproval)
- Added ToolApprovalRequest type to src/shared/types.ts
- Created tRPC client factory in src/shared/client.ts (httpBatchLink + wsLink via splitLink)
- Implemented SessionManager with create, get, list, transfer, destroy, touch operations
- Wired session.create and session.list procedures to SessionManager in router.ts
- Updated chat.stream to use async generator (tRPC v11 pattern) instead of deprecated observable
- 14 unit tests for SessionManager (all passing)
- Modified: src/shared/types.ts, src/engine/router.ts
- Created: src/shared/connector.ts, src/shared/client.ts, src/engine/sessions.ts, tests/sessions.test.ts
- Verification: passed (107 tests, lint clean, typecheck clean)
