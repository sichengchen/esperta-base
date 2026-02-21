# SA (Sasa) — Constitution

## What This Is
SA (nicknamed Sasa) is a personal AI agent assistant with minimalist design. It provides a local-first, self-hosted agent that communicates via a TUI (Ink) and instant messaging (Telegram), with tool-calling capabilities, long-term memory, and a configurable multi-provider model router. Built for a single power user as a daily-driver personal assistant.

## What This Is NOT
- **Not a SaaS or hosted service** — no multi-tenancy, billing, user management, or cloud hosting
- **Not a full IDE or code editor** — it assists but does not replace your editor or Claude Code
- **Not a chatbot framework** — it is a personal agent, not a platform for building chatbots for others
- **Not a deployment platform** — it runs locally, not on servers for others

## Technical Decisions
- **Stack**: TypeScript, Bun runtime, Ink (React) for TUI
- **Architecture**: Monolithic single-process agent with modular subsystems (router, tools, memory, transports)
- **Key dependencies**:
  - `@mariozechner/pi-ai` (PI-mono) — unified multi-provider LLM API (Anthropic, OpenAI, Google, etc.)
  - `ink` — React-based terminal UI
  - `grammy` or `telegraf` — Telegram bot API
- **Configuration**: Markdown files for identity/personality, JSON files for runtime config
- **Model router**: Easy to configure, stores multiple model configurations, quick switching between models/providers

## Testing Strategy
- **What gets tested**: Core logic (model router, tool execution, memory persistence) via unit tests; end-to-end flows (onboarding, chat loop, Telegram integration) via integration tests
- **Tooling**: `bun:test` (built-in test runner)
- **Commands**:
  - `bun test` — run all tests
  - `bun run lint` — lint
  - `bun run typecheck` — type checking

## Principles
1. **Minimalism over features** — every feature must justify its complexity; less is more
2. **Local-first, private by default** — all data stays on the user's machine; no telemetry, no cloud sync
3. **Configuration as documents** — Markdown and JSON files are the source of truth, not databases
4. **Single-user simplicity** — no auth, no permissions, no multi-user abstractions
5. **Composable, not monolithic** — subsystems (router, tools, memory, transports) are loosely coupled and independently testable
6. **Keep the bundled `sa` skill up to date** — `src/engine/skills/bundled/sa/SKILL.md` documents SA's architecture, commands, and capabilities. Update it as features evolve.
7. **Credentials and config through SA, not the shell** — When introducing features that require API keys or credentials: store values in `secrets.enc` (encrypted), reference them from `config.json` if needed, inject into `process.env` at engine startup, and update the bundled `sa` skill so the agent knows to use `set_api_key` / `sa config` instead of shell profiles (`.zshrc`, `.bashrc`, etc.).
