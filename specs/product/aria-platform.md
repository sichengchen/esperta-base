# Esperta Aria Platform

Esperta Aria is a local-first agent platform. The product is not a renamed copy of the previous SA runtime; it is a durable, policy-governed platform with one runtime, one prompt engine, one tool runtime, one interaction protocol, and one automation subsystem.

## Canonical Names

| Surface | Canonical Name |
| --- | --- |
| Product | `Esperta Aria` |
| Runtime | `Aria Runtime` |
| CLI | `aria` |
| Runtime home | `~/.aria/` |
| Native project context file | `.aria.md` |

Legacy public identities such as `SA`, `Esperta Base`, `esperta-base`, `sa`, and `~/.sa/` are retired.

## Product Commitments

1. Aria is local-first. The primary operational state lives on the operator's machine.
2. Aria is durable. Restarting the runtime preserves sessions, runs, approvals, tasks, automation state, summaries, and audit records.
3. Aria is protocol-first. TUI, chat connectors, webhook APIs, automation delivery, and future web UI are surfaces on one shared runtime contract.
4. Aria is policy-driven. Tool access, approvals, execution backends, and MCP trust are governed by explicit capability policy rather than ad hoc danger tags.
5. Aria is extensible. Built-in tools and MCP tools appear in one coherent tool runtime, while remaining distinguishable for trust and audit.

## Platform Vocabulary

| Term | Meaning |
| --- | --- |
| Session | Durable conversation container spanning one operator or integration context |
| Run | A single agent execution inside a session, with streamed output, tool calls, approvals, and summaries |
| Task | A durable unit of work, optionally automated or delegated |
| Toolset | A named group of tools with shared capability boundaries and execution policy |
| Capability Policy | The rules governing availability, approval, isolation, and audit for a tool or toolset |
| Prompt Engine | The subsystem that assembles identity, policy, memory, project context, and session overlays into model input |
| Memory Layer | A specific class of memory with its own retention and policy behavior |
| Interaction Protocol | The shared event contract between the runtime and every frontend |

## Compatibility Stance

Aria breaks compatibility freely when compatibility preserves the wrong architecture. Migration support is optional and temporary. The source of truth is the Aria platform model, not the shape of prior CLI commands, config keys, or in-memory runtime behavior.

## North-Star Acceptance Criteria

- `aria` is the only public CLI identity.
- `~/.aria/` is the only runtime home.
- The runtime is restart-safe by design.
- Project context is loaded intentionally and summarized efficiently.
- Long sessions remain usable through built-in compression and caching.
- Built-in tools and MCP tools coexist under one policy framework.
- Automation is a native runtime feature, not a bolt-on.
- Every frontend is a surface on one runtime protocol.
- The system presents as one product with one vocabulary.

## Migration Note

The current repository still contains legacy implementation and documentation. Those artifacts are migration inputs, not the target model. New subsystem work should align to the Aria architecture defined here and in the referenced system and interface specs.
