# Security

Aria security is built around node ownership and side-effect control.

The main safety system is:

```text
Capability Broker
Policy
Sandbox
Audit
```

Approval is intentionally small and answers only whether a requested action can
proceed.

## Sections

- [access](./access/README.md): gateway auth, approvals, and audit.
- [data](./data/README.md): secrets and durable data rules.
- [execution](./execution/README.md): sandbox provider model and justbash default.
