# Product Areas

Esperta Aria's product areas map to one node-owned runtime model.

## Aria Desktop

Primary operator app for local work and remote node control.

Desktop starts or attaches to a local Aria Node Runtime and can also connect to
Headless nodes through the same protocol.

## Aria Headless

Service-managed Aria Node Runtime without Desktop UI.

Headless is the preferred always-on host for automations, connectors, remote
jobs, mobile access, API access, and long-running work.

## Aria Mobile

Remote client for existing nodes.

Mobile can chat, approve, deny, monitor, review, and receive notifications.
Mobile cannot execute tools or host Aria Agent.

## Aria Projects

Projects model repos, folders, workspaces, jobs, artifacts, checkpoints,
patches, and reviewable output.

Project work becomes:

```text
Project -> Thread -> Run -> Job -> Workspace -> ToolIntent -> SandboxExecution -> Artifact -> Review
```

## Aria Automations

Automations are node-hosted command producers.

Scheduled, webhook, and event triggers all enter the Kernel through the Command
Bus and become normal runs.
