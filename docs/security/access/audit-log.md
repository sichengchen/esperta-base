# Audit Log

Audit records node security events and side effects.

## Audit Sources

- Gateway authentication and authorization
- pairing and device enrollment
- command acceptance and rejection
- policy decisions
- approval requests and decisions
- capability grants
- sandbox session creation and cleanup
- tool executions
- workspace mutations
- memory writes, updates, deletes, and retractions
- secret handle use
- connector delivery
- automation triggers and retries

## Tool Execution Audit

Every tool execution records:

- node, principal, session, thread, run, and job identity when available
- tool intent identity
- tool name and version
- side-effect classes
- policy result
- approval state
- sandbox provider
- sandbox session id
- start and end timestamps
- result summary
- artifact references
- failure or cancellation state

## Transaction Rule

Whenever possible, audit events are committed in the same transaction as the
canonical state update, timeline event, and outbox enqueue.
