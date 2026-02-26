---
name: claude-code
description: "[DEPRECATED] Use the native `claude_code` tool instead. This skill is kept for backward compatibility only."
---
# Claude Code Orchestration (DEPRECATED)

> **This skill is deprecated.** SA now has a native `claude_code` tool that provides structured results, auth probing, and background execution. Use `claude_code({ task: "..." })` instead of reading this skill.

You can delegate coding tasks to **Claude Code** (`claude` CLI) using the `exec` tool. Claude Code is an agentic coding assistant with deep code understanding, file editing, and terminal access.

## When to delegate

Delegate to Claude Code when:
- The user asks for complex code generation, refactoring, or debugging
- The task benefits from Claude Code's agentic file-editing capabilities (multi-file changes, test writing, etc.)
- The user explicitly asks to "use Claude Code" or "delegate to Claude"

Do NOT delegate when:
- You can handle the task directly (simple answers, config changes, memory notes)
- The task requires SA-specific tools (web_search, remember, notify, skills)
- The user is asking a question, not requesting code changes

## How to invoke

### One-shot mode (recommended)

Use `--print` for non-interactive one-shot execution:

```
exec({
  command: "claude --print 'Your detailed task description here'",
  background: true
})
```

- **Always use `background: true`** for tasks that may take more than a few seconds
- Use `exec_status` to poll for completion on background tasks
- `--print` outputs plain text (no interactive UI)

### Passing context

Include relevant context in the prompt:
- File paths to read or modify
- Error messages to debug
- Constraints (language, framework, style)
- Working directory context

Example:
```
exec({
  command: "claude --print 'Fix the TypeScript error in src/engine/agent.ts. The error is: Type string is not assignable to type number on line 42. Read the file first, understand the context, then fix it.'",
  background: true,
  danger: "moderate"
})
```

## Authentication

Claude Code supports **OAuth login** — users who have run `claude login` already have a valid session stored locally. Try the OAuth path first and only fall back to explicit API key passing if needed.

### OAuth-first flow

1. **Try without an API key first** — invoke `claude --print '...'` without passing `ANTHROPIC_API_KEY` in `env`. This works if the user has an active OAuth session from `claude login`.
2. **Check for auth errors** — if the command fails (non-zero exit) and the output contains auth-related messages (e.g. "not authenticated", "API key required", "unauthorized"), the user does not have an active OAuth session.
3. **Fall back to explicit key** — pass `ANTHROPIC_API_KEY` explicitly via the `env` parameter:
   ```
   exec({
     command: "claude --print '...'",
     background: true,
     env: { "ANTHROPIC_API_KEY": "<key>" }
   })
   ```

**Note**: The `exec` tool sanitizes environment variables — `ANTHROPIC_API_KEY` is stripped from the subprocess environment by default. When falling back to explicit key mode, you MUST pass it via the `env` parameter.

To get the key for fallback:
1. Check if the user has configured an Anthropic provider — the key is in `secrets.enc`
2. If you don't have the key value, ask the user to provide it or use `set_env_secret` to store it

## Output handling

- `--print` mode outputs plain text to stdout
- For background tasks, use `exec_status({ handle: "<handle>" })` to check progress
- Claude Code may produce long output — the exec tool caps output at 1MB
- Parse the output text and summarize the result for the user

## Limitations

- **No interactive mode** — SA cannot pipe stdin to subprocesses, so `claude` (without `--print`) will not work
- **One-shot only** — each invocation is independent; Claude Code does not share context between calls
- **No streaming** — you get the full output when the command completes, not incremental updates
- **Not installed by default** — if `claude` is not found, inform the user: "Claude Code CLI is not installed. Install it with: `curl -fsSL https://claude.ai/install.sh | bash`" (the npm packages `@anthropic-ai/claude-code` and `claude` are outdated — use the native installer instead)

## Documentation

Official docs: https://code.claude.com/docs

## Danger classification

- Set `danger: "moderate"` for code generation and file editing tasks
- Set `danger: "dangerous"` if the task involves running tests, installing packages, or executing generated code
- Set `danger: "safe"` only for read-only operations like code analysis
