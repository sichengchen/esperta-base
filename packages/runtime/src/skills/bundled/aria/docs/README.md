# Esperta Aria Documentation

`docs/` is the operator and architecture guide for the current repo. `specs/` holds the package-level engineering contracts. In practice:

- `docs/` explains how Aria behaves and how to operate it
- `specs/` defines the durable package boundaries and migration direction

## Core Platform Docs

| File | Focus |
| --- | --- |
| [`product/aria-platform.md`](product/aria-platform.md) | Product identity, vocabulary, commitments, compatibility stance |
| [`system/runtime-model.md`](system/runtime-model.md) | Runtime ownership, durable storage, session/run lifecycle |
| [`system/prompt-engine.md`](system/prompt-engine.md) | Prompt assembly, memory layers, context loading, compression |
| [`system/tool-runtime.md`](system/tool-runtime.md) | Toolsets, policy, MCP integration, audit requirements |
| [`system/automation.md`](system/automation.md) | Cron and webhook execution on the runtime substrate |
| [`system/projects-engine.md`](system/projects-engine.md) | Durable tracked work, dispatch, review, publish, repo/worktree flow |
| [`system/relay-model.md`](system/relay-model.md) | Paired-device trust, session attachment, queued relay envelopes |
| [`system/handoff.md`](system/handoff.md) | Idempotent submission boundary from local/runtime work into Projects |
| [`interfaces/interaction-protocol.md`](interfaces/interaction-protocol.md) | Shared runtime event contract for every surface |

## Operator And Repo Docs

| Area | Entry points |
| --- | --- |
| Package architecture and runtime flow | [`overview.md`](overview.md), [`sessions.md`](sessions.md), [`subagents.md`](subagents.md) |
| CLI and configuration | [`cli.md`](cli.md), [`configuration.md`](configuration.md), [`development.md`](development.md) |
| Skills, memory, and tool behavior | [`skills.md`](skills.md), [`tools/README.md`](tools/README.md), [`tools/memory.md`](tools/memory.md) |
| Security surfaces | [`security/README.md`](security/README.md), [`security/approval-flow.md`](security/approval-flow.md), [`security/url-policy.md`](security/url-policy.md) |

## Documentation Rule

If implementation changes:

- runtime ownership
- tracked-work behavior
- relay or handoff behavior
- CLI or configuration surfaces
- user-visible tool or approval behavior

then update the matching file in `docs/` and the matching contract in `specs/` when the change alters the architecture rather than only the operator surface.
