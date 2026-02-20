---
id: 11
title: README and documentation
status: done
type: feature
priority: 2
phase: phase-1
branch: feature/phase-1
created: 2026-02-19
shipped_at: 2026-02-19
---
# README and documentation

## Context

The project currently has no root `README.md`. The only narrative document is `.esper/CONSTITUTION.md` (project governance, not user-facing). No `docs/` folder exists. The codebase is otherwise complete — all phase-1 plans shipped.

Key facts to document:

- Entry point: `src/index.ts` (shebang: `#!/usr/bin/env bun`)
- Scripts: `dev`, `build`, `test`, `lint`, `typecheck`
- Config lives in `~/.sa/` (overridable via `SA_HOME`): `config.json`, `models.json`, `identity.md`, `memory/`
- Environment variables: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY`, `TELEGRAM_BOT_TOKEN`
- First-run wizard handles setup automatically
- Subsystems: agent, router, tools, memory, config, tui, telegram, wizard

## Approach

1. Write `README.md` at repo root — concise overview with quickstart and links to `docs/`
2. Create `docs/` folder with four topic files:
   - `docs/configuration.md` — config file format, `SA_HOME`, `models.json`, `config.json`, `identity.md`
   - `docs/tools.md` — built-in tools (Read, Write, Edit, Bash, Remember) with descriptions
   - `docs/architecture.md` — subsystem map and data flow (wizard → config → agent → router → tools/memory → tui/telegram)
   - `docs/development.md` — dev workflow: clone, install, scripts, test, lint, typecheck, contributing notes

No code changes required — documentation only.

## Files to change

- `README.md` (create — root-level user-facing entry point)
- `docs/configuration.md` (create — config reference)
- `docs/tools.md` (create — built-in tool reference)
- `docs/architecture.md` (create — subsystem overview and data flow)
- `docs/development.md` (create — dev workflow and scripts)

## Verification

- Run: manual
- Expected: `README.md` renders correctly on GitHub (check headings, code blocks, links to `docs/` resolve); all `docs/*.md` files are consistent with actual code (file paths, type names, script names match `package.json` and `src/`)
- Edge cases: Verify `SA_HOME` override is documented; confirm `.env.example` contents match what's documented; confirm model config format in docs matches `ModelConfig` type in `src/router/`

## Progress
- Milestones: 5 commits
- Modified: README.md, docs/configuration.md, docs/tools.md, docs/architecture.md, docs/development.md
- Verification: not yet run — run /esper:finish to verify and archive
