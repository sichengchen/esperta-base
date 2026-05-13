# Interaction Protocol

All clients and integrations use the same node protocol.

Desktop local sessions and Mobile remote sessions are both sessions against the
same Aria Node Runtime protocol.

## Command API

```text
create_thread
append_message
request_run
cancel_run
create_project_job
approve_action
deny_action
configure_automation
configure_connector
update_memory
configure_provider
set_sandbox_provider
```

## Query API

```text
list_threads
get_thread
get_run
list_jobs
get_job
list_projects
get_artifact
list_approvals
search_memory
get_audit_records
get_node_status
get_sandbox_config
```

## Event API

```text
subscribe_node_events
stream_run_timeline
stream_job_progress
stream_approval_changes
stream_connector_events
stream_automation_events
stream_sandbox_events
```

## Event Families

Inbound:

- user message
- operator action
- approval response
- interrupt or cancellation
- attachment upload
- automation trigger
- connector event

Outbound:

- assistant delta
- reasoning or status delta
- tool intent created
- approval requested
- tool execution completed
- artifact available
- job progress changed
- run completed
- run failed

## Identity Model

Protocol envelopes should carry as much canonical identity as available:

- `nodeId`
- `deviceId`
- `principalId`
- `sessionId`
- `threadId`
- `runId`
- `jobId`
- `projectId`
- `workspaceId`
- `toolIntentId`
- `toolExecutionId`
- `approvalRequestId`
- `automationId`
- `connectorId`
- `artifactId`

At minimum, streamed run events should include `nodeId`, `threadId`, and
`runId` so correlation never depends on transport state.

## Frontend Rules

Frontends adapt the protocol to UI constraints, but must not redefine approval
meaning, cancellation behavior, task and run status semantics, tool execution
meaning, or thread and run correlation.
