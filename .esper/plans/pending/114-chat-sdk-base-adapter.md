---
id: 114
title: Chat SDK base adapter — shared bridge to SA engine
status: pending
type: feature
priority: 1
phase: 009-chat-sdk-and-agent-tools
branch: feature/009-chat-sdk-and-agent-tools
created: 2026-02-25
---

# Chat SDK base adapter — shared bridge to SA engine

## Context

Chat SDK (`chat` npm package from Vercel) provides a unified adapter pattern for Slack, Teams, Google Chat, Discord, GitHub, and Linear. Instead of writing per-platform connector classes with separate libraries (like Grammy or Discord.js), a single `ChatSDKAdapter` can bridge Chat SDK events (`onNewMention`, `onSubscribedMessage`, `onReaction`, `onButtonClick`, `onSlashCommand`) to SA's tRPC client.

The existing `src/connectors/shared/stream-handler.ts` handles text delta throttling and edit-lock serialization — the ChatSDKAdapter should reuse this pattern for Chat SDK's `thread.post()` streaming.

## Approach

1. Install `chat` package: `bun add chat`
2. Create `src/connectors/chat-sdk/adapter.ts` — the shared `ChatSDKAdapter` class:
   - Constructor takes: tRPC client, connector type, platform-specific config
   - `setupHandlers(chat)` — wires Chat SDK event handlers to SA engine:
     - `onNewMention` → create/resume session, call `chat.stream.subscribe()`
     - `onSubscribedMessage` → route to existing session
     - `onReaction` → forward emoji reactions
     - `onButtonClick` → handle tool approval responses
     - `onSlashCommand` → handle `/new`, `/status`, `/model`, `/stop`, `/restart`
   - `streamToThread(thread, sessionId, message)` — subscribe to `chat.stream`, pipe `text_delta` → `thread.post()` with throttled updates
   - Session management: `ensureSession(threadId)` with prefix-based lookup
   - Tool approval: send buttons via `thread.post(<Card>)`, handle `onButtonClick` to call `tool.approve()`
3. Create `src/connectors/chat-sdk/index.ts` — export adapter and types
4. Create `src/connectors/chat-sdk/formatter.ts` — shared formatting utilities for Chat SDK platforms (markdown sanitization, message splitting by platform limits)

## Files to change

- `package.json` (modify — add `chat` dependency)
- `src/connectors/chat-sdk/adapter.ts` (create — shared ChatSDKAdapter class)
- `src/connectors/chat-sdk/index.ts` (create — exports)
- `src/connectors/chat-sdk/formatter.ts` (create — shared formatting)

## Verification

- Run: `bun run typecheck`
- Expected: ChatSDKAdapter compiles with correct tRPC client types
- Edge cases: Chat SDK's `thread.post()` streaming behavior may differ from SA's `createStreamHandler` — verify throttle timing works
