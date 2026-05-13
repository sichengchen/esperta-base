# Release Guidance

Before shipping substantial changes, run:

```bash
bun run check
bun run test
bun run build
```

Docs-only changes may skip runtime checks when no executable code, generated
runtime assets, or package metadata changed. State the exemption in the handoff.

Architecture-affecting releases should verify:

- Desktop and Headless still use the same runtime path or move closer to it.
- Mobile remains remote-only.
- Side effects go through Capability Broker and Sandbox Manager.
- Policy decisions remain `allow`, `ask`, or `deny`.
- Approval decisions remain `approve_once` or `deny`.
- justbash remains the default sandbox provider.
- Unsupported justbash actions do not silently escape to host execution.
