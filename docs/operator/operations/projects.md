# Projects

`aria projects` is the operator surface for durable tracked work.

## What You Can Manage

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
- handoffs

## Typical Workflow

1. register or update a project and repo
2. create a task or thread
3. append a job
4. create or queue a dispatch
5. run the dispatch
6. record review and publish state

## Handoff

Use:

- `handoff-submit` to create an idempotent submission
- `handoff-process` to materialize it into thread/job/dispatch records

## Ownership Reminder

Projects state is durable. Runtime execution is live. The CLI spans both, but the ownership remains split between Projects Engine and Runtime.
