# Product Overview

Esperta Aria gives an operator one agent-bearing runtime that can run locally
through Desktop or always-on through Headless.

## Desktop

Desktop packages:

- Desktop UI
- Desktop Client SDK
- Node Supervisor
- Aria Node Runtime
- Local Gateway
- Local Store
- Local Tools
- Local Workspaces

A local Desktop session is:

```text
Desktop UI -> local Aria Node Runtime
```

A remote Mobile session into the same machine is:

```text
Mobile UI -> same Aria Node Runtime on the desktop machine
```

Both are sessions on the same node.

## Headless

Headless packages the same Aria Node Runtime without Desktop UI.

It is optimized for:

- remote jobs
- scheduled automations
- webhook automations
- IM connectors
- mobile access
- desktop remote access
- API access
- approval flows
- audit
- memory
- secrets

The only differences from Desktop are startup mode, service management,
frontend availability, default gateway exposure, and operator workflow.

## Mobile

Mobile is a remote client only.

Mobile supports:

- chat with an existing node
- approve or deny actions
- monitor jobs
- review artifacts
- view automation status
- control remote sessions

Mobile must not host runtime execution, local shell execution, local project
execution, automations, connectors, or sandboxing.
