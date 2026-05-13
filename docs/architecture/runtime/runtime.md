# Aria Node Runtime

Aria Node Runtime is the shared runtime used by Desktop and Headless.

Desktop bundles and supervises it. Headless runs it as a service. Mobile never
contains it.

## Node Host Layer

The Node Host Layer lets Desktop and Headless share the same runtime.

Responsibilities:

- load config
- resolve `ARIA_HOME`
- acquire node process lock
- run migrations
- start Gateway
- start scheduler
- start connector runtime
- start automation runtime
- start workflow workers
- handle graceful shutdown
- expose health status

Desktop-specific host features include desktop lifecycle integration, desktop
notifications, local app updater, local tray/status UI, and local node
supervision.

Headless-specific host features include service-manager integration, server
logs, daemon lifecycle, remote-first configuration, and operator CLI.

The runtime below this layer must not care whether Desktop or Headless launched
it.

## Gateway Layer

Gateway is the only Aria-owned access boundary.

Responsibilities:

- device pairing
- session authentication
- authorization
- command API
- query API
- event stream API
- gateway audit events

Gateway forwards valid requests into the Application Kernel.

## Application Kernel

The Application Kernel is the runtime coordinator.

Responsibilities:

- validate commands
- enforce idempotency
- open transaction
- load state
- advance workflow
- persist state
- append run timeline events
- append audit events
- schedule follow-up work
- publish outbox messages

Kernel components:

- Command Bus
- Query Bus
- Workflow Engine
- Job Scheduler
- Unit of Work
- Idempotency Manager
- Domain Event Bus
- Outbox

The Kernel coordinates work, but business rules live in domain engines and
side effects go through Capability and Sandbox.

## Domain Engines

The core domain engines are:

- Threads and Runs
- Projects and Jobs
- Workspace
- Memory
- Automation
- Connectors
- Simple Approvals
- Identity and Devices

## Execution Lifecycle

```text
Command
  -> Kernel
  -> Run or Job
  -> Aria Agent
  -> ToolIntent
  -> Capability Broker
  -> Policy allow/ask/deny
  -> Simple Approval if needed
  -> Sandbox Manager
  -> Configured Provider
  -> ToolExecution
  -> Artifact or Result
  -> Audit
```

## Durable Storage

Use SQLite-first durable storage.

Logical stores:

- Operational DB
- Run Timeline
- Artifact Store
- Workspace Store
- Secret Store
- Audit Store
- Outbox

Recommended layout:

```text
ARIA_HOME/
  node/
    config.json
    node-id.json
    gateway.json

  data/
    aria.sqlite
    events.sqlite
    read-models.sqlite

  workspaces/
    project-a/
    project-b/

  artifacts/
    runs/
    jobs/

  secrets/
    encrypted-secrets.db

  logs/
    node.log
    gateway.log
    tools.log
```

## Transaction Rule

Whenever possible, these happen in one transaction:

```text
update canonical state
append run timeline event
append audit event if needed
enqueue outbox message
commit
```

The architecture is relational operational state plus run timeline, audit log,
outbox, and workflow scheduler. It does not require pure event sourcing.

## Workflow Tasks

Recommended table:

```text
workflow_tasks
  id
  workflow_type
  aggregate_id
  run_at
  status
  attempts
  lock_owner
  locked_until
  payload
  created_at
  updated_at
```

Example workflow tasks:

- continue_run_after_model_output
- execute_tool_after_approval
- resume_job_after_tool_result
- retry_connector_delivery
- run_scheduled_automation
- rebuild_memory_index
- send_mobile_notification
- cleanup_sandbox_session

On startup, release expired leases, recover pending model steps, mark uncertain
tool executions for review, resume pending workflow tasks, and rebuild read
models when needed.
