# Aria Server Test Plan

This folder is the canonical test plan for `Aria Server`.

The current development stance is explicit:

- do not optimize for backward compatibility
- do not optimize for migration cost
- optimize for clear architecture, clear file structure, and fully working flows

That means the test plan must follow the architecture, not the historical file layout.

## What This Folder Owns

This folder defines:

- capability-level test obligations
- end-to-end workflow coverage
- live AI coverage
- release gates
- target test suite layout

Each test case in this folder is documented with:

- a stable case ID
- the feature path or workflow path
- the scenario to execute
- the expected result
- the required test lane
- the current status: `covered`, `partial`, or `missing`
- the target automated suite

## Organization

- [foundations/README.md](./foundations/README.md)
- [workflows/README.md](./workflows/README.md)
- [execution/README.md](./execution/README.md)

### Foundations

Foundations are server capability boundaries and subsystem contracts:

- gateway and auth
- runtime and sessions
- memory and prompt
- automation
- connectors
- projects and remote jobs
- durability and operations

### Workflows

Workflows are complete user or operator paths:

- Aria chat
- connector message handling
- automation runs
- remote project thread execution
- Aria-managed project orchestration

### Execution

Execution docs define how the plan is carried out:

- live AI coverage
- suite ownership
- release gates

## Source Specs

This test plan is derived from:

- [../../../architecture/surfaces/server.md](../../../architecture/surfaces/server.md)
- [../../../architecture/core/overview.md](../../../architecture/core/overview.md)
- [../../../architecture/runtime/runtime.md](../../../architecture/runtime/runtime.md)
- [../../../architecture/runtime/prompt-engine.md](../../../architecture/runtime/prompt-engine.md)
- [../../../architecture/runtime/tool-runtime.md](../../../architecture/runtime/tool-runtime.md)
- [../../../architecture/runtime/automation.md](../../../architecture/runtime/automation.md)
- [../../../architecture/runtime/interaction-protocol.md](../../../architecture/runtime/interaction-protocol.md)
- [../../../architecture/surfaces/gateway-access.md](../../../architecture/surfaces/gateway-access.md)
- [../../../security/access/auth.md](../../../security/access/auth.md)
- [../../../security/access/approval-flow.md](../../../security/access/approval-flow.md)
- [../../../security/access/audit-log.md](../../../security/access/audit-log.md)

## Status Meanings

- `covered`: the repo already has automated tests that materially prove the case
- `partial`: there is some coverage, but not at the required boundary or depth
- `missing`: the documented case does not yet have acceptable automated proof

`partial` is not good enough for release.

## Test Lane Meanings

- `contract`: local logic, schemas, classifiers, and ownership rules
- `integration`: cross-package subsystem behavior without real transport
- `workflow`: business flow using in-process runtime or procedure surfaces
- `server-e2e`: started server, real auth, real HTTP/SSE/WS/webhook boundary
- `recovery`: restart, reconnect, restore, interrupted-state handling
- `live-ai`: real model behavior with structural assertions only

## Required Quality Bar

`Aria Server` is not considered done when unit tests pass.

`Aria Server` is considered done only when:

- every architecture boundary has automated proof
- every primary workflow has end-to-end proof
- restart and durability behavior are covered
- gateway transport behavior is covered
- live AI behavior is covered where model behavior is part of the contract

## Current Audit Summary

The current repo already has useful foundations:

- auth, session, prompt-engine, store, audit, scheduler, and archive tests
- procedure tests for many runtime mutations
- some project workflow and dispatch tests
- basic live tests for chat and tool use

The biggest gaps are:

- no folderized canonical server test plan before this change
- no black-box gateway transport plan for HTTP, SSE, and WS
- no black-box webhook endpoint plan
- no full restart/reconnect test plan at the server boundary
- live AI coverage is too narrow for the documented server flows

Start with the foundations index, then the workflow index, then use the execution docs as the shipping checklist.
