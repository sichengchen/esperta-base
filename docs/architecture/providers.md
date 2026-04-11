# Providers

Aria separates execution backends from runtime orchestration.

## Packages

- `packages/providers-aria`
- `packages/providers-codex`
- `packages/providers-claude-code`
- `packages/providers-opencode`

## Why Separate Packages

Each backend has its own:

- auth and availability checks
- execution command model
- result parsing
- cancellation behavior
- capability matrix

The runtime resolves a backend through its registry rather than hard-coding one execution path.

## Runtime Integration

`packages/runtime/src/backend-registry.ts` maps backend IDs to runtime adapters.

`packages/runtime/src/dispatch-runner.ts` uses that registry to execute tracked dispatches and map lifecycle updates back into Projects.
