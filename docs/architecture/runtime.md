# Runtime

Aria Runtime is the durable local process that owns live execution.

## Responsibilities

- create and resume sessions
- start and finish runs
- stream outputs and tool events
- manage approvals, questions, and cancellation
- execute tools and MCP calls
- run automation
- persist operational state and audit
- expose one shared interaction contract

## Runtime Shape

```text
Frontend or Connector
  -> Interaction Protocol
  -> Runtime
      -> Prompt Engine
      -> Tool Runtime
      -> Automation Runtime
      -> Memory Services
      -> SQLite Operational Store
```

## Session and Run Model

- sessions are durable
- runs belong to exactly one session
- runs may emit text, reasoning, tool, approval, question, reaction, and terminal events
- interrupted and cancelled work remains queryable

## Execution Boundaries

Frontends do not invent execution semantics. They attach to runtime sessions and receive protocol events.

## Runtime Home

By default the runtime home is `~/.aria/`.

Key operator-local state includes:

- `aria.db`
- `config.json`
- `IDENTITY.md`
- `USER.md`
- `secrets.enc`
- `memory/`
- `skills/`
- `automation/`
- `relay-state.json`

## Recovery

On startup the runtime:

1. opens SQLite
2. runs migrations
3. rebuilds ephemeral registries if needed
4. restores incomplete work and pending approvals
5. resumes automation scheduling
