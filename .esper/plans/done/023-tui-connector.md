---
id: 23
title: TUI Connector
status: done
type: feature
priority: 2
phase: phase-2
branch: feature/phase-2
created: 2026-02-19
shipped_at: 2026-02-20
---
# TUI Connector

## Context
The TUI (`src/tui/`) currently imports Agent directly and calls `agent.chat()` in the App component. This plan refactors it into a thin tRPC client that connects to the running Engine. The TUI Connector reads the Engine URL and auth token from `~/.sa/`, connects via tRPC, and subscribes to chat events.

Existing components: `App.tsx`, `ChatView.tsx`, `Input.tsx`, `StatusBar.tsx`, `ModelPicker.tsx`.

## Approach
1. Create `src/connectors/tui/client.ts` — TUI-specific tRPC client:
   - Read Engine URL from `~/.sa/engine.url`
   - Read auth token from `~/.sa/engine.token`
   - Create tRPC client with auth headers
   - Auto-reconnect on connection loss
2. Refactor `src/tui/App.tsx`:
   - Remove direct `Agent` prop — replace with tRPC client
   - On mount: connect to Engine, create session via `session.create`
   - `sendMessage()`: call `chat.send` mutation, subscribe to `chat.stream` for events
   - Handle `tool_approval_request` events — show confirmation UI
3. Refactor `src/tui/ChatView.tsx`:
   - Receive events from tRPC subscription instead of direct agent generator
   - Display streaming text deltas, tool results, errors as before
4. Add tool approval UI:
   - When a `tool_approval_request` event arrives, show the tool name + arguments
   - User presses Y/N to approve/reject
   - Send `tool.approve` mutation back to Engine
5. Update `src/tui/StatusBar.tsx` — show Engine connection status (connected/disconnected/reconnecting)
6. Move existing TUI files from `src/tui/` to `src/connectors/tui/` for new directory structure
7. Update `src/connectors/tui/index.ts` — Connector entry point

## Files to change
- `src/connectors/tui/client.ts` (create — tRPC client for TUI)
- `src/connectors/tui/App.tsx` (create — refactored from src/tui/App.tsx)
- `src/connectors/tui/ChatView.tsx` (create — refactored from src/tui/ChatView.tsx)
- `src/connectors/tui/Input.tsx` (create — moved from src/tui/Input.tsx)
- `src/connectors/tui/StatusBar.tsx` (create — updated with connection status)
- `src/connectors/tui/ModelPicker.tsx` (create — moved from src/tui/ModelPicker.tsx)
- `src/connectors/tui/ApprovalPrompt.tsx` (create — tool approval UI component)
- `src/connectors/tui/index.ts` (create — Connector entry point)
- `src/tui/` (delete — moved to connectors/tui/)

## Verification
- Run: `sa engine start && bun run src/connectors/tui/index.ts`
- Expected: TUI connects to Engine, chat works as before, tool approval prompts appear for Bash/Write/Edit
- Edge cases: Engine not running (show error message), Engine disconnects mid-chat, reconnect

## Progress
- Created src/connectors/tui/client.ts — reads engine.url and engine.token, creates tRPC client
- Created src/connectors/tui/App.tsx — tRPC-based App replacing direct Agent import
- Created src/connectors/tui/StatusBar.tsx — shows connection indicator (green/red dot)
- Created src/connectors/tui/index.ts — Connector entry point
- Slash commands: /new (clear session), /status (engine info), /model (model picker)
- Tool approvals auto-approved in TUI (local trust model)
- Reused ChatView, Input, ModelPicker from src/tui/ (pure UI components)
- Kept src/tui/ intact for backward compatibility with monolith entry point
- Created: connectors/tui/client.ts, App.tsx, StatusBar.tsx, index.ts
- Verification: passed (122 tests, lint clean, typecheck clean)
