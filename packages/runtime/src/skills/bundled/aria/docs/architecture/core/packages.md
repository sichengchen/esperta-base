# Package Layout

This page defines the target package layout for Aria Node Runtime.

## Apps

```text
apps/
  aria-desktop/
    Desktop frontend.
    Bundles and supervises aria-node.

  aria-node/
    Shared node executable.
    Used by Desktop and Headless.

  aria-mobile/
    Planned remote client only. No Mobile app is implemented in this repo yet.
```

## Packages

```text
packages/
  node-runtime/
    Aria Node Runtime composition root.

  node-host/
    Config, lifecycle, process lock, startup, shutdown.

  gateway/
    Pairing, auth, sessions, command/query/event transport.

  protocol/
    Command, query, event, stream, identity schemas.

  client/
    Shared client SDK for Desktop, Mobile, and API clients.

  kernel/
    Command bus, workflow engine, scheduler, unit of work,
    idempotency, outbox, domain event bus.

  persistence/
    SQLite repositories, migrations, transaction manager.

  identity/
    Node, device, principal, role, session, grant management.

  threads/
    Threads, messages, runs, run timeline.

  agent-runtime/
    Aria Agent execution as workflow participant.

  prompt/
    Prompt compiler and context builder.

  model-router/
    Model provider abstraction, routing, retries, local/cloud models.

  capability/
    Capability broker, grants, leases, approval coordination.

  policy/
    Policy rules, risk classification, trust modes.

  approvals/
    Simple approval request and decision model.

  sandbox/
    Sandbox manager, provider interface, config-based provider selection.

  sandbox-justbash/
    Default sandbox provider.

  sandbox-full/
    Future full sandbox provider adapter.

  tools/
    Built-in tool manifests and implementations.

  workspace/
    Workspaces, repos, snapshots, artifacts, patch application.

  projects/
    Project registry, project-thread binding, environment selection.

  jobs/
    Durable job lifecycle and checkpoints.

  memory/
    Memory records, extraction, retrieval, embeddings.

  automation/
    Cron, heartbeat, webhook, scheduled runs.

  connectors/
    IM and external service connectors.

  audit/
    Audit models, sinks, queries.

  secrets/
    Encrypted secret store and secret handles.

  supervisor/
    Desktop and service-manager node supervision.

  cli/
    Terminal commands for operating node, config, projects, memory, audit.
```

## Dependency Rules

Desktop UI may depend on `client`, `protocol`, and `supervisor`. It must not
directly depend on `kernel`, `agent-runtime`, `tools`, `memory`, `workspace`,
`persistence`, or sandbox providers.

Mobile may depend on `client` and `protocol`. Until a Mobile app is added, this
is enforced as a reserved boundary: no mobile source tree may import
`node-runtime`, `agent-runtime`, `tools`, `workspace`, `automation`,
`connectors`, or `sandbox`.

Gateway may depend on `protocol`, `identity`, and `kernel`. It must not
directly depend on `tools`, `workspace`, `agent-runtime`, or `memory`.

Agent Runtime may depend on `prompt`, `model-router`, and `capability`. It must
not directly execute tools, shell, file writes, connector sends, or memory
writes.

Capability may depend on `policy`, `approvals`, `sandbox`, `secrets`, and
`audit`.

Sandbox may depend on sandbox providers, tool runtime, workspace mounts, and
host adapters. Provider selection must be config-driven.

Automation and Connectors submit commands through the Command Bus. They must
not call Agent Runtime directly.

## CI Enforcement

Forbidden imports should fail builds, especially:

- Mobile importing runtime packages.
- Desktop UI importing Kernel or tools directly.
- Agent Runtime importing tool implementations directly.
- Gateway importing workspace, tools, or memory internals directly.
- Policy selecting sandbox providers.
