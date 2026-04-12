# Phase 1 Package Extraction Ledger

This ledger tracks the phase-1 extraction that seeds target-aligned packages without breaking the current CLI build, tests, or runtime import surface.

## Compatibility Rule

During phase 1, the current `packages/runtime` and `packages/shared-types` entrypoints remain stable compatibility shims. Existing imports keep working while new package ownership becomes explicit.

## Extracted Ownership

| Target package | Extracted source owner | New implementation owner | Compatibility shim kept at |
| --- | --- | --- | --- |
| `@aria/protocol` | `packages/shared-types/src/types.ts`, `packages/shared-types/src/connector.ts` | `packages/protocol/src/` | `packages/shared-types/src/types.ts`, `packages/shared-types/src/connector.ts` |
| `@aria/store` | `packages/runtime/src/operational-store.ts` | `packages/store/src/operational-store.ts` | `packages/runtime/src/operational-store.ts` |
| `@aria/audit` | `packages/runtime/src/audit.ts` | `packages/audit/src/audit.ts` | `packages/runtime/src/audit.ts` |
| `@aria/prompt` | `packages/runtime/src/prompt-engine.ts` | `packages/prompt/src/prompt-engine.ts` | `packages/runtime/src/prompt-engine.ts` |
| `@aria/tools` | `packages/runtime/src/toolsets.ts`, `packages/runtime/src/tools/index.ts` | `packages/tools/src/` | `packages/runtime/src/toolsets.ts`, `packages/runtime/src/tools/index.ts` |
| `@aria/policy` | `packages/runtime/src/capability-policy.ts`, `packages/runtime/src/tools/policy.ts` | `packages/policy/src/` | `packages/runtime/src/capability-policy.ts`, `packages/runtime/src/tools/policy.ts` |

## Phase 1 Notes

- Ownership moved first; consumer import rewrites are intentionally deferred.
- Cross-package imports currently use direct source paths to avoid widening shared build configuration during the first extraction step.
- Runtime-facing wrappers are intentionally tiny so later phases can update import sites package-by-package.
- `@aria/tools` still delegates individual built-in tool implementations to the runtime package in this phase; the package boundary now exists for incremental follow-up extraction.

## Phase 2 Extracted Ownership

| Target package | Extracted source owner | New package entrypoints | Compatibility surface kept at |
| --- | --- | --- | --- |
| `@aria/memory` | `packages/runtime/src/memory/*` | `packages/memory/src/*` | `packages/runtime/src/memory/index.ts` |
| `@aria/automation` | `packages/runtime/src/automation.ts`, `automation-registry.ts`, `automation-schedule.ts`, `scheduler.ts` | `packages/automation/src/*` | `packages/runtime/src/automation*.ts`, `packages/runtime/src/scheduler.ts` |
| `@aria/agent-aria` | `packages/runtime/src/agent/*` | `packages/agent-aria/src/*` | `packages/runtime/src/agent/index.ts` |
| `@aria/connectors-im` | `packages/connectors/src/chat-sdk/*`, platform connector entrypoints | `packages/connectors-im/src/*` | `packages/connectors/src/*` |
| `@aria/console` | `packages/connectors/src/tui/*` | `packages/console/src/*` | `packages/connectors/src/tui/*` |
| `@aria/gateway` | `packages/runtime/src/context.ts`, `procedures.ts`, `server.ts`, `trpc.ts` | `packages/gateway/src/*` | `packages/runtime/src/{context,procedures,server,trpc}.ts` |

## Phase 2 Notes

- This phase seeds the remaining target-state package names without changing CLI/runtime behavior.
- Runtime compatibility shims now forward the public `memory`, `automation`, and `agent` entrypoints to their new package owners.
- `@aria/connectors-im`, `@aria/console`, and `@aria/gateway` currently preserve behavior by exposing package-owned entrypoints that re-export the proven connector/runtime implementations while broader consumer rewrites are deferred.
- The new tsconfig path aliases make the phase-2 package names available for incremental follow-up import rewrites.

## Next Safe Follow-Ups

1. Add explicit tsconfig/package alias entries for the new package names once the broader team is ready to update shared build config.
2. Rewrite internal consumers from compatibility shims to the new package entrypoints.
3. Continue extracting the remaining tool, prompt, and runtime-adjacent modules behind the new package boundaries.
