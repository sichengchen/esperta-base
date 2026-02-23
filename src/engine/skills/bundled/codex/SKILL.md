---
name: codex
description: Delegate coding tasks to OpenAI Codex CLI. Use when: the user wants to generate or edit code using Codex as a sub-agent. NOT for: general chat, non-coding tasks, or when the user wants YOU to do the coding directly.
---
# Codex CLI Orchestration

You can delegate coding tasks to **OpenAI Codex CLI** (`codex`) using the `exec` tool. Codex is an agentic coding tool from OpenAI.

## When to delegate

Delegate to Codex when:
- The user explicitly asks to use Codex or OpenAI's coding agent
- The user prefers OpenAI models for code generation
- The task involves complex code generation, debugging, or refactoring

Do NOT delegate when:
- You can handle the task directly
- The task requires SA-specific tools (web_search, remember, notify, skills)
- The user is asking a question, not requesting code changes

## How to invoke

Use `--quiet` for non-interactive output:

```
exec({
  command: "codex --quiet 'Your detailed task description here'",
  background: true
})
```

- **Always use `background: true`** for tasks that may take more than a few seconds
- Use `exec_status` to poll for completion on background tasks

### Passing context

Include file paths, error messages, and constraints in the prompt:

```
exec({
  command: "codex --quiet 'Refactor the function parseConfig in src/config.ts to use async/await instead of callbacks. Keep the same interface.'",
  background: true,
  danger: "moderate"
})
```

## Authentication

Codex supports **OAuth login** — users who have run `codex auth login` already have a valid session stored locally. Try the OAuth path first and only fall back to explicit API key passing if needed.

### OAuth-first flow

1. **Try without an API key first** — invoke `codex --quiet '...'` without passing `OPENAI_API_KEY` in `env`. This works if the user has an active OAuth session from `codex auth login`.
2. **Check for auth errors** — if the command fails (non-zero exit) and the output contains auth-related messages (e.g. "not authenticated", "API key required", "unauthorized"), the user does not have an active OAuth session.
3. **Fall back to explicit key** — pass `OPENAI_API_KEY` explicitly via the `env` parameter:
   ```
   exec({
     command: "codex --quiet '...'",
     background: true,
     env: { "OPENAI_API_KEY": "<key>" }
   })
   ```

**Note**: The `exec` tool sanitizes environment variables — `OPENAI_API_KEY` is stripped from the subprocess environment by default. When falling back to explicit key mode, you MUST pass it via the `env` parameter.

To get the key for fallback:
1. Check if the user has configured an OpenAI provider — the key is in `secrets.enc`
2. If you don't have the key value, ask the user to provide it or use `set_env_secret` to store it

## Output handling

- `--quiet` mode outputs results to stdout
- For background tasks, use `exec_status({ handle: "<handle>" })` to check progress
- Parse the output and summarize the result for the user

## Limitations

- **No interactive mode** — SA cannot pipe stdin to subprocesses
- **One-shot only** — each invocation is independent
- **Not installed by default** — if `codex` is not found, inform the user: "OpenAI Codex CLI is not installed. Install it with `npm install -g @openai/codex` or `brew install --cask codex`"

## Documentation

Official docs: https://developers.openai.com/codex/cli/

## Danger classification

- Set `danger: "moderate"` for code generation and file editing tasks
- Set `danger: "dangerous"` if the task involves running tests, installing packages, or executing generated code
- Set `danger: "safe"` only for read-only operations like code analysis
