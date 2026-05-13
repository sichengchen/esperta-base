# Sessions And Runs

Sessions represent authenticated client access to a node. Threads and runs
represent durable work.

## Runtime Concepts

- `Session`: authenticated principal and device access to a node.
- `Thread`: user-visible conversation or project thread.
- `Run`: one execution attempt inside a thread.
- `RunStep`: meaningful execution step.
- `RunTimelineEvent`: streamed user-visible activity.

## Operator Tasks

- list active sessions
- revoke a session
- inspect a thread
- inspect a run
- cancel a run
- review pending approvals
- resume after approval
- review artifacts and audit records

Clients observe node-owned state. They do not own thread, run, approval, or
tool execution semantics.
