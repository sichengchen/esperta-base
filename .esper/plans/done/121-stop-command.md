---
id: 121
title: /stop command — force cancel running agent work
status: done
type: feature
priority: 2
phase: 009-chat-sdk-and-agent-tools
branch: feature/009-chat-sdk-and-agent-tools
created: 2026-02-25
shipped_at: 2026-02-26
---
# /stop command — force cancel running agent work

## Context

SA currently has no way to force-stop a running agent mid-task. If the agent is stuck in a long tool call chain, exec loop, or subagent delegation, the user must wait for completion or kill the engine process. A `/stop` command should immediately cancel all running work for the current session.

## Approach

1. Add `AbortController` support to the Agent class (`src/engine/agent/agent.ts`):
   - Store an `AbortController` per active chat loop
   - Pass `signal` to `stream()` call and tool executions
   - On abort: cancel streaming, kill running exec processes, cancel pending subagent tasks, yield `done` event with `stopReason: "cancelled"`
2. Add tRPC procedure `chat.stop(sessionId)`:
   - Calls `agent.abort()` on the session's agent
   - Returns `{ cancelled: boolean, tasksKilled: number }`
3. Add tRPC procedure `chat.stopAll()`:
   - Iterates all active sessions and aborts each
   - Returns summary of cancelled work
4. Add connector slash command `/stop`:
   - In ChatSDKAdapter: `onSlashCommand("stop")` → call `client.chat.stop.mutate({ sessionId })`
   - In TUI: handle `/stop` in `handleSubmit`
   - In Telegram: handle `/stop` command
5. Add CLI command `sa stop`:
   - Calls `chat.stopAll()` via tRPC client
   - Prints summary of cancelled work
6. Kill background exec processes:
   - `execKill` already exists — `/stop` should call it for all running handles in the session

## Files to change

- `src/engine/agent/agent.ts` (modify — add AbortController, abort() method)
- `src/engine/procedures.ts` (modify — add `chat.stop` and `chat.stopAll` procedures)
- `src/connectors/chat-sdk/adapter.ts` (modify — add `/stop` slash command handler)
- `src/connectors/tui/App.tsx` (modify — add `/stop` command)
- `src/connectors/telegram/transport.ts` (modify — add `/stop` command)
- `src/cli/index.ts` (modify — add `sa stop` command)

## Progress
- Added `activeAbortController`, `isRunning` getter, and `abort()` method to Agent class
- Added `chat.stop(sessionId)` and `chat.stopAll()` tRPC procedures — auto-reject pending approvals/escalations on stop
- Added `/stop` command to ChatSDKAdapter, TUI, and Telegram connectors
- Added `sa stop` CLI command
- Modified: agent.ts, procedures.ts, adapter.ts, App.tsx, transport.ts, cli/index.ts
- Verification: typecheck, lint, 740 tests pass

## Verification

- Run: `bun run typecheck`
- Expected: AbortController properly typed, procedures compile
- Manual: Start a long task (e.g., exec with sleep), send `/stop`, verify immediate cancellation
- Edge cases: Stop during tool approval wait, stop during subagent execution, stop when nothing is running
