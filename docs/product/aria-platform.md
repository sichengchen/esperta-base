# Aria Platform

This page defines the product-level model and naming every package, app, and
doc should follow.

## Public Identity

- Product: `Esperta Aria`
- Runtime: `Aria Runtime`
- Shared runtime: `Aria Node Runtime`
- CLI: `aria`
- Runtime home: `~/.aria/` or `ARIA_HOME`

## Installation Forms

| Form               | Contains                                                                                                                      | Does not contain                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `Desktop Package`  | Desktop UI, Desktop Client SDK, Node Supervisor, Aria Node Runtime, Local Gateway, Local Store, Local Tools, Local Workspaces | A separate runtime from Headless                                                                                            |
| `Headless Package` | Service Manager, Aria Node Runtime, Gateway, Store, Tools, Workspaces, Automations, Connectors                                | Desktop UI                                                                                                                  |
| `Mobile Client`    | Mobile UI, Remote Client SDK, pairing/session management, notifications, small UX cache                                       | Aria Agent, Kernel, Tool Runtime, Sandbox Runtime, Workspace Manager, Automation Engine, Connector Runtime, local execution |

## Product Commitments

- one shared runtime for Desktop and Headless
- one node protocol for Desktop, Mobile, API clients, connectors, and automations
- one execution lifecycle for chat, projects, automations, connectors, and API-triggered work
- node-owned memory, secrets, jobs, tools, projects, automations, approvals, and audit
- simple approval decisions: `approve_once` or `deny`
- policy decisions limited to `allow`, `ask`, or `deny`
- configured sandbox provider selection, defaulting to `justbash`

## Architectural Rule

```text
Aria Agent runs only inside Aria Node Runtime.
```

Desktop and Headless carry the agent because they include Aria Node Runtime.
Mobile never carries the agent because it is a remote client only.

## Product Areas

Esperta Aria is one suite with these product areas:

- `Aria Desktop`: local operator UI backed by local or remote nodes.
- `Aria Headless`: always-on node package for remote jobs, automations, connectors, API access, and mobile access.
- `Aria Mobile`: remote approval, monitoring, artifact review, and chat client.
- `Aria Projects`: durable project, workspace, job, artifact, patch, and review flow.
- `Aria Automations`: scheduled, webhook, and event-triggered command producers hosted on a node.

These areas are not separate runtimes.

## Source Of Truth

- `docs/` defines target architecture and behavior.
- `src` and package code are live implementation.
- `DESIGN.md` defines shared Desktop and Mobile design rules.
- When docs and implementation diverge, move code toward this architecture and update docs in the same change.
