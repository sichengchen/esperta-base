---
id: 20
title: Agent runtime migration to Engine
status: done
type: feature
priority: 1
phase: phase-2
branch: feature/phase-2
created: 2026-02-19
shipped_at: 2026-02-20
pr: https://github.com/sichengchen/sa/pull/2
---
# Agent runtime migration to Engine

## Context
The Agent, ModelRouter, MemoryManager, and Tools are currently instantiated in `src/index.ts` and passed directly to the TUI and Telegram transport. This plan moves all runtime logic into the Engine process, wiring the existing classes to tRPC procedure handlers.

The Agent class (`src/agent/agent.ts`) already has a clean `chat()` async generator that yields `AgentEvent`s — this maps naturally to a tRPC subscription.

## Approach
1. Create `src/engine/runtime.ts` — the Engine runtime that bootstraps all subsystems:
   - Load config via `ConfigManager`
   - Initialize `MemoryManager`
   - Load secrets, initialize `ModelRouter`
   - Register built-in tools + remember tool
   - Build system prompt (identity, tools, safety, user profile, heartbeat, memory)
   - Create `Agent` instance
   - Export a singleton runtime object with all subsystems accessible
2. Implement tRPC procedure handlers in `src/engine/router.ts`:
   - `chat.send`: Look up session, call `agent.chat(text)`, store events, return session ID
   - `chat.stream`: Create a tRPC subscription that yields `AgentEvent`s from the agent's async generator
   - `chat.history`: Return session messages
   - `tool.approve`: Resolve a pending approval promise (Engine pauses tool execution until Connector responds)
3. Implement tool approval flow:
   - When Agent encounters a "dangerous" tool (Bash, Write, Edit), Engine emits a `tool_approval_request` event to the Connector
   - Engine awaits Connector response via `tool.approve` procedure
   - If approved, execute the tool; if rejected, return error to Agent
4. Per-session Agent instances: Each session gets its own Agent with its own message history, but shares the same Router, Memory, and Tools
5. Update `src/engine/index.ts` to use the runtime bootstrap

## Files to change
- `src/engine/runtime.ts` (create — Engine runtime bootstrap)
- `src/engine/router.ts` (modify — implement chat, tool procedures with real logic)
- `src/shared/types.ts` (modify — add ToolApprovalRequest, ToolApprovalResponse types)
- `src/agent/agent.ts` (modify — add hook point for tool approval callback)
- `src/engine/index.ts` (modify — use runtime bootstrap)

## Verification
- Run: `bun run src/engine/index.ts` and use a tRPC client to send a chat message
- Run: `bun test`
- Expected: Agent streams events via tRPC subscription, tool results are returned
- Edge cases: Tool approval timeout, session not found, agent error during streaming

## Progress
- Created src/engine/runtime.ts — bootstraps ConfigManager, MemoryManager, ModelRouter, Tools, system prompt
- Added ToolApprovalCallback to Agent (onToolApproval option, yields tool_approval_request events)
- Per-session Agent instances via sessionAgents Map in router
- chat.stream subscription wires Agent.chat() async generator to EngineEvent stream
- tool.approve resolves pending approval promises with 5-min timeout
- session.destroy cleans up Agent instances
- Router now uses createAppRouter(runtime) factory pattern
- Modified: agent/types.ts, agent/agent.ts, agent/index.ts, engine/router.ts, engine/server.ts, engine/index.ts
- Created: engine/runtime.ts
- Verification: passed (107 tests, lint clean, typecheck clean)
