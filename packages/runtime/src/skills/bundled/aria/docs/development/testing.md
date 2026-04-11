# Testing

## Main Checks

```bash
bun run typecheck
bun test
bun run build
```

## Test Layout

- co-located runtime and connector tests under `packages/**`
- repo-level workflow and integration tests under `tests/`
- live-gated tests under `tests/live/`

## Expectations

- every bug fix gets a regression test
- workflow surfaces should have service-level or command-level tests
- live-model tests should assert structure and events, not exact prose
