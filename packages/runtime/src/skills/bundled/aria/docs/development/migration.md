# Migration

## Goal

Converge the repo on package-owned implementations and retire old assumptions about legacy trees and repos after the data and workflow cutover is complete.

## Target Boundaries

- `packages/runtime`
- `packages/projects-engine`
- `packages/handoff`
- `packages/relay`
- `packages/connectors`
- `packages/shared-types`
- provider packages
- CLI and future app surfaces

## Principles

- prefer package-owned implementations over compatibility wrappers
- remove temporary trees once replacements are live
- keep runtime responsible for execution
- keep Projects Engine responsible for durable work state
- keep Relay responsible for remote trust and transport
- keep Handoff responsible for submission into Projects

## Legacy Import

The legacy import path should preserve:

- projects and repos
- tasks, threads, and jobs
- dispatch and worktree relationships where recoverable
- external refs to legacy systems

The migration tool supports dry-run reporting before mutation.

## Current State

- the root `src` tree is removed
- runtime, connectors, CLI, Projects Engine, Handoff, Relay, and shared types are package-owned
- docs are becoming the only canonical documentation tree

## Cutover Criteria

Before legacy repos are archived:

1. package boundaries are live
2. runtime, projects, handoff, and relay flows are verifiably usable
3. legacy import supports dry-run and write modes
4. tests, typecheck, and build pass
