# Sandbox Architecture

All tool execution goes through Sandbox Manager.

The default provider is `justbash`. Future full sandbox providers can be added
later.

## Provider Selection

Provider selection is controlled by configuration, not policy.

Selection hierarchy:

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

Possible future values:

```text
sandbox.provider = "daytona"
sandbox.provider = "container"
sandbox.provider = "remote_vm"
```

Future providers are not automatically chosen by risk policy. The user or
administrator switches providers explicitly.

## Responsibility Split

Policy Engine decides:

```text
allow
ask
deny
```

Policy Engine does not decide:

```text
use justbash
use Daytona
use container
use VM
```

Sandbox Manager decides only based on configuration:

- which provider is configured
- how to create session
- how to mount inputs
- how to execute tool
- how to collect outputs
- how to clean up

## justbash Provider

Use justbash for:

- normal default execution
- scratch command execution
- agent working directory
- virtual file operations
- small code or text transformations
- default project analysis path
- patch generation when feasible

If an action cannot be supported by justbash, the runtime should not silently
escape to host execution.

It should return:

```text
This action requires a different sandbox provider.
Switch this run, project, or node to a full sandbox provider when available.
```

## Future Full Sandbox Provider

A future full sandbox provider can support stronger execution environments:

- isolated process execution
- larger project workspaces
- network-capable tasks
- long-running builds or tests
- workspace snapshots
- artifact extraction
- patch extraction
- cleanup

Full sandbox is not automatically selected. The user or administrator chooses
it.

## Applying Real Workspace Changes

Default workflow should avoid uncontrolled direct mutation of real user
workspaces.

Preferred flow:

```text
1. Workspace prepares input for sandbox.
2. justbash executes by default.
3. Tool produces artifact or patch.
4. User reviews result.
5. Applying patch to real workspace requires approval.
6. Workspace Engine applies approved change.
7. Audit records the mutation.
```

Applying a patch to the real workspace is a workspace mutation controlled by
Capability Broker, Policy, Simple Approval, Workspace Engine, and Audit.
