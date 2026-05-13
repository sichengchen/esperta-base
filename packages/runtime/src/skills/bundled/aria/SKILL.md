---
name: aria
description: Knowledge about Esperta Aria architecture, configuration, commands, and migration state. Use when the user asks about Aria itself, its config files, or how to use its features. NOT for general programming questions unrelated to Aria.
---

# Esperta Aria

Esperta Aria is a local-first agent platform built around one shared runtime:
`Aria Node Runtime`.

Desktop and Headless package the same runtime. Mobile is a remote client only.

## Canonical Docs

| Topic                 | Doc file                                            | Covers                                                                     |
| --------------------- | --------------------------------------------------- | -------------------------------------------------------------------------- |
| Product model         | `docs/product/aria-platform.md`                     | Naming, installation forms, product commitments                            |
| Architecture overview | `docs/architecture/core/overview.md`                | Gateway, Kernel, domain engines, agent plane, capability, sandbox, storage |
| Runtime model         | `docs/architecture/runtime/runtime.md`              | Node host, Gateway, Kernel, storage, workflow tasks                        |
| Prompt engine         | `docs/architecture/runtime/prompt-engine.md`        | Context assembly and prompt output contract                                |
| Tool runtime          | `docs/architecture/runtime/tool-runtime.md`         | ToolIntent, manifests, Capability, Approval, Sandbox                       |
| Automation            | `docs/architecture/runtime/automation.md`           | Node-hosted triggers and run creation                                      |
| Interaction protocol  | `docs/architecture/runtime/interaction-protocol.md` | Command, query, event, and identity contracts                              |
| Node surface          | `docs/architecture/surfaces/server.md`              | Aria Node Runtime component model                                          |
| Migration             | `docs/development/migration.md`                     | Target implementation phases                                               |

## Accessing Docs

- Read a doc: `read_skill(name: "aria", path: "docs/architecture/runtime/runtime.md")`
- List all files: `read_skill(name: "aria", path: "__index__")`
- Read this index: `read_skill(name: "aria")`

## Current Public Surface

- Product: `Esperta Aria`
- Runtime: `Aria Runtime`
- Node runtime: `Aria Node Runtime`
- CLI: `aria`
- Runtime home: `~/.aria/` or `ARIA_HOME`

## Core Runtime Rule

```text
Aria Agent runs only inside Aria Node Runtime.
```

Aria Agent proposes ToolIntent records. Capability, Policy, Approval, Sandbox,
and Audit control side effects.
