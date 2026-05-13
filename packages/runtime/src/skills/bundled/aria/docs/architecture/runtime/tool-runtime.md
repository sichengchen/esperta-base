# Tool Runtime

Tools are manifest-driven capabilities. They are not raw functions directly
called by Aria Agent.

## Core Rule

```text
Agent
  -> ToolIntent
  -> Capability Broker
  -> Approval if needed
  -> Sandbox Manager
  -> Tool Runtime
```

No direct tool execution from agent code.

## Tool Manifest

```ts
type ToolManifest = {
  name: string;
  version: string;

  inputSchema: unknown;
  outputSchema: unknown;

  sideEffects: SideEffect[];

  requiredCapabilities: CapabilityRequirement[];

  approvalPolicy: ApprovalPolicy;

  sandboxProfile: SandboxProfile;

  secretPolicy?: SecretPolicy;
};
```

## Side-Effect Classes

```text
read_file
write_file
execute_shell
network_access
send_message
modify_repo
use_secret
persist_memory
create_artifact
```

## ToolIntent

A ToolIntent is the persisted request to perform an action. It is created
before capability, approval, or sandbox execution.

The Kernel persists ToolIntent records so runs can recover after restart and
auditors can inspect what was proposed versus what executed.

## Capability, Approval, Sandbox Flow

```mermaid
sequenceDiagram
    participant Agent as Aria Agent
    participant Kernel as Kernel
    participant Cap as Capability Broker
    participant Policy as Policy
    participant Approval as Simple Approval
    participant Sandbox as Sandbox Manager
    participant Provider as Configured Provider
    participant Store as Durable Store

    Agent->>Kernel: ToolIntent
    Kernel->>Store: Persist ToolIntent
    Kernel->>Cap: Classify action
    Cap->>Policy: Check allow ask deny
    Policy-->>Cap: allow or ask or deny
    Cap->>Approval: Ask only if required
    Approval-->>Cap: approve_once or deny
    Cap->>Sandbox: Execute with scoped grant
    Sandbox->>Provider: Run tool or command
    Provider-->>Sandbox: Result and artifacts
    Sandbox->>Store: Save ToolExecution and Audit
    Kernel->>Agent: Resume run
```

## ToolExecution

```text
ToolExecution
  id
  toolIntentId
  provider
  sandboxSessionId
  status
  stdout
  stderr
  result
  artifacts
  auditRefs
  startedAt
  completedAt
```

## Provider Independence

Tool Runtime depends on a generic sandbox session contract.

It must not depend directly on justbash internals, Daytona internals, container
internals, or VM internals.

## Sandbox Provider Selection

Provider selection is config-driven:

```text
Run-level explicit setting
  overrides Project-level setting
    overrides Node-level setting
      overrides default provider
```

Default:

```text
sandbox.provider = "justbash"
```

Policy decides `allow`, `ask`, or `deny`. Policy does not choose the sandbox
provider.
