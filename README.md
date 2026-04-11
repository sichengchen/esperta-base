# Esperta Aria

Esperta Aria is a local-first agent platform built around one durable runtime, one shared interaction protocol, and one monorepo.

## Product Areas

- `Aria Local`: run and supervise agent work on your own machine
- `Aria Remote`: control active work from paired devices
- `Aria Automations`: run scheduled and webhook-triggered tasks on the same runtime substrate
- `Aria Projects`: track durable work, dispatch agent runs, manage repos/worktrees, and handle review/publish flow

## Core Architecture

- `packages/runtime` owns live execution, approvals, tools, MCP, automation, checkpoints, logs, and session state
- `packages/projects-engine` owns durable tracked-work state: projects, tasks, threads, jobs, dispatches, repos, worktrees, reviews, publish runs, and external refs
- `packages/handoff` turns local or runtime-originated work into tracked project work through idempotent submissions
- `packages/relay` owns paired-device trust, session attachment, and queued remote-control envelopes
- `packages/connectors` exposes TUI and connector surfaces over the shared runtime protocol

One tracked dispatch creates one runtime execution.

## Public Identity

- Product: `Esperta Aria`
- Runtime: `Aria Runtime`
- CLI: `aria`
- Runtime home: `~/.aria/` or `ARIA_HOME`

## Quick Start

```bash
bun install
bun run dev
```

On first run, Aria writes operator state under `~/.aria/` and opens the onboarding flow if needed.

## CLI

Core commands:

- `aria`
- `aria onboard`
- `aria config`
- `aria automation`
- `aria audit`
- `aria memory`
- `aria projects`
- `aria relay`
- `aria engine start|stop|status|logs`
- `aria stop`
- `aria restart`
- `aria shutdown`

Connector and integration surfaces:

- `aria telegram`
- `aria discord`
- `aria slack`
- `aria teams`
- `aria gchat`
- `aria github`
- `aria linear`
- `aria wechat`

## Repo Layout

```text
docs/                operator and architecture docs
specs/               package-level engineering contracts
packages/
  cli/
  connectors/
  handoff/
  projects-engine/
  relay/
  runtime/
  shared-types/
  providers-*/
scripts/             build, embedding, migration, release helpers
src/                 compatibility tree and remaining legacy entrypoints
tests/               unit, integration, workflow, and live-gated tests
```

## Development

Primary checks:

```bash
bun run typecheck
bun test
bun run build
```

## Documentation

Operator and architecture docs live under [docs](./docs). Package-level engineering contracts live under [specs](./specs).

Recommended entry points:

- [docs/README.md](./docs/README.md)
- [docs/product/aria-platform.md](./docs/product/aria-platform.md)
- [docs/system/runtime-model.md](./docs/system/runtime-model.md)
- [docs/system/projects-engine.md](./docs/system/projects-engine.md)
- [docs/system/relay-model.md](./docs/system/relay-model.md)
- [specs/README.md](./specs/README.md)
