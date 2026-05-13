# Secrets Store

Secrets are node-owned.

Aria Agent never stores secrets directly and tools receive only scoped secret
access through Capability and Sandbox.

## Logical Model

```text
SecretHandle
  id
  nodeId
  name
  purpose
  provider
  createdAt
  updatedAt
```

The Secret Store owns encrypted credentials and returns handles to other
runtime components.

## Storage

Target layout:

```text
ARIA_HOME/
  secrets/
    encrypted-secrets.db
```

The implementation should preserve encrypted-at-rest storage and restrictive
file permissions. Exact encryption details may evolve, but callers should not
depend on the storage format.

## Runtime Access

Secret use flows through:

```text
ToolIntent
  -> Capability Broker
  -> Policy
  -> Approval if needed
  -> scoped secret grant
  -> Sandbox Manager
  -> Tool Runtime
```

Audit records secret handle use, not secret values.

## Rules

- Do not expose secret values in prompts, logs, timeline events, artifacts, or audit payloads.
- Do not let Agent Runtime read or write secrets directly.
- Do not let Desktop UI or Mobile UI own secret state.
- Connector and automation credentials belong to the node that hosts those runtimes.
