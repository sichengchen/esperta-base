# Testing

This page is the entrypoint for all testing docs.

Use it for:

- commands
- repo-wide testing conventions
- links into the detailed server test plan

## Main Checks

```bash
vp run repo:check
vp run repo:test
vp run repo:build
vp run repo:verify
```

Convenience wrappers are also available through `bun run`.

`vp run repo:check` uses `Vite+` with `Oxc` for format and lint checks, then runs `tsc --noEmit` for TypeScript validation.

`vp run repo:test` uses `Vitest` with the shared `vite.config.ts` configuration under the Bun runtime.

## Detailed Plans

- canonical `Aria Server` test plan: [plan/README.md](./plan/README.md)
- capability coverage: [plan/foundations/README.md](./plan/foundations/README.md)
- end-to-end workflow coverage: [plan/workflows/README.md](./plan/workflows/README.md)
- live AI, suite ownership, and release gates: [plan/execution/README.md](./plan/execution/README.md)

## Test Layout

- co-located runtime and connector tests under `packages/**`
- repo-level workflow and integration tests under `tests/`
- live-gated tests under `tests/live/`

## Expectations

- every bug fix gets a regression test
- every documented architecture rule should map to automated coverage
- workflow surfaces should have service-level, end-to-end, or transport-level tests
- `Aria Server` changes should be evaluated against [plan/README.md](./plan/README.md), not only against file-local unit tests
- live-model tests should assert structure and events, not exact prose
