# Architecture

This section describes how the current repo is built and how the major subsystems divide ownership.

## Overall Diagram

```mermaid
flowchart TD
    subgraph Surfaces["User Surfaces"]
        CLI["CLI (`aria`)"]
        TUI["TUI Connector"]
        CHAT["Chat Connectors"]
        WEBHOOK["Webhook Triggers"]
        REMOTE["Paired Remote Devices"]
    end

    CLI --> PROTOCOL["Shared Interaction Protocol"]
    TUI --> PROTOCOL
    CHAT --> PROTOCOL
    WEBHOOK --> PROTOCOL
    REMOTE --> RELAY["Relay"]
    RELAY --> PROTOCOL

    PROTOCOL --> RUNTIME["Aria Runtime"]

    subgraph RuntimeInternals["Runtime Internals"]
        PROMPT["Prompt Engine"]
        TOOLS["Tool Runtime + MCP"]
        AUTOMATION["Automation Runtime"]
        STORE["Operational Store (`aria.db`)"]
        PROVIDERS["Provider Adapters"]
    end

    RUNTIME --> PROMPT
    RUNTIME --> TOOLS
    RUNTIME --> AUTOMATION
    RUNTIME --> STORE
    RUNTIME --> PROVIDERS

    subgraph DurableWork["Aria Projects"]
        PROJECTS["Projects Engine"]
        HANDOFF["Handoff"]
        REPOS["Repos + Worktrees"]
        REVIEWS["Reviews + Publish Runs"]
    end

    CLI --> HANDOFF
    HANDOFF --> PROJECTS
    PROJECTS --> REPOS
    PROJECTS --> REVIEWS
    PROJECTS --> DISPATCH["Dispatch"]
    DISPATCH --> RUNTIME
    RUNTIME --> DISPATCH

    STORE -.persists live state.-> PROJECTS
```

- [monorepo.md](./monorepo.md)
- [runtime.md](./runtime.md)
- [storage-and-recovery.md](./storage-and-recovery.md)
- [prompt-engine.md](./prompt-engine.md)
- [tool-runtime.md](./tool-runtime.md)
- [projects-engine.md](./projects-engine.md)
- [relay.md](./relay.md)
- [handoff.md](./handoff.md)
- [providers.md](./providers.md)
- [interaction-protocol.md](./interaction-protocol.md)
