---
id: 34
title: Replace ClawHub integration with bundled skill
status: done
type: feature
priority: 1
phase: phase-2
branch: feature/phase-2
created: 2026-02-20
shipped_at: 2026-02-20
---
# Replace ClawHub integration with bundled skill

## Context

ClawHub is currently deeply wired into the engine as a first-class subsystem:

- **Client & installer**: `src/engine/clawhub/` — `ClawHubClient`, `SkillInstaller`, types
- **Engine runtime**: `src/engine/runtime.ts` — instantiates `ClawHubClient` and `SkillInstaller`, injects `clawhub_search` tool into the agent's tool list
- **tRPC router**: `src/engine/procedures.ts` — `skill.search` and `skill.install` procedures
- **Agent tool**: `src/engine/tools/clawhub-search.ts` — tool that calls `ClawHubClient.search()`
- **Wizard**: `src/cli/wizard/steps/SkillSetup.tsx` — onboarding step suggesting ClawHub skills
- **Tests**: `tests/clawhub.test.ts`

The existing bundled skill (`src/engine/skills/bundled/skill-creator/SKILL.md`) provides a reference pattern: a `SKILL.md` with YAML frontmatter (`name`, `description`) and markdown instructions.

## Approach

### 1. Move ClawHub client to a library util

- Keep `src/engine/clawhub/client.ts`, `installer.ts`, `types.ts` but relocate to `src/engine/clawhub/` (already there — just decouple from engine wiring)
- Remove the `ClawHubClient` and `SkillInstaller` from `EngineRuntime` interface and `createRuntime()`
- The bundled skill will import these directly when the agent invokes it via tools

### 2. Create bundled `clawhub` skill

- Create `src/engine/skills/bundled/clawhub/SKILL.md` with:
  - **name**: `clawhub`
  - **description**: `Search, install, and update agent skills from the ClawHub registry (clawhub.ai).`
  - Instructions teaching the agent to use three tools: `clawhub_search`, `clawhub_install`, `clawhub_update`

### 3. Convert ClawHub tools to standalone registrations

- Keep `src/engine/tools/clawhub-search.ts` but refactor: instead of receiving a `ClawHubClient` instance, instantiate one internally (stateless — no config needed)
- Create `src/engine/tools/clawhub-install.ts` — wraps `SkillInstaller.install()`. Accepts `slug` and optional `version`. Reloads skill registry after install.
- Create `src/engine/tools/clawhub-update.ts` — wraps `SkillInstaller.listInstalled()` + `ClawHubClient.getSkill()` to check versions, then `install()` to update. Accepts optional `slug` (update one or all).
- Register all three tools in the builtin tools list (`src/engine/tools/index.ts`)

### 4. Remove ClawHub from engine runtime

- `src/engine/runtime.ts`: Remove `clawhub` and `installer` from `EngineRuntime`, remove imports, remove `createClawHubSearchTool` call (tools now self-contained)
- `src/engine/procedures.ts`: Remove `skill.search` and `skill.install` tRPC procedures

### 5. Remove ClawHub from wizard/onboarding

- `src/cli/wizard/steps/SkillSetup.tsx`: Remove the "Browse skills after setup" option that triggers ClawHub install flow, remove all ClawHub mentions. Keep skill setup step if it still has value (e.g. showing bundled skills), or simplify to just list bundled skills.

### 6. Update tests

- `tests/clawhub.test.ts`: Update tests to test the standalone tools (`clawhub_search`, `clawhub_install`, `clawhub_update`) rather than engine-injected client/installer. Keep mock HTTP patterns.

## Files to change

- `src/engine/skills/bundled/clawhub/SKILL.md` (create — bundled skill definition)
- `src/engine/tools/clawhub-search.ts` (modify — make self-contained, no injected client)
- `src/engine/tools/clawhub-install.ts` (create — install tool)
- `src/engine/tools/clawhub-update.ts` (create — update tool)
- `src/engine/tools/index.ts` (modify — register new tools, remove factory pattern)
- `src/engine/runtime.ts` (modify — remove ClawHub client/installer/tool wiring)
- `src/engine/procedures.ts` (modify — remove skill.search/skill.install procedures)
- `src/cli/wizard/steps/SkillSetup.tsx` (modify — remove ClawHub references and onboarding flow)
- `tests/clawhub.test.ts` (modify — test standalone tools instead of engine-injected instances)

## Verification

- Run: `bun test`
- Expected: All tests pass, including updated clawhub tests
- Run: `bun run typecheck`
- Expected: No type errors (EngineRuntime no longer references ClawHub)
- Manual: Start engine, activate the `clawhub` skill, ask agent to search for a skill — agent should use `clawhub_search` tool
- Manual: Ask agent to install a skill — agent should use `clawhub_install` tool
- Manual: Ask agent to update installed skills — agent should use `clawhub_update` tool
- Edge cases:
  - Installing a skill that's already installed (should update version)
  - Updating when no skills are installed (should report "nothing to update")
  - Search with no results (should report "no skills found")
  - Network errors to clawhub.ai (tools should return clear error messages)
