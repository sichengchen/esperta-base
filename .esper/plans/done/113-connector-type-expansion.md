---
id: 113
title: ConnectorType expansion for Chat SDK platforms
status: done
type: feature
priority: 1
phase: 009-chat-sdk-and-agent-tools
branch: feature/009-chat-sdk-and-agent-tools
created: 2026-02-25
shipped_at: 2026-02-26
---
# ConnectorType expansion for Chat SDK platforms

## Context

`ConnectorTypeSchema` in `src/shared/types.ts` currently defines 6 types: `tui`, `telegram`, `discord`, `webhook`, `engine`, `cron`. Adding 5 new Chat SDK platforms (Slack, Teams, Google Chat, GitHub, Linear) requires expanding this enum and updating all downstream consumers — config defaults, auth, session prefixes, tool approval modes, and cron/webhook tool restrictions.

## Approach

1. Add `"slack" | "teams" | "gchat" | "github" | "linear"` to `ConnectorTypeSchema`
2. Update `src/engine/config/types.ts` — add defaults for new connector types in tool approval config
3. Update `src/engine/config/defaults.ts` — default approval modes for new connectors (all `"ask"` by default)
4. Update `src/engine/auth.ts` — allow new connector types in pairing flow
5. Update `src/engine/runtime.ts` — register new connector types for session creation
6. Update any hardcoded connector type checks (search for `"discord"`, `"telegram"` pattern matching)

## Files to change

- `src/shared/types.ts` (modify — expand ConnectorTypeSchema enum)
- `src/engine/config/types.ts` (modify — add connector config shape for new types)
- `src/engine/config/defaults.ts` (modify — default approval modes)
- `src/engine/auth.ts` (modify — allow new types in pairing)
- `src/engine/runtime.ts` (modify — register new types)

## Verification

- Run: `bun run typecheck`
- Expected: No type errors — all consumers handle new enum variants
- Edge cases: Existing connectors (tui, telegram, discord) must continue working unchanged

## Progress
- Expanded ConnectorTypeSchema with 5 new types: slack, teams, gchat, github, linear
- Added default toolApproval ("ask") and verbosity ("silent") for all new connectors
- auth.ts and runtime.ts needed no changes — they accept any ConnectorType dynamically
- IM detection checks use exclusion pattern (not tui/engine) — new types automatically classify as IM
- config/types.ts uses Partial<Record<ConnectorType, ...>> — already supports new types
- notify tool has its own literal union separate from ConnectorType — no changes needed
- Modified: src/shared/types.ts, src/engine/config/defaults.ts
- Verification: typecheck, lint, and all 738 tests pass
