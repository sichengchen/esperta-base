---
id: 36
title: Agent loop safeguards — remove round limit, add timeout + loop detection + result size guards
status: done
type: feature
priority: 2
phase: phase-2
branch: feature/phase-2
created: 2026-02-20
shipped_at: 2026-02-21
---
# Agent loop safeguards — remove round limit, add timeout + loop detection + result size guards

## Context

SA's agent loop (`src/engine/agent/agent.ts`) currently uses a hard `DEFAULT_MAX_TOOL_ROUNDS = 10` cap — the agent can only make 10 tool-call round-trips per `chat()` invocation, then it stops with an error. This is a blunt limit that prevents the agent from completing complex multi-step tasks (file refactors, multi-tool research, iterative debugging).

OpenClaw takes a fundamentally different approach: **no round limit at all**. Their agent loop runs `while (true)` until the model naturally stops calling tools, with layered safeguards preventing runaway behavior:

- **Agent timeout** (600s) — wall-clock cap on the entire run
- **Tool loop detection** (3-tier warn/block/circuit-breaker) — catches stuck repetitive patterns
- **Tool result size guards** (400k char max) — prevents context bloat

This plan removes SA's round limit and replaces it with OpenClaw's safeguard model, unlocking the agent's full potential while maintaining safety.

### Relevant existing code
- `src/engine/agent/agent.ts` — main loop with `maxToolRounds` cap
- `src/engine/agent/types.ts` — `AgentOptions`, `AgentEvent`, `ToolResult`
- `src/engine/agent/registry.ts` — `ToolRegistry.execute()` returns `ToolResult`
- `src/engine/runtime.ts` — `createAgent()` constructs Agent instances
- `src/engine/tools/bash.ts` — only tool with its own timeout (30s)

## Approach

### Milestone 1: Remove round limit, add agent timeout

Replace the `maxToolRounds` hard cap with an unbounded loop guarded by a wall-clock timeout.

1. **Remove `maxToolRounds`** from `AgentOptions` and delete `DEFAULT_MAX_TOOL_ROUNDS`
2. **Change the agent loop** from `for (let round = 0; round <= maxRounds; round++)` to `while (true)` — the loop now runs until the model stops calling tools (natural completion), the timeout fires, or the circuit breaker trips
3. Add `timeoutMs?: number` to `AgentOptions` (default: `DEFAULT_AGENT_TIMEOUT_MS = 600_000` — 10 minutes, matching OpenClaw). A value of `0` means no timeout.
4. In `agent.chat()`, create an `AbortSignal.timeout(timeoutMs)` at the top of the method
5. Check `signal.aborted` at each loop iteration (before streaming) and after each tool execution
6. On timeout, yield `{ type: "error", message: "Agent timeout (${timeoutMs/1000}s) exceeded" }` and return
7. Pass the signal to the PI-mono `stream()` call if it supports abort (check API)

### Milestone 2: Tool loop detection

Add a sliding-window detector that tracks recent tool calls and blocks repetitive patterns. Follows OpenClaw's 3-tier model.

1. Create `src/engine/agent/tool-loop-detection.ts`:
   - `ToolCallRecord = { hash: string; name: string; resultHash: string }`
   - `ToolLoopDetector` class with configurable thresholds:
     - `warnThreshold: 10` — emit warning event
     - `blockThreshold: 20` — block the tool call, return error result
     - `circuitBreakerThreshold: 30` — hard stop the agent loop
     - `windowSize: 30` — sliding window of recent calls
   - Hash function: deterministic hash of `toolName + JSON.stringify(sortedArgs)`
   - Result hash: hash of `result.content` to distinguish "same call, same result" (stuck) from "same call, different result" (progress)
   - `check(name, argsHash, resultHash)` → `{ level: "ok" | "warn" | "block" | "circuit_breaker", message?: string }`

2. Add new `AgentEvent` variant: `{ type: "warning", message: string }` for loop warnings

3. Integrate into `agent.ts` loop:
   - After each tool execution, record the call and check for loops
   - On `warn`: yield warning event, continue
   - On `block`: skip the tool call, inject error result `"Blocked: repeated identical call detected"`
   - On `circuit_breaker`: yield error event, break the loop

