# Prompt Engine

Prompt and context are dedicated Agent Plane responsibilities.

Aria Agent uses Prompt and Context to build model input for a run, but it does
not directly read or mutate every domain store. Context inputs are loaded
through node-owned domain APIs and assembled with source metadata.

## Responsibilities

- load run context
- collect relevant thread, project, memory, approval, and policy context
- compile prompt sections
- attach source attribution
- mark cacheable and volatile sections
- record excluded context reasons
- pass structured input to Model Router

## Inputs

Prompt assembly can include:

- runtime identity
- principal and device context
- thread and run state
- recent messages and summaries
- project context and workspace metadata
- memory records returned by node memory APIs
- active tool manifests and capability constraints
- connector, automation, or API overlays
- approval and sandbox constraints for the current run

## Project Context

Project context files are loaded intentionally and with source metadata.

Recommended precedence:

1. `.aria.md`
2. `AGENTS.md`
3. other explicitly configured project context

## Memory Context

Memory is node-owned. Prompt assembly may request memory search or retrieval,
but memory writes, updates, deletes, and retractions go through the Memory
domain engine.

## Output Contract

The prompt engine returns a structured assembly result:

- ordered prompt sections
- source references
- cacheability metadata
- compression decisions
- excluded context reasons

Every run should be explainable in terms of this assembly result.
