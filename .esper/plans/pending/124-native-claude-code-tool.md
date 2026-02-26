---
id: 124
title: Native claude_code tool — replace skill with ToolImpl
status: pending
type: feature
priority: 2
phase: 009-chat-sdk-and-agent-tools
branch: feature/009-chat-sdk-and-agent-tools
created: 2026-02-25
---

# Native claude_code tool — replace skill with ToolImpl

## Context

The current `claude-code` bundled skill instructs the agent to run `claude --print '...'` via the `exec` tool. This is brittle: one-shot stateless processes, auth detection via error message parsing, unstructured text output, no progress tracking. Plan 123 builds the shared `AgentSubprocess` infrastructure; this plan creates the native `claude_code` ToolImpl that uses it.

## Approach

1. Create `src/engine/tools/claude-code.ts` — `createClaudeCodeTool()`:
   - **Parameters** (TypeBox schema):
     - `task: string` — the coding task description
     - `files?: string[]` — relevant file paths to pass as context
     - `workdir?: string` — working directory (default: cwd or project root)
     - `background?: boolean` — run in background (default: auto-detect based on task complexity)
   - **Execution flow**:
     1. Probe auth via `AgentSubprocess.probeAuth("claude")`
     2. If not authenticated: check `secrets.enc` for `ANTHROPIC_API_KEY`, pass as env
     3. If still no auth: return error with setup instructions
     4. Build CLI args: `claude --print "<task>" --output-format json` (if available), or `claude --print "<task>"`
     5. If `files` provided: prepend file contents to task description
     6. Spawn via `AgentSubprocess`
     7. Parse result: extract summary, files modified, test results
     8. Return structured `ToolResult`
   - **Danger level**: `"moderate"` (delegates to external agent)
   - **Summary**: "Delegate coding tasks to Claude Code CLI"

2. Register in `src/engine/tools/index.ts`:
   - Add `createClaudeCodeTool` export
   - Factory function receives runtime deps (secrets manager for API key lookup)

3. Register in `src/engine/runtime.ts`:
   - Create tool instance with runtime deps
   - Add to tool registry

4. Deprecate old skill:
   - Keep `src/engine/skills/bundled/claude-code/SKILL.md` for backward compatibility
   - Add deprecation notice pointing to the native tool
   - Remove from skill catalog in a future phase

5. Update `specs/tools.md` with claude_code tool documentation

## Files to change

- `src/engine/tools/claude-code.ts` (create — claude_code ToolImpl)
- `src/engine/tools/index.ts` (modify — export and register)
- `src/engine/runtime.ts` (modify — instantiate with deps)
- `src/engine/skills/bundled/claude-code/SKILL.md` (modify — add deprecation notice)
- `specs/tools.md` (modify — document claude_code tool)

## Verification

- Run: `bun run typecheck`
- Expected: Tool compiles and registers correctly
- Manual: Ask SA to "use claude code to fix the bug in X", verify it uses native tool (not skill), returns structured result
- Edge cases: Claude Code not installed, expired OAuth, no API key, background task timeout
