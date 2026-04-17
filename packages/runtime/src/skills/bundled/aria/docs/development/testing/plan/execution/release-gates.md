# Release Gates

This page defines the minimum automated gates for shipping `Aria Server`.

## PR Gate

Required:

- `bun run check`
- `bun run test`
- `bun run build`
- all `contract`, `integration`, `workflow`, `server-e2e`, and `recovery` cases marked for the changed area

PRs are blocked if:

- a changed server flow has only unit coverage
- a new boundary rule is documented but has no automated case
- a documented `missing` case is relied on as if it were already proven

## Nightly Gate

Required:

- everything in the PR gate
- all `live-ai` cases
- slow matrix cases for provider and connector variants

Nightly exists to catch:

- live provider drift
- streaming regressions
- automation regressions with real model behavior
- reconnect and restart issues that are too expensive for every PR

## Pre-Release Gate

Required:

- everything in the nightly gate
- one green pass for every workflow doc in this folder
- no release-critical case left at `missing`

Release-critical means:

- gateway auth and transport
- Aria chat workflow
- automation workflow
- remote project workflow
- Aria-managed project workflow
- restart and durability
- live AI behavior for the above where model behavior matters

## Current Priority Order

The immediate build-out order should be:

1. gateway HTTP, SSE, and WS black-box tests
2. Aria chat end-to-end tests
3. webhook and automation end-to-end tests
4. recovery and restart tests
5. project workflow end-to-end tests
6. live AI coverage for approval, question, automation, and project orchestration

## Bottom Line

The server ships when the architecture is proven by tests, not when the repository merely has many tests.
