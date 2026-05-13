# Technical Decisions

This page records architectural decisions that are fixed by the Aria Node
Runtime design.

## One Shared Runtime

Desktop and Headless use the same Aria Node Runtime. They differ by packaging,
startup, service management, frontend availability, default gateway exposure,
and operator workflow.

## Mobile Is Remote Only

Mobile never hosts Aria Agent, Runtime Kernel, Tool Runtime, Sandbox Runtime,
Workspace Manager, Automation Engine, Connector Runtime, local project
execution, or local shell execution.

## Gateway Is The Access Boundary

Gateway owns pairing, authentication, authorization, command API, query API,
event stream API, and gateway audit events.

Gateway forwards valid requests into the Application Kernel and does not own
domain semantics or execution.

## Kernel Coordinates

Application Kernel owns command dispatch, query dispatch, idempotency,
transactions, workflow scheduling, unit of work, domain events, and outbox
publishing.

Business rules live in domain engines.

## Agent Does Not Execute Side Effects

Aria Agent emits ToolIntent records. It does not execute tools, write memory,
mutate workspaces, run shells, send connector messages, approve actions, store
secrets, or schedule automations directly.

## Approval Is Simple

Approval answers only:

```text
Can this action proceed?
```

Supported decisions are `approve_once` and `deny`.

## Policy Does Not Select Sandbox Provider

Policy decides `allow`, `ask`, or `deny`.

Sandbox provider selection is explicit configuration:

```text
Run-level setting
  overrides Project-level setting
    overrides Node-level setting
      overrides default provider
```

The default provider is `justbash`.

## No Silent Escape From justbash

If an action cannot be supported by justbash, the runtime must return a clear
unsupported result. It must not silently execute on the host or automatically
switch to a stronger provider.

## SQLite First

Desktop and Headless use SQLite-first durable storage for operational state,
run timelines, artifacts, workspace state, secrets, audit, outbox, and workflow
tasks.
