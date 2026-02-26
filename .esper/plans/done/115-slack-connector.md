---
id: 115
title: Slack connector via Chat SDK
status: done
type: feature
priority: 2
phase: 009-chat-sdk-and-agent-tools
branch: feature/009-chat-sdk-and-agent-tools
created: 2026-02-25
shipped_at: 2026-02-26
pr: https://github.com/sichengchen/sa/pull/31
---
# Slack connector via Chat SDK

## Context

Slack is the most feature-rich Chat SDK platform — full streaming support, Block Kit buttons, modals, slash commands. SA needs a Slack connector that uses the shared ChatSDKAdapter from plan 114 with Slack-specific configuration.

Chat SDK auto-detects Slack credentials from `SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET` environment variables. SA should store these via `set_env_secret` in `secrets.enc`.

## Approach

1. Install `@chat-adapter/slack`: `bun add @chat-adapter/slack`
2. Create `src/connectors/slack/index.ts`:
   - Import `ChatSDKAdapter` from `../chat-sdk/adapter.js`
   - Import Slack adapter from `@chat-adapter/slack`
   - Initialize Chat SDK with Slack adapter and SA's ChatSDKAdapter bridge
   - Configure Slack-specific options: message formatting (Block Kit), 3000-char message limit, thread-based sessions
3. Create `src/connectors/slack/config.ts`:
   - Required env vars: `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`
   - Optional: `SLACK_APP_TOKEN` (for Socket Mode — no public webhook needed)
4. Wire into `src/cli/index.ts` — add `sa slack` subcommand to start Slack connector
5. Update `specs/connectors.md` with Slack setup instructions
6. Update bundled `sa` skill with Slack connector documentation

## Files to change

- `package.json` (modify — add `@chat-adapter/slack`)
- `src/connectors/slack/index.ts` (create — Slack connector entry)
- `src/connectors/slack/config.ts` (create — credential config)
- `src/cli/index.ts` (modify — add `sa slack` command)
- `specs/connectors.md` (modify — Slack setup docs)

## Verification

- Run: `bun run typecheck`
- Expected: Slack connector compiles and exports correctly
- Manual: Start Slack connector, mention bot in Slack channel, verify streaming response
- Edge cases: Slack 3000-char message limit, thread vs channel reply behavior, rate limits on edits
