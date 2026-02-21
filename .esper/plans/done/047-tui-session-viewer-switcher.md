---
id: 47
title: TUI session viewer and switcher
status: done
type: feature
priority: 2
phase: phase-3
branch: feature/phase-3
created: 2026-02-21
shipped_at: 2026-02-21
pr: https://github.com/sichengchen/sa/pull/7
---
# TUI session viewer and switcher

## Context
The TUI connector (`src/connectors/tui/App.tsx`) creates a single session on mount and only knows about its own session. The Engine's SessionManager tracks all sessions across all connectors, and there's already a `session.list` tRPC query that returns all sessions. Phase 3 adds the ability to view all sessions and switch between them in the TUI.

## Approach

1. **Add `/sessions` command** — in App.tsx `handleSubmit`, add a `/sessions` handler that:
   - Calls `client.session.list.query()` to get all sessions
   - Displays a formatted list: `[connectorType] sessionId — last active: <timestamp>`
   - Marks the current session with an indicator

2. **Add `/switch <id>` command** — switch the TUI's active session to an existing session:
   - Validate the session exists via the list
   - Update `sessionId` state
   - Load chat history via `client.chat.history.query({ sessionId })`
   - Display history in the ChatView
   - Show confirmation message

3. **Create SessionPicker component** — similar to ModelPicker, a selectable list overlay:
   - Triggered by `/sessions` or Ctrl+S shortcut
   - Shows all sessions with connector type, ID prefix, and last active time
   - Arrow keys to navigate, Enter to switch, Escape to cancel

4. **Update StatusBar** — show current session connector type and abbreviated session ID alongside model name.

## Files to change
- `src/connectors/tui/App.tsx` (modify — add /sessions, /switch commands, SessionPicker integration)
- `src/connectors/tui/SessionPicker.tsx` (create — selectable session list component)
- `src/connectors/tui/StatusBar.tsx` (modify — show session info)

## Verification
- Run: `bun test && bun run typecheck`
- Expected: /sessions lists all sessions; /switch changes active session and loads history
- Edge cases: Switching to a session owned by another connector type; session destroyed while viewing; empty session list; history message format compatibility with ChatView

## Progress
- Created SessionPicker component (arrow keys, Enter to switch, Esc to cancel)
- Added /sessions command to open session picker
- Added /switch <id> command for prefix-based session switching with history load
- Added Ctrl+S shortcut to toggle session picker
- Updated StatusBar to show session ID prefix and connector type
- Modified: src/connectors/tui/App.tsx, src/connectors/tui/SessionPicker.tsx, src/connectors/tui/StatusBar.tsx
- Verification: typecheck passed, lint passed, 201 tests passed
