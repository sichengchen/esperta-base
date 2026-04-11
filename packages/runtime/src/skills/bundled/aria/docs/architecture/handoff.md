# Handoff

`packages/handoff` is the durable submission boundary between local/runtime-originated work and Aria Projects tracked work.

## Role

Handoff accepts idempotent submissions and can materialize them into:

- thread records
- job records
- queued dispatch records

## Requirements

- idempotency key
- project-scoped association
- durable linkage from handoff to created dispatch
- ability to re-read and re-process pending handoffs safely

## Current Behavior

`aria projects handoff-submit` creates the durable handoff record.

`aria projects handoff-process` materializes a pending handoff into tracked Projects records when the target project exists.
