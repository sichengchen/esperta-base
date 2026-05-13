# Domain Model

This page defines canonical Aria Node Runtime entities.

## Canonical Entities

```text
Node
Device
Principal
Session

Thread
Message
Run
RunStep
RunTimelineEvent

Project
Workspace
Job
Checkpoint
Artifact
Patch

ToolIntent
ToolExecution
CapabilityGrant

ApprovalRequest
ApprovalDecision

Automation
Trigger
AutomationRun

Connector
ExternalEvent
ConnectorDelivery

MemoryRecord
MemorySource

SecretHandle

AuditEvent
```

## Core Normalization

Chat, project work, automation work, connector-triggered work, and
API-triggered work all become `Run` records.

Project and long-running work additionally use `Job` records.

## Threads and Runs

```text
Thread:
  user-visible conversation or project thread

Run:
  one execution attempt inside a thread

RunStep:
  one meaningful execution step

RunTimeline:
  streamed user-visible activity
```

Canonical lifecycle:

```text
MessageAppended
RunRequested
RunStarted
AssistantDeltaEmitted
ToolIntentCreated
ApprovalRequested
ToolExecutionCompleted
RunCompleted
```

## Projects and Jobs

Project work is durable product state, not a chat side effect.

```text
Project:
  registered repo, folder, or work domain

Job:
  durable unit of work

Artifact:
  generated file, patch, report, log, diff, or review object
```

Project execution model:

```text
Project
  -> Thread
  -> Run
  -> Job
  -> Workspace
  -> ToolIntent
  -> SandboxExecution
  -> Artifact
  -> Review
```

## Workspace

Workspace is an execution boundary, not just a folder.

It registers folders or repos, prepares snapshots, manages workspace leases,
tracks file snapshots, extracts patches, stores artifacts, cleans temporary
state, and applies approved changes to the real workspace.

Preferred flow:

```text
read project
prepare snapshot or selected files
load into configured sandbox provider
run tools in sandbox
extract patch or artifact
ask before applying to real workspace
apply approved patch
audit result
```

## Memory

Memory is node-owned.

Memory operations go through node APIs. Desktop UI and Mobile UI must not
directly own memory state.

## Identity Fields

Persisted records and streamed events should carry as much identity as
available:

- `nodeId`
- `deviceId`
- `principalId`
- `sessionId`
- `threadId`
- `messageId`
- `runId`
- `runStepId`
- `jobId`
- `projectId`
- `workspaceId`
- `toolIntentId`
- `toolExecutionId`
- `approvalRequestId`
- `automationId`
- `connectorId`
- `artifactId`
- `auditEventId`

Use `nodeId`, not `serverId`, for runtime identity.
