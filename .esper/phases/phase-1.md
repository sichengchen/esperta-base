---
phase: phase-1
title: MVP — Core Agent with TUI & Telegram
status: active
---

# Phase 1: MVP — Core Agent with TUI & Telegram

## Goal
Deliver a working personal AI agent that can be configured via an onboarding wizard, chatted with through a terminal TUI and Telegram, execute tools (Read/Write/Edit/Bash), persist long-term memory, and switch between LLM providers/models on the fly.

## In Scope
- Project scaffolding (Bun, TypeScript, package.json, directory structure)
- Model router with PI-mono integration (multi-provider, config storage, easy switching)
- Core agent runtime (conversation loop, message handling, tool dispatch)
- Built-in tools: Read, Write, Edit, Bash
- Identity & configuration system (Markdown identity file, JSON runtime configs)
- Long-term memory system (persistent across sessions)
- TUI interface with Ink (chat view, input, model switching UI)
- Telegram bot transport (send/receive messages, tool results)
- Onboarding wizard (TUI — walks through bot token, model config, identity setup)
- Unit tests and integration tests for core subsystems

## Out of Scope (deferred)
- Installable skills/plugins system (Phase 2)
- Cron jobs and heartbeat prompts (Phase 2)
- Web UI (not planned)
- Multi-user support (never)

## Acceptance Criteria
- [ ] New user can run the onboarding wizard and configure identity, model, and Telegram bot
- [ ] User can chat with the agent via the Ink TUI
- [ ] User can chat with the agent via Telegram
- [ ] Agent can execute Read, Write, Edit, and Bash tools and return results
- [ ] Model router supports at least 2 providers (e.g. Anthropic + OpenAI) and switching is instant
- [ ] Long-term memory persists between sessions and is queryable
- [ ] All core subsystems have passing unit tests
- [ ] Integration test covers a full chat→tool→response round trip

## Shipped Plans
- #1 — Project scaffolding: Run `bun init` to create `package.json` and `tsconfig.json`. Files: package.json, tsconfig.json, .gitignore, .env.example, src/index.ts
- #2 — Model router with PI-mono integration: Define a `ModelConfig` type and implement `ModelRouter` class wrapping PI-mono. Files: types.ts, router.ts, index.ts, router.test.ts
- #5 — Identity & configuration system: Define the config directory structure with `~/.sa/`. Files: types.ts, manager.ts, defaults.ts, index.ts, config.test.ts
- #3 — Core agent runtime: Implement `Agent` class with streaming chat loop and tool dispatch. Files: types.ts, agent.ts, registry.ts, index.ts, agent.test.ts
- #4 — Built-in tools (Read, Write, Edit, Bash): Implement each tool with validation and error handling. Files: read.ts, write.ts, edit.ts, bash.ts, index.ts, tools.test.ts
- #6 — Long-term memory system: Define memory structure with `~/.sa/memory/` directory. Files: types.ts, manager.ts, index.ts, remember.ts, memory.test.ts
- #7 — TUI interface with Ink: Create the main `App` component that orchestrates the TUI. Files: App.tsx, ChatView.tsx, Input.tsx, StatusBar.tsx, ModelPicker.tsx, index.ts
- #8 — Telegram bot integration: Choose library `grammy` and implement `TelegramTransport` class. Files: transport.ts, formatter.ts, index.ts, telegram.test.ts
- #9 — Onboarding wizard (TUI): Detect first run and launch step-by-step setup wizard. Files: Wizard.tsx, Welcome.tsx, Identity.tsx, ModelSetup.tsx, TelegramSetup.tsx, Confirm.tsx
- #10 — Integration and E2E tests: Agent integration test with tool chain, config+router, memory persistence, and smoke test. Files: agent-flow.test.ts, config-router.test.ts, tool-chain.test.ts, memory-persistence.test.ts, smoke.test.ts
- #11 — README and documentation: Write `README.md` at repo root — concise overview with quickstart and links to `docs/`. Files: README.md, configuration.md, tools.md, architecture.md, development.md
- #12 — Model setup wizard — provider picker + model list: Replace ModelSetup.tsx with 4-substep flow: provider picker → credentials → async model fetch → scrollable model chooser with manual fallback. Files: ModelSetup.tsx, Confirm.tsx, Wizard.tsx, types.ts, router.ts
- #13 — Secure secrets storage — encrypted file + wizard persistence: Use Node's built-in `crypto` module (available in Bun) to implement AES-256-GCM encryption. Files: secrets.ts, secrets.test.ts, manager.ts, types.ts, Confirm.tsx, router.ts, index.ts
- #14 — Telegram pairing — restrict bot to one authorized user: Wizard generates a 6-char pairing code; user sends /pair <code> to the bot to pair their chat ID, which is then persisted to secrets and enforced on all future messages. Files: types.ts, transport.ts, index.ts, TelegramSetup.tsx, Confirm.tsx, Wizard.tsx, telegram.test.ts
- #15 — Wizard re-run — keep or change per-section prompt: When `forceSetup && !isFirstRun`, load existing config/secrets and pass to Wizard; each step shows a Keep/Change gate before the normal input flow. Files: index.ts, Wizard.tsx, Identity.tsx, ModelSetup.tsx, TelegramSetup.tsx
- #16 — Bootstrap context files — USER.md, tools, safety, heartbeat: Create `~/.sa/USER.md` template during wizard setup. Files: Wizard.tsx, manager.ts, index.ts, index.ts
