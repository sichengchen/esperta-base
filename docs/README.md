# Aria Documentation

This tree is the canonical documentation source for Esperta Aria.

The target architecture is one shared runtime:

```text
Aria Node Runtime
```

Desktop and Headless are installation forms around that runtime. Mobile is a
remote client only and never carries Aria Agent, local tool execution,
automations, connectors, workspace execution, or sandboxing.

## Current Architecture Contract

```text
Gateway accepts.
Kernel coordinates.
Domain engines own product state.
Agent reasons.
Capability controls side effects.
Approval stays simple.
Sandbox executes.
Storage records.
Clients observe.
```

## Read First

- [product/aria-platform.md](./product/aria-platform.md)
- [architecture/core/overview.md](./architecture/core/overview.md)
- [architecture/runtime/runtime.md](./architecture/runtime/runtime.md)
- [architecture/runtime/tool-runtime.md](./architecture/runtime/tool-runtime.md)
- [architecture/runtime/automation.md](./architecture/runtime/automation.md)
- [architecture/runtime/interaction-protocol.md](./architecture/runtime/interaction-protocol.md)
- [architecture/surfaces/server.md](./architecture/surfaces/server.md)
- [development/migration.md](./development/migration.md)

## Documentation Groups

- [product](./product/README.md): product model, naming, areas, and glossary.
- [architecture](./architecture/README.md): runtime, package, protocol, storage, and surface design.
- [security](./security/README.md): gateway auth, approvals, audit, secrets, and sandboxing.
- [operator](./operator/README.md): CLI and operator-facing workflows.
- [development](./development/README.md): migration, setup, release, and verification guidance.

## Removed Legacy Docs

Docs that described legacy transition plans, older execution ownership, older
approval taxonomies, or raw tool reference inventory were deleted. New docs
should describe the target Node Runtime model directly.
