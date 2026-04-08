# AGENTS

Use this file to bootstrap any coding agent into the current Esperta Aria workflow.

## Required Reads

1. Read `README.md` for the public product surface and operator entrypoints.
2. Read this file before making changes.
3. Read the canonical Aria specs in `specs/` that match the area you are changing.
4. Start with these platform specs unless the task is narrowly scoped elsewhere:
   - `specs/product/aria-platform.md`
   - `specs/system/runtime-model.md`
   - `specs/system/prompt-engine.md`
   - `specs/system/tool-runtime.md`
   - `specs/system/automation.md`
   - `specs/interfaces/interaction-protocol.md`

## Source Of Truth

- `specs/` is the authoritative architecture tree.
- `src/` is the live implementation.
- When specs and implementation diverge, move the code toward the Aria architecture and update docs/specs as part of the shipped change.

## Working Rules

- Public identity is `Esperta Aria`.
- Runtime identity is `Aria Runtime`.
- CLI identity is `aria`.
- Runtime home is `~/.aria/` or `ARIA_HOME`.
- Do not carry `SA` or `Esperta Base` forward in user-facing names, paths, logs, docs, or connector surfaces.
- Prefer durable runtime state, structured toolsets, shared interaction contracts, and policy-driven execution over legacy compatibility.

## Verification

- Run `bun run typecheck` before closing substantial changes.
- Run `bun test` before closing substantial changes.
- Run `bun run build` before closing substantial changes.
- If a task is docs-only or otherwise exempt, state that explicitly in the handoff.
