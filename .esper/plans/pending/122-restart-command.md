---
id: 122
title: /restart command — force SA restart
status: pending
type: feature
priority: 2
phase: 009-chat-sdk-and-agent-tools
branch: feature/009-chat-sdk-and-agent-tools
created: 2026-02-25
---

# /restart command — force SA restart

## Context

SA currently supports `sa engine restart` which stops and restarts the engine daemon. A `/restart` command should be available as a connector slash command that triggers the same flow — stop all running work, shut down the engine, and restart it.

This differs from `/stop`: `/stop` cancels agent work but keeps the engine running. `/restart` kills and restarts the entire engine process.

## Approach

1. Add tRPC procedure `engine.restart()`:
   - Calls `chat.stopAll()` first to cancel running work
   - Sends `{ restarting: true }` response
   - Schedules engine shutdown after a short delay (100ms) to allow the response to be sent
   - Engine process exits with a restart signal (exit code 75 = `EX_TEMPFAIL`, or write a restart marker file)
   - The engine launcher (from `sa engine start`) detects the restart signal and re-launches
2. Add connector slash command `/restart`:
   - In ChatSDKAdapter: `onSlashCommand("restart")` → call `client.engine.restart.mutate()`
   - In TUI: handle `/restart` — warn "SA is restarting...", call procedure, exit TUI
   - In Telegram: handle `/restart` command
3. Add CLI command `sa restart`:
   - Calls `engine.restart()` via tRPC
   - Waits for engine to come back up (poll health endpoint)
   - Prints "SA restarted successfully"
4. Engine launcher modification:
   - In `src/cli/engine.ts` (or wherever `sa engine start` lives): detect restart exit code and re-launch
   - Alternatively: write `~/.sa/engine.restart` marker, launcher watches for it

## Files to change

- `src/engine/procedures.ts` (modify — add `engine.restart` procedure)
- `src/engine/runtime.ts` (modify — add graceful restart method)
- `src/connectors/chat-sdk/adapter.ts` (modify — add `/restart` slash command handler)
- `src/connectors/tui/App.tsx` (modify — add `/restart` command)
- `src/connectors/telegram/transport.ts` (modify — add `/restart` command)
- `src/cli/index.ts` (modify — add `sa restart` command)
- `src/cli/engine.ts` (modify — restart signal detection in launcher)

## Verification

- Run: `bun run typecheck`
- Expected: All procedures and types compile
- Manual: Run `/restart` from TUI, verify engine stops and restarts, connectors reconnect
- Edge cases: Restart while exec processes are running (should kill them first), restart during pairing flow, rapid double-restart