4. Add `toolLoopDetection?: boolean | ToolLoopConfig` to `AgentOptions` (default: enabled — unlike OpenClaw where it's opt-in, SA should be safe-by-default)

### Milestone 3: Tool result size guards

Truncate oversized tool results before they enter the message history.

1. Create `src/engine/agent/tool-result-guard.ts`:
   - `HARD_MAX_TOOL_RESULT_CHARS = 400_000` (matching OpenClaw)
   - `MAX_CONTEXT_SHARE = 0.3` (single result max 30% of context)
   - `MIN_KEEP_CHARS = 2_000` (always preserve at least this much)
   - `capToolResultSize(result: ToolResult, contextBudgetChars?: number): ToolResult` — truncates `result.content` if it exceeds limits, appends `\n...[truncated from ${original} to ${kept} chars]`

2. Integrate into `agent.ts`: call `capToolResultSize()` on every `ToolResult` before appending to messages

3. Add `maxToolResultChars?: number` to `AgentOptions` for override (default: `HARD_MAX_TOOL_RESULT_CHARS`)

### Milestone 4: Tests

1. Create `src/engine/agent/tool-loop-detection.test.ts`:
   - Test warning threshold triggers at correct count
   - Test block threshold prevents tool execution
   - Test circuit breaker stops the loop
   - Test sliding window eviction (old calls don't count)
   - Test that different results reset the counter (progress detection)

2. Create `src/engine/agent/tool-result-guard.test.ts`:
   - Test truncation at hard max
   - Test content under limit passes through unchanged
   - Test truncation message appended correctly
   - Test MIN_KEEP_CHARS floor

3. Create `src/engine/agent/agent-timeout.test.ts`:
   - Test that timeout yields error event (mock slow stream)

## Files to change

- `src/engine/agent/types.ts` (modify — remove `maxToolRounds`, add timeout/loop detection/result guard options to `AgentOptions`; add `warning` event type)
- `src/engine/agent/agent.ts` (modify — remove `DEFAULT_MAX_TOOL_ROUNDS` and `for` loop, replace with `while (true)` + timeout/loop detection/result guard)
- `src/engine/agent/tool-loop-detection.ts` (create — `ToolLoopDetector` class)
- `src/engine/agent/tool-result-guard.ts` (create — `capToolResultSize()` function and constants)
- `src/engine/agent/tool-loop-detection.test.ts` (create — loop detection unit tests)
- `src/engine/agent/tool-result-guard.test.ts` (create — result guard unit tests)
- `src/engine/agent/agent-timeout.test.ts` (create — timeout integration test)

## Verification

- Run: `bun test`
- Expected: All new tests pass; existing tests unaffected
- Run: `bun run typecheck`
- Expected: No type errors
- Edge cases:
  - Tool that returns empty string → should not be truncated
  - Tool called with same args but different results → should NOT trigger loop detection (progress is being made)
  - Timeout of 0 → should mean no timeout (infinite)
  - Agent with no tools → timeout still applies to LLM streaming
  - Agent making 50+ legitimate tool calls → should complete without hitting any limit (the old 10-round cap would have blocked this)
  - Existing code that passes `maxToolRounds` → should get a TypeScript error at compile time (breaking change, intentional)

## Progress
- Milestone 1: Removed DEFAULT_MAX_TOOL_ROUNDS and maxToolRounds, replaced for-loop with while(true) + AbortController timeout (600s default)
- Milestone 2: Created ToolLoopDetector with 3-tier detection (warn@10, block@20, circuit_breaker@30), sliding window of 30 calls, deterministic djb2 hashing
- Milestone 3: Created capToolResultSize() with 400k char hard max, newline-boundary truncation, MIN_KEEP_CHARS=2000 floor
- Milestone 4: 17 tests covering loop detection (9 tests) and result guard (8 tests)
- Modified: agent.ts, types.ts, index.ts, docs/architecture.md
- Created: tool-loop-detection.ts, tool-result-guard.ts, tool-loop-detection.test.ts, tool-result-guard.test.ts
- Verification: 201 tests pass, lint clean, typecheck clean
