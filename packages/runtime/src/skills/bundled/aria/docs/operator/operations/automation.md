# Automation Operations

Automations are node-hosted command producers.

## Automation Types

- scheduled triggers
- webhook triggers
- event triggers

## Flow

```text
Trigger
  -> Automation Engine
  -> Command Bus
  -> Kernel
  -> Thread and Run Engine
  -> Agent Runtime
```

## Operator Tasks

- configure an automation
- pause or resume an automation
- inspect automation run history
- review failures and retries
- inspect linked run and audit records
- configure notification or connector delivery through node-owned outbox paths

Automations never run on Mobile.
