# Esperta Aria

Esperta Aria is a local-first agent platform built around one shared runtime:
`Aria Node Runtime`.

Desktop and Headless are packaging forms around the same runtime. Mobile is a
remote client only.

```text
Desktop = Aria Node Runtime + Desktop UI
Headless = Aria Node Runtime without Desktop UI
Mobile = Remote Client SDK + Mobile UI
```

## Product Model

- `Desktop Package`: local desktop UI, node supervisor, local gateway, local store, local tools, and local workspaces.
- `Headless Package`: service-managed Aria Node Runtime for always-on work, remote jobs, automations, connectors, and API access.
- `Mobile Client`: remote chat, approval, artifact review, job monitoring, and notification UX for an existing node.

The most important runtime rule is:

```text
Aria Agent runs only inside Aria Node Runtime.
```

## Architecture

The target runtime lifecycle is:

```text
Gateway
  -> Application Kernel
  -> Run or Job
  -> Aria Agent
  -> ToolIntent
  -> Capability Broker
  -> Simple Approval if needed
  -> Sandbox Manager
  -> configured provider
  -> ToolExecution
  -> Artifact or Result
  -> Audit
```

Core ownership:

- Gateway is the only Aria-owned access boundary.
- Kernel coordinates commands, transactions, workflows, and outbox delivery.
- Domain engines own product state.
- Aria Agent reasons and proposes work, but never executes side effects directly.
- Capability, policy, approval, sandbox, and audit control side effects.
- SQLite-first storage records operational state, timelines, artifacts, audit, secrets, and workflow tasks.

## Public Identity

- Product: `Esperta Aria`
- Runtime: `Aria Runtime`
- Node runtime: `Aria Node Runtime`
- CLI: `aria`
- Runtime home: `~/.aria/` or `ARIA_HOME`

## Quick Start

```bash
bun install
bun run dev:server
```

## Repo Layout

Target layout:

```text
apps/
  aria-desktop/
  aria-node/
  aria-mobile/
packages/
  node-runtime/
  node-host/
  gateway/
  protocol/
  client/
  kernel/
  persistence/
  identity/
  threads/
  agent-runtime/
  prompt/
  model-router/
  capability/
  policy/
  approvals/
  sandbox/
  sandbox-justbash/
  sandbox-full/
  tools/
  workspace/
  projects/
  jobs/
  memory/
  automation/
  connectors/
  audit/
  secrets/
  supervisor/
  cli/
docs/
  canonical documentation tree
```

## Development

Primary checks:

```bash
bun run check
bun run test
bun run build
```

## Documentation

Canonical docs live under [docs](./docs).

Recommended entry points:

- [docs/README.md](./docs/README.md)
- [docs/product/aria-platform.md](./docs/product/aria-platform.md)
- [docs/architecture/core/overview.md](./docs/architecture/core/overview.md)
- [docs/architecture/runtime/runtime.md](./docs/architecture/runtime/runtime.md)
- [docs/architecture/runtime/tool-runtime.md](./docs/architecture/runtime/tool-runtime.md)
- [docs/architecture/surfaces/server.md](./docs/architecture/surfaces/server.md)
- [docs/development/migration.md](./docs/development/migration.md)
