# Monorepo

Aria is implemented as a package-oriented monorepo.

## Packages

| Package | Owns |
| --- | --- |
| `packages/runtime` | live execution, sessions, approvals, tools, automation, MCP, audit, checkpoints |
| `packages/projects-engine` | durable tracked-work records |
| `packages/handoff` | idempotent submission into Projects |
| `packages/relay` | paired-device trust and queued remote control envelopes |
| `packages/connectors` | TUI and chat/webhook connector surfaces |
| `packages/shared-types` | shared types, brand constants, client wiring |
| `packages/providers-*` | execution backend adapters |
| `packages/cli` | operator CLI surface |

## System Model

```text
Surface or Connector
  -> Interaction Protocol
  -> Runtime

Projects Engine
  -> durable tracked work
  -> dispatch records

Relay
  -> paired-device trust
  -> attachment and envelope transport

Handoff
  -> local/runtime work submission into Projects
```

## Core Rule

One tracked dispatch creates one runtime execution.

## Practical State

The repo is now package-first. The old root implementation tree is gone; package directories are the implementation owners.
