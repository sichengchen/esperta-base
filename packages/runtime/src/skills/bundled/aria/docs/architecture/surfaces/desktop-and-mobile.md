# Desktop And Mobile

Desktop and Mobile are clients of Aria Node Runtime, but Desktop may package
and supervise a local node.

## Desktop Package

Desktop contains:

- Desktop UI
- Desktop Client SDK
- Node Supervisor
- Aria Node Runtime
- Local Gateway
- Local Store
- Local Tools
- Local Workspaces

Desktop responsibilities:

- render local and remote node state
- supervise the local node when Desktop owns it
- connect to one or more remote nodes
- expose local filesystem, git, and workspace affordances to the local node
  through explicit runtime policy
- keep UI state and small caches without redefining runtime semantics

Desktop UI may depend on `client`, `protocol`, and `supervisor`. It must not
directly depend on Kernel, Agent Runtime, tools, memory, workspace,
persistence, or sandbox providers.

## Mobile Client

No Mobile app is implemented in this repo yet. The rules below define the
reserved Mobile boundary for future work.

Mobile contains:

- Mobile UI
- Remote Client SDK
- pairing and session management
- notification integration
- small UX cache

Mobile supports:

- chat with an existing node
- approve or deny actions
- monitor jobs
- review artifacts
- view automation status
- control remote sessions

Mobile must not contain:

- Aria Agent
- Runtime Kernel
- Tool Runtime
- Sandbox Runtime
- Workspace Manager
- Automation Engine
- Connector Runtime
- local project execution
- local shell execution

Mobile may depend only on `client` and `protocol`.

## Shared Interaction Model

Desktop and Mobile use the same node protocol:

- command API
- query API
- event stream API
- run timeline streaming
- job progress streaming
- approval changes
- connector events
- automation events
- sandbox events

Local Desktop sessions and remote Mobile sessions can attach to the same node
and observe the same thread, run, approval, job, and artifact state.
