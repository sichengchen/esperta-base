# Project Operations

Project work is durable node-owned work.

## Flow

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

## Operator Tasks

- register a project
- bind a project to a thread
- choose node, project, or run sandbox provider
- create a project job
- monitor job progress
- review artifacts and patches
- approve applying a patch to the real workspace
- cancel or retry jobs

## Workspace Mutation

Default workflow avoids uncontrolled direct mutation of real workspaces.

Applying a patch to a real workspace requires Capability Broker, Policy, Simple
Approval, Workspace Engine, and Audit.
