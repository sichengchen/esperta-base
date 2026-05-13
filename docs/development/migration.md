# Migration Plan

This plan replaces the older server-only and compatibility-layer transition
docs.

## Phase 1: Adopt The Product Model

Adopt this language everywhere:

```text
Aria Node Runtime
Desktop Package
Headless Package
Mobile Client
```

Remove language that implies Desktop and Headless have different runtimes.

## Phase 2: Create One Node Executable

Create or formalize:

```text
apps/aria-node
```

Then:

```text
Desktop bundles aria-node.
Headless installs aria-node as service.
```

## Phase 3: Extract Runtime Composition

Move runtime composition into:

```text
packages/node-runtime
```

Target:

```text
apps/aria-node
  starts node-runtime

apps/aria-desktop
  supervises aria-node

headless install
  runs aria-node as service
```

## Phase 4: Introduce Application Kernel

Create:

```text
packages/kernel
```

Implement:

- Command Bus
- Unit of Work
- Workflow Engine
- Job Scheduler
- Idempotency
- Outbox

Normalize chat, projects, automations, connectors, and API-triggered work into
the same run/job lifecycle.

## Phase 5: Simplify Approval

Use only:

```text
allow
ask
deny
```

Approval decisions:

```text
approve_once
deny
```

No advanced approval scopes until required.

## Phase 6: Build Sandbox Manager

Create:

```text
packages/sandbox
packages/sandbox-justbash
```

Make justbash the default provider.

Provider selection is config-driven. Do not implement policy-based provider
selection.

## Phase 7: Add Future Full Sandbox Provider Interface

Create placeholder adapter package:

```text
packages/sandbox-full
```

The interface supports future providers such as Daytona, containers, or remote
VMs.

The user or administrator chooses the provider explicitly.

## Phase 8: Move Tools Behind Capability

Make this path mandatory:

```text
Agent
  -> ToolIntent
  -> Capability Broker
  -> Approval if needed
  -> Sandbox Manager
  -> Tool Runtime
```

No direct tool execution from agent code.

## Phase 9: Enforce Dependency Graph

Add CI checks so forbidden imports fail builds.

Especially:

- mobile cannot import runtime packages
- desktop UI cannot import kernel or tools directly
- agent cannot import tool implementations directly
- gateway cannot import workspace, tools, or memory internals directly
- policy cannot choose sandbox providers

## Refactoring Waves And Gates

Each phase should ship through small waves. A wave is a bounded refactor with a
single ownership boundary and a clear rollback path. A gate is the condition
that must pass before the next wave starts.

### Wave 0: Documentation And Naming

Scope:

- canonicalize `Aria Node Runtime`, `Desktop Package`, `Headless Package`, and
  `Mobile Client`
- delete docs that preserve obsolete runtime ownership
- update bundled Aria skill docs and embedded skill assets

Gate:

- no canonical doc describes Desktop and Headless as separate runtimes
- no canonical doc describes Mobile as agent-bearing
- bundled docs match `docs/`
- `bun run check` passes

### Wave 1: Node Executable Boundary

Scope:

- create or formalize `apps/aria-node`
- keep the current executable path working as a compatibility entrypoint during
  the migration
- move process startup concerns toward `packages/node-host`

Gate:

- Desktop can launch or attach to the same node executable used by Headless
- Headless service startup uses the same executable
- node lock, config load, migrations, Gateway startup, scheduler startup, and
  shutdown are covered by tests
- `bun run check`, `bun run test`, and `bun run build` pass

### Wave 2: Runtime Composition Boundary

Scope:

- introduce `packages/node-runtime`
- move runtime wiring out of app-specific roots
- isolate Desktop-only and Headless-only lifecycle concerns above the runtime

Gate:

- app roots call the same runtime composition API
- runtime code has no Desktop UI or service-manager assumptions
- startup health status is exposed consistently
- old composition imports are removed or contained behind a migration adapter

### Wave 3: Kernel And Domain Engines

Scope:

- introduce `packages/kernel`
- split command bus, query bus, workflow engine, unit of work, idempotency,
  domain events, scheduler, and outbox
- route threads, projects, automations, connectors, and API-triggered work into
  Run and Job lifecycles

Gate:

- every work producer enters through Command Bus or Gateway
- chat, project, automation, connector, and API work all create Runs
- long-running project work creates Jobs
- workflow task crash recovery is tested

### Wave 4: Capability And Approval

Scope:

- introduce Capability Broker as the side-effect control point
- simplify Policy results to `allow`, `ask`, or `deny`
- limit approval decisions to `approve_once` and `deny`

Gate:

- Agent Runtime emits ToolIntent and does not execute tools directly
- all side-effecting actions pass through Capability Broker
- approval requests reference run, job, and tool intent identity
- Policy does not select sandbox providers

### Wave 5: Sandbox And Tool Runtime

Scope:

- introduce `packages/sandbox` and `packages/sandbox-justbash`
- make `justbash` the default provider
- move tools behind manifest-driven Tool Runtime
- add `packages/sandbox-full` as an interface placeholder only

Gate:

- every tool execution goes through Sandbox Manager
- provider selection is resolved from run, project, node, then default config
- unsupported justbash actions return a clear unsupported result
- no tool silently escapes to host execution

### Wave 6: Workspace, Artifacts, And Patch Application

Scope:

- make Workspace the execution boundary
- prepare sandbox inputs from snapshots or selected files
- extract artifacts, patches, logs, reports, and diffs
- require approval before applying patches to real workspaces

Gate:

- project jobs produce durable artifacts
- patch application is a Workspace Engine mutation
- applying real workspace changes requires Capability, Policy, Approval, and
  Audit
- artifact and patch recovery works after restart

### Wave 7: Client Boundary Enforcement

Scope:

- move Desktop UI to `client`, `protocol`, and `supervisor` dependencies only
- move Mobile to `client` and `protocol` dependencies only
- keep Gateway free of direct tool, workspace, memory, and agent runtime imports

Gate:

- forbidden imports fail CI
- Mobile has no runtime, tool, workspace, automation, connector, or sandbox
  dependency
- Desktop UI has no Kernel, Agent Runtime, tool, persistence, memory, workspace,
  or sandbox provider dependency
- Gateway only submits commands and queries through the Kernel boundary

### Wave 8: Runtime-Owned Automations And Connectors

Scope:

- route scheduled, webhook, and event triggers through Automation Engine and
  Command Bus
- route external events through Connector Runtime, normalization, Command Bus,
  and Outbox delivery

Gate:

- automations never run on Mobile
- connectors never bind directly to client-only state
- connector deliveries use Outbox
- automation and connector recovery is tested

### Wave 9: Cleanup And Deletion

Scope:

- remove migration adapters after replacement paths are live
- remove compatibility command names only after operator-facing replacements
  exist
- delete stale generated assets and docs in the same change that removes their
  source

Gate:

- no stale package import paths remain
- no user-facing docs describe removed behavior
- generated skill assets match bundled skill sources
- `bun run check`, `bun run test`, and `bun run build` pass
