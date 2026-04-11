# Projects Engine

`packages/projects-engine` owns durable tracked-work state for Aria Projects.

## What It Owns

- projects
- repos
- tasks
- threads
- jobs
- dispatches
- worktrees
- reviews
- publish runs
- external references

## What It Does Not Own

Projects Engine does not own live model execution, process lifecycle, streaming, or tool approvals. Those remain runtime responsibilities.

## Core Rule

One dispatch creates one runtime execution.

Projects Engine records why work exists and what durable state describes it. Runtime performs the live execution and reports lifecycle changes back.

## Current Services

- repository and SQLite store
- dispatch planning and blocking evaluation
- dispatch lifecycle helpers
- repo and worktree services
- review and publish services
- external reference management

## CLI Surface

`aria projects` now exposes both inspection and mutation flows over these records.
