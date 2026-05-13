# Automation

Automations are node-hosted command producers.

Automations never run on Mobile.

## Responsibilities

- scheduled triggers
- webhook triggers
- event triggers
- retry policy
- failure reporting
- automation run history

## Flow

```text
Trigger
  -> Automation Engine
  -> Command Bus
  -> Kernel
  -> Thread and Run Engine
  -> Agent Runtime
```

Automation-created work uses the same command, run, capability, approval,
sandbox, storage, and audit lifecycle as operator-created work.

## Durable Records

Automation state should make these records queryable:

- automation
- trigger
- automation run
- linked thread and run
- retry attempts
- final status and summary
- delivery outcome

## Recovery

On startup the node should restore scheduled and webhook triggers, recover
pending retries and resumable runs, preserve prior run history, and continue
using the same approval and audit rules.

## Boundary Rules

- no mobile-hosted automation runtime
- no client-only automation source of truth
- connectors may deliver results, but connector adapters do not own automation
  semantics
