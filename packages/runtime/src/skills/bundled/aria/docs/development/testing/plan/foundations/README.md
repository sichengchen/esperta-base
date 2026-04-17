# Test Plan Foundations

This section groups the server capability boundaries that must be proven independently of any one user workflow.

Use this section when the change primarily affects a server-owned surface such as auth, sessions, memory, automation, connectors, projects, or durability.

## Documents

- [gateway-auth.md](./gateway-auth.md)
- [runtime-sessions.md](./runtime-sessions.md)
- [memory-prompt.md](./memory-prompt.md)
- [automation.md](./automation.md)
- [connectors.md](./connectors.md)
- [projects-remote-jobs.md](./projects-remote-jobs.md)
- [durability-ops.md](./durability-ops.md)

## Rule

If a change touches a server capability boundary, it should have coverage here before it is considered complete.
