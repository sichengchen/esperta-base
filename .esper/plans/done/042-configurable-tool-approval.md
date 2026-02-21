---
id: 42
title: Configurable tool approval for IM connectors
status: done
type: feature
priority: 1
phase: phase-3
branch: feature/phase-3
created: 2026-02-21
shipped_at: 2026-02-21
pr: https://github.com/sichengchen/sa/pull/7
---
# Configurable tool approval for IM connectors

## Context
Tool approval currently treats all tools equally — every tool_approval_request is forwarded to the active Connector and waits for user response (procedures.ts:20-35). TUI auto-approves all tools (App.tsx:215). Telegram and Discord show Approve/Reject buttons for every request. There is no per-connector or per-tool configuration, and no way to say "accept all calls to this tool for the rest of this session."

## Approach

1. **Add approval mode to config** — extend `SAConfigFile` and `RuntimeConfig` in `src/engine/config/types.ts` with a per-connector `toolApproval` setting:
   - `"always"` — ask for every tool call (current behavior for IM)
   - `"never"` — auto-approve everything (current TUI behavior)
   - `"ask"` — default: ask, but allow session-level overrides

2. **Add tRPC procedure for approval config** — new `tool.config` query to expose the approval mode to connectors, so they know whether to show buttons.

3. **Track session-level tool overrides in Engine** — maintain a `Map<sessionId, Set<toolName>>` of "accepted for this session" tools in `procedures.ts`. When a tool call comes in:
   - If mode is `"never"`, auto-approve.
   - If mode is `"always"`, always ask.
   - If mode is `"ask"` and the tool is in the session override set, auto-approve.
   - Otherwise, ask.

4. **Add "Accept all <tool> this session" button in IM connectors** — in the approval UI (Telegram inline keyboard, Discord button row), add a third button: "Always allow <toolName>". When pressed, call a new `tool.acceptForSession` tRPC mutation that adds the tool to the override set and approves the current call.

5. **Update config CLI** — add tool approval mode to ConnectorSettings screen.

## Files to change
- `src/engine/config/types.ts` (modify — add toolApproval config per connector)
- `src/engine/config/defaults.ts` (modify — add default approval modes)
- `src/engine/procedures.ts` (modify — approval logic with mode + session overrides)
- `src/shared/types.ts` (modify — add ConnectorType "webhook" later; add ToolApprovalMode type)
- `src/connectors/telegram/transport.ts` (modify — add "Always allow" button, check config)
- `src/connectors/discord/transport.ts` (modify — add "Always allow" button, check config)
- `src/connectors/tui/App.tsx` (modify — respect config instead of hardcoded auto-approve)
- `src/cli/config/ConnectorSettings.tsx` (modify — add tool approval mode selector)

## Verification
- Run: `bun test`
- Expected: All existing tests pass; new approval flow works with all three modes
- Edge cases: Session override set should be cleared when session is destroyed; "accept all" should not persist across sessions

## Progress
- Added ToolApprovalMode type ("always" | "never" | "ask") to shared/types.ts
- Added ToolApprovalConfig and toolApproval field to RuntimeConfig in config/types.ts
- Added default approval modes (tui: never, telegram: ask, discord: ask) in defaults.ts
- Added session-level tool override tracking (sessionToolOverrides Map) in procedures.ts
- Added approval mode resolution logic in getSessionAgent (checks config + session overrides)
- Added tool.config query and tool.acceptForSession mutation to tRPC router
- Session overrides cleaned up on session destroy
- Telegram: added "Always allow <tool>" third inline keyboard button + callback handler
- Discord: added "Always allow <tool>" third button + interaction handler
- TUI: updated comment — engine-side config handles approval mode, TUI still auto-approves if event arrives
- ConnectorSettings: added per-connector tool approval mode cycle selector (ask/never/always)
- Modified: src/shared/types.ts, src/engine/config/types.ts, src/engine/config/defaults.ts, src/engine/procedures.ts, src/connectors/telegram/transport.ts, src/connectors/discord/transport.ts, src/connectors/tui/App.tsx, src/cli/config/ConnectorSettings.tsx
- Verification: typecheck passed, lint passed, 201 tests passed
