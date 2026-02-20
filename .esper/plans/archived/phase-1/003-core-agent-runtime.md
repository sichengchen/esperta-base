---
id: 3
title: Core agent runtime
status: done
type: feature
priority: 3
phase: phase-1
branch: feature/phase-1
created: 2026-02-19
shipped_at: 2026-02-19
pr: https://github.com/sichengchen/sa/pull/1
---
# Core agent runtime

## Context
The agent runtime is the central loop: it receives user messages, sends them to the LLM via the model router, handles tool-call responses, executes tools, and returns results. This is the backbone that TUI and Telegram transports will plug into.

## Approach
1. Define core types:
   - `Message` — role (user/assistant/system/tool), content, tool calls, tool results
   - `Conversation` — ordered list of messages with metadata
   - `AgentOptions` — model router, tools registry, memory, system prompt
2. Implement `Agent` class:
   - `constructor(options)` — initializes with router, tools, memory, identity
   - `chat(userMessage): AsyncGenerator<Message>` — streaming conversation loop
   - Handles tool-call responses: parse tool calls → execute → append results → re-send
   - Loads system prompt from identity Markdown file
   - Injects memory context into system prompt
3. Implement a `ToolRegistry` that maps tool names to implementations
4. Conversation history management — append, truncate for context window
5. Write unit tests with a mock LLM provider

## Files to change
- `src/agent/types.ts` (create — Message, Conversation, AgentOptions types)
- `src/agent/agent.ts` (create — Agent class)
- `src/agent/registry.ts` (create — ToolRegistry)
- `src/agent/index.ts` (create — barrel export)
- `tests/agent.test.ts` (create — unit tests with mock provider)

## Verification
- Run: `bun test tests/agent.test.ts`
- Expected: agent sends message, receives response, handles tool calls in loop, respects max iterations
- Edge cases: tool execution failure, empty response, max tool-call depth

## Progress
- Implemented Agent class with streaming chat loop, ToolRegistry with register/execute/getToolDefinitions
- Agent uses PI-mono stream() for LLM calls, handles tool-call → execute → re-send loop with configurable max rounds
- Types: ToolImpl, ToolResult, AgentOptions, AgentEvent
- Modified: src/agent/types.ts, src/agent/registry.ts, src/agent/agent.ts, src/agent/index.ts, tests/agent.test.ts
- Verification: passed — 7 tests pass, typecheck clean
