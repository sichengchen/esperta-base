# Simple Approval Flow

Approval is intentionally small.

Approval is not the main safety system. The main safety system is Capability
Broker, Policy, Sandbox, and Audit.

Approval answers only one question:

```text
Can this action proceed?
```

## ApprovalRequest

```text
ApprovalRequest
  id
  runId
  jobId
  toolIntentId
  summary
  riskLevel
  requestedAction
  status
  createdAt
  expiresAt
```

## Decisions

Initial supported decisions:

```text
approve_once
deny
```

Possible future decisions:

```text
approve_for_session
approve_for_project
```

Future scoped approvals should not be added until the simple model is proven
insufficient.

## Policy Result

Policy result remains simple:

```text
allow
ask
deny
```

Policy decides whether an action is allowed, denied, or requires user approval.
Policy does not choose the sandbox provider.

## Flow

```text
ToolIntent
  -> Capability Broker
  -> Policy allow/ask/deny
  -> ApprovalRequest only when policy says ask
  -> approve_once or deny
  -> Sandbox Manager execution if approved
  -> Audit
```
