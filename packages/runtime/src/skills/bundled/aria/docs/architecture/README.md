# Architecture

This folder defines the canonical architecture for Esperta Aria.

It is the architecture the repo should keep aligned to:

- `Aria Server` hosts `Aria Agent`
- `Aria Agent` is the only component that owns Aria-managed memory, context, IM connectors, and automation
- `Aria Agent` can manage projects through a dedicated project control layer
- `Aria Desktop` is a multi-surface client for:
  - server-hosted `Aria`
  - unified `Projects` with local and remote environments
- `Aria Mobile` is a thin client for server-hosted Aria and remote project work
- `Aria Server Gateway` is the built-in secure entrypoint, while LAN/VPN/tunnel reachability stays outside Aria's product boundary

## Document Groups

- [core/README.md](./core/README.md)
- [runtime/README.md](./runtime/README.md)
- [surfaces/README.md](./surfaces/README.md)

## Canonical Names

| Surface                  | Canonical Name        |
| ------------------------ | --------------------- |
| Product                  | `Esperta Aria`        |
| Server product           | `Aria Server`         |
| Personal assistant       | `Aria Agent`          |
| Desktop client           | `Aria Desktop`        |
| Mobile client            | `Aria Mobile`         |
| Secure access layer      | `Aria Server Gateway` |
| Server-local terminal UI | `Aria Console`        |
| CLI binary               | `aria`                |

## Core Boundary

`Aria Agent` is server-only.

That implies:

- IM connectors are server-only
- Aria-managed memory and context are server-only
- heartbeat, cron, and webhook automation are server-only
- the server-local terminal UI chats only with `Aria Agent`
- local desktop coding threads are not Aria-managed memory threads

## Reader Guide

- Start with [core/README.md](./core/README.md) for the system map, deployment model, and durable object model
- Read [runtime/README.md](./runtime/README.md) for runtime execution, prompt assembly, tool runtime, automation, protocol, and handoff contracts
- Read [surfaces/README.md](./surfaces/README.md) for the server, gateway, desktop, and mobile ownership model
