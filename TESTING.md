# Esperta Aria Testing Guide

## Quick Reference

| Command                                 | Purpose                                    |
| --------------------------------------- | ------------------------------------------ |
| `vp run repo:check`                     | Run the cached repo check flow             |
| `vp run repo:test`                      | Run all tests through the repo task runner |
| `bun run check`                         | Wrapper for `vp run repo:check`            |
| `bun run test`                          | Wrapper for `vp run repo:test`             |
| `bun run test -- tests/tools.test.ts`   | Run one file                               |
| `ANTHROPIC_API_KEY=sk-... bun run test` | Run all tests including live               |

Canonical documentation:

- repo-wide testing guide: [docs/development/testing/README.md](./docs/development/testing/README.md)
- test plan overview: [docs/development/testing/plan/README.md](./docs/development/testing/plan/README.md)
- capability coverage: [docs/development/testing/plan/foundations/README.md](./docs/development/testing/plan/foundations/README.md)
- workflow coverage: [docs/development/testing/plan/workflows/README.md](./docs/development/testing/plan/workflows/README.md)
- execution, live AI, and release gates: [docs/development/testing/plan/execution/README.md](./docs/development/testing/plan/execution/README.md)

## Rules

1. **Every bug fix gets a regression test.** Write the failing test first, then fix.
2. **Test behavior, not implementation.** Test what the shipped system promises to do.
3. **Use unit tests for local logic and E2E tests for server workflows.** `Aria Server` is not considered covered by unit tests alone.
4. **Live LLM tests are required when model behavior is part of the contract.** Anything involving agent chat, tool dispatch, approvals, questions, automation behavior, or streaming semantics should have live coverage at the appropriate boundary.
5. **Use the shared helpers.** See `tests/helpers/` for temp dirs, live model setup, and test tools.
6. **Follow the canonical server plan.** For server changes, use [docs/development/testing/plan/README.md](./docs/development/testing/plan/README.md) as the release bar.

## Where to put tests

| Test type            | Location                      | When to use                                           |
| -------------------- | ----------------------------- | ----------------------------------------------------- |
| Co-located unit test | `packages/**/*.test.ts`       | Testing a single module's pure logic (no I/O, no LLM) |
| External unit test   | `tests/*.test.ts`             | Testing a subsystem with I/O or cross-module deps     |
| Live LLM test        | `tests/live/*.test.ts`        | Testing agent chat, tool dispatch, tRPC chat.stream   |
| Integration test     | `tests/integration/*.test.ts` | Testing two+ subsystems without LLM                   |
| E2E test             | `tests/e2e/*.test.ts`         | Testing full system initialization or user flows      |

For `Aria Server`, these buckets are only the starting point. The canonical server plan additionally requires real gateway transport tests, restart/durability tests, and live AI workflow coverage.

## Live LLM test patterns

### Basic agent chat test

```ts
import { describe, test, expect } from "bun:test";
import { Agent } from "@aria/agent-aria";
import { makeLiveRouter, describeLive } from "../helpers/live-model.js";

describeLive("Agent chat", () => {
  test("responds to a simple prompt", async () => {
    const agent = new Agent({
      router: makeLiveRouter(),
      tools: [],
      systemPrompt: "Reply with exactly one word.",
    });

    const events: string[] = [];
    for await (const event of agent.chat("Say hello")) {
      events.push(event.type);
    }

    expect(events).toContain("text_delta");
    expect(events.at(-1)).toBe("done");
  }, 15_000);
});
```

### Testing tool dispatch with real LLM

```ts
import { echoTool } from "../helpers/test-tools.js";

describeLive("Agent tool use", () => {
  test("agent calls a tool and gets result", async () => {
    const agent = new Agent({
      router: makeLiveRouter(),
      tools: [echoTool],
      systemPrompt: "When asked to echo, use the echo tool. Nothing else.",
    });

    const events = [];
    for await (const event of agent.chat('Use the echo tool with message "test123"')) {
      events.push(event);
    }

    const toolStart = events.find((e) => e.type === "tool_start");
    expect(toolStart).toBeDefined();
    expect(events.at(-1).type).toBe("done");
  }, 30_000);
});
```

### Key rules for live test assertions

- **Assert event types, not text content.** LLMs are non-deterministic. Check that `text_delta` events were emitted, not what they say.
- **Assert tool names, not arguments.** Check that the agent called `echo`, not the exact arguments.
- **Assert structural properties.** Event ordering (text_delta before done), event presence (tool_start exists), result shape (tool_end has content).
- **Use generous timeouts.** `15_000` for simple prompts, `30_000` for tool use. API latency varies.
- **Keep prompts directive.** "Use the echo tool" is better than "Can you please echo something?" — reduces non-determinism.
- **Use low maxTokens.** `64-256` is enough for test assertions. Saves cost and time.

## Unit test patterns

### Temp directories

```ts
import { withTempDir } from "../helpers/temp-dir.js";

describe("MyFeature", () => {
  withTempDir((getDir) => {
    test("writes a file", async () => {
      const dir = getDir();
      // use dir for file I/O
    });
  });
});
```

### Testing tools (without LLM)

```ts
import { Type } from "@mariozechner/pi-ai";
import type { ToolImpl } from "@aria/engine/agent/types.js";

const tool: ToolImpl = {
  name: "my_tool",
  description: "...",
  dangerLevel: "safe",
  parameters: Type.Object({ input: Type.String() }),
  execute: async (args) => ({ content: String(args.input) }),
};

test("my_tool returns input", async () => {
  const result = await tool.execute({ input: "hello" });
  expect(result.content).toBe("hello");
});
```

## What NOT to test

- Type definitions (`types.ts`) — no runtime behavior
- Re-export barrels (`index.ts`) — unless they contain logic
- Third-party library behavior — test YOUR code's usage of it
- Exact LLM response text — always non-deterministic
- TUI visual layout — no good Ink testing story with Bun yet

Do not treat file-level unit coverage as a substitute for workflow coverage. For `Aria Server`, the release question is whether the documented server flows work end-to-end.

## Danger level testing

When adding or modifying a tool:

- Test that `dangerLevel` is set correctly
- For `exec`-adjacent tools, test command classification
- For dangerous tools, write a live test verifying the approval flow

## CI expectations

- `bun test` must pass on every PR (live tests skip without API key)
- `bun run typecheck` must pass
- `bun run lint` must pass
- Live tests run in CI when `ANTHROPIC_API_KEY` secret is configured

For release decisions on `Aria Server`, also use the spec-centered checklist in [docs/development/testing/plan/README.md](./docs/development/testing/plan/README.md).
