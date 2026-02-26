---
id: 126
title: /shutdown command — force SA engine stop with confirmation
status: done
type: feature
priority: 2
phase: 009-chat-sdk-and-agent-tools
branch: feature/009-chat-sdk-and-agent-tools
created: 2026-02-25
shipped_at: 2026-02-26
pr: https://github.com/sichengchen/sa/pull/31
---
# /shutdown command — force SA engine stop with confirmation

## Context

SA needs a `/shutdown` command that fully stops the engine process (not just cancel tasks like `/stop` or restart like `/restart`). Since this is destructive (all connectors lose connection, all sessions are destroyed), it should ask for confirmation before proceeding.

## Approach

1. Add tRPC procedure `engine.shutdown()`:
   - Calls `chat.stopAll()` to cancel running work
   - Performs graceful shutdown: close WebSocket connections, flush audit log, save state
   - Exits engine process (exit code 0 = clean shutdown, no restart)
2. Add connector slash command `/shutdown`:
   - In ChatSDKAdapter: `onSlashCommand("shutdown")` → send confirmation message with buttons ("Confirm" / "Cancel"), on confirm call `client.engine.shutdown.mutate()`
   - In TUI: handle `/shutdown` — prompt "Are you sure? This will stop the SA engine. (y/n)"
   - In Telegram: handle `/shutdown` command with inline keyboard confirmation
3. Add CLI command `sa shutdown`:
   - Calls `engine.shutdown()` via tRPC
   - Prints "SA engine stopped"
4. Distinguish from existing `sa engine stop`:
   - `sa engine stop` already exists — `/shutdown` is the in-chat equivalent
   - Unify: `sa shutdown` and `sa engine stop` should use the same graceful shutdown path

## Files to change

- `src/engine/procedures.ts` (modify — add `engine.shutdown` procedure)
- `src/engine/runtime.ts` (modify — graceful shutdown method)
- `src/connectors/chat-sdk/adapter.ts` (modify — add `/shutdown` slash command with confirmation)
- `src/connectors/tui/App.tsx` (modify — add `/shutdown` command with confirmation)
- `src/connectors/telegram/transport.ts` (modify — add `/shutdown` command with confirmation)
- `src/cli/index.ts` (modify — add `sa shutdown` command)

## Progress
- Added `engine.shutdown` tRPC procedure — stops all agents, sends SIGTERM without restart marker
- Added `/shutdown` to ChatSDKAdapter, TUI, and Telegram connectors
- Added `sa shutdown` CLI command
- Modified: procedures.ts, adapter.ts, App.tsx, transport.ts, cli/index.ts
- Verification: typecheck, lint, 740 tests pass

## Verification

- Run: `bun run typecheck`
- Expected: All procedures compile
- Manual: Send `/shutdown` from TUI, confirm, verify engine stops cleanly
- Edge cases: Shutdown during active task (should stop tasks first), shutdown while connectors are connecting, rapid shutdown after restart
