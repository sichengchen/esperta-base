# Architecture Overview

Esperta Aria is a local-first agent platform built around one durable runtime plus a growing package-oriented monorepo. The runtime owns live execution. The Projects Engine owns durable tracked work. Relay and Handoff sit beside those cores instead of collapsing into them.

## Monorepo Shape

| Package | Responsibility |
| --- | --- |
| `packages/runtime` | Live execution, sessions, approvals, tools, MCP, automation, archives, audit |
| `packages/projects-engine` | Durable tracked-work state: projects, tasks, threads, jobs, dispatches, repos, worktrees, reviews, publish runs, external refs |
| `packages/handoff` | Idempotent submission boundary from local/runtime-originated work into Projects |
| `packages/relay` | Paired-device trust, session attachment, queued remote control envelopes |
| `packages/connectors` | Connector and TUI surfaces over the shared runtime protocol |
| `packages/shared-types` | Shared brand, client, and cross-layer type surfaces |
| `packages/providers-*` | Runtime execution backends for Aria, Codex, Claude Code, and OpenCode |

`src/` still exists as a compatibility layer for older imports, entrypoints, and tests during the migration. The canonical implementation owner for runtime behavior is now `packages/runtime`.

## High-level Model

```text
User Surface or Connector
  -> Interaction Protocol
  -> Aria Runtime
       -> Prompt Engine
       -> Tool Runtime
       -> Automation Runtime
       -> Memory Services
       -> SQLite Operational Store

Tracked Work
  -> Projects Engine
       -> Project / Task / Thread / Job
       -> Dispatch / Repo / Worktree
       -> Review / PublishRun / ExternalRef

Remote Control
  -> Relay
       -> Device Trust
       -> Session Attachments
       -> Queued Follow-up / Approval Envelopes

Local Submission Into Projects
  -> Handoff
       -> Idempotent submission
       -> thread/job/dispatch materialization
```

## Ownership Rules

### Runtime

Runtime owns live process and model execution:

- session lifecycle
- run lifecycle
- streaming output
- approvals and cancellation
- tool execution
- automation execution
- audit and checkpoints

### Projects Engine

Projects Engine owns durable work state:

- projects
- repos
- tasks
- threads
- jobs
- dispatches
- worktrees
- reviews
- publish runs
- external references

### Relay

Relay owns paired-device trust and remote control transport, not execution or tracked-work state.

### Handoff

Handoff owns the submission boundary that turns local or runtime-originated intent into tracked Projects work in an idempotent way.

## Dispatch Bridge

One project dispatch creates one runtime execution.

The dispatch record is the durable bridge between tracked work and live runtime execution. The runtime now contains a backend registry plus a dispatch runner that can propagate accepted, running, waiting-approval, completed, failed, and cancelled states back into Projects.

## Current Repo Reality

- Runtime code is package-owned and internally package-local.
- Projects Engine now has review/publish services in addition to planning, dispatch, and worktree services.
- Handoff can materialize a thread, job, and dispatch from a pending submission.
- Relay now persists devices, attachments, and queued remote envelopes.
- Some CLI, connector, and shared surfaces still depend on compatibility paths under `src/`, which is why the final migration issue remains open.
