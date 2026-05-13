# Architecture

Esperta Aria is built around one shared runtime:

```text
Aria Node Runtime
```

Desktop and Headless package this runtime differently. Mobile attaches to it as
a remote client.

## Core Rule

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

## Sections

- [core](./core/README.md): product architecture, deployment, domain model, package layout, and dependency rules.
- [runtime](./runtime/README.md): Kernel, prompt, agent, capability, approval, sandbox, tools, automation, protocol, storage, and workflow rules.
- [surfaces](./surfaces/README.md): Desktop, Headless, Mobile, Gateway, and design surfaces.
