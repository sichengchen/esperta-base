---
id: 25
title: Discord Connector
status: done
type: feature
priority: 2
phase: phase-2
branch: feature/phase-2
created: 2026-02-19
shipped_at: 2026-02-20
pr: https://github.com/sichengchen/sa/pull/2
---
# Discord Connector

## Context
SA currently supports TUI and Telegram. This plan adds Discord as a third Connector using `discord.js`. The Discord Connector follows the same pattern as the Telegram Connector: receive messages, send to Engine via tRPC, stream responses back.

## Approach
1. Install `discord.js` dependency
2. Create `src/connectors/discord/transport.ts` — Discord Connector:
   - Initialize discord.js `Client` with message content intent
   - On `messageCreate`: filter to allowed channel/user, call `chat.send`, subscribe to `chat.stream`
   - Stream responses: send initial message, then edit with throttle (same pattern as Telegram)
   - Handle long messages: Discord has 2000 char limit — split into multiple messages
   - Handle `tool_approval_request`: send embed with approve/reject buttons (Discord buttons component)
   - Handle button interactions for tool approval
3. Create `src/connectors/discord/client.ts` — tRPC client
4. Create `src/connectors/discord/formatter.ts`:
   - `formatToolResult()` — format tool results as Discord embeds
   - `splitMessage()` — split long messages at 2000 char boundary
5. Create `src/connectors/discord/index.ts` — Connector entry point
6. Support configuration:
   - Discord bot token stored in encrypted secrets (`secrets.enc`)
   - Allowed guild ID and channel ID in config
   - Allowed user ID for DM filtering

## Files to change
- `package.json` (modify — add discord.js dependency)
- `src/connectors/discord/transport.ts` (create — Discord Connector implementation)
- `src/connectors/discord/client.ts` (create — tRPC client)
- `src/connectors/discord/formatter.ts` (create — message formatting)
- `src/connectors/discord/index.ts` (create — Connector entry point)
- `src/config/types.ts` (modify — add Discord config fields)

## Verification
- Run: `sa engine start && bun run src/connectors/discord/index.ts`
- Expected: Discord bot connects, responds to messages in configured channel, streams responses
- Edge cases: Message over 2000 chars, bot mentioned vs DM, tool approval via buttons, Engine disconnection

## Progress
- Installed discord.js v14.25.1
- Created DiscordConnector with message handler, button interactions, streaming edits
- Slash commands: /new, /status, /model
- Tool approval via Discord buttons (Approve/Reject)
- Formatter with 2000-char split and code block tool results
- Filtering by guild, channel, and user ID
- Created: connectors/discord/client.ts, transport.ts, formatter.ts, index.ts
- Verification: passed (122 tests, lint clean, typecheck clean)
