# Testing

Testing should enforce the Aria Node Runtime architecture.

## Required Checks

For substantial changes:

```bash
bun run check
bun run test
bun run build
```

Docs-only changes are exempt unless they modify generated embedded skill output
or package metadata. If exempt, state that explicitly in the handoff.

## Architecture Gates

Tests and static checks should prevent:

- Mobile importing runtime packages.
- Desktop UI importing Kernel or tool implementations directly.
- Agent Runtime importing tool implementations directly.
- Gateway importing workspace, tools, memory internals, or agent runtime.
- Policy selecting sandbox providers.
- Tools executing outside Sandbox Manager.
- justbash failures silently falling back to host execution.

## Workflow Coverage

Critical workflows:

- Desktop local chat against local Aria Node Runtime.
- Mobile remote chat against Desktop-hosted and Headless-hosted nodes.
- Project job producing artifacts or patches.
- Approval request and `approve_once`/`deny` decision.
- Scheduled automation creating a run.
- Connector event creating a run and delivering a reply through Outbox.
- Startup recovery of workflow tasks and pending approvals.
