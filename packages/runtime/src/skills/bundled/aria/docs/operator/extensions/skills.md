# Skills

Skills are reusable prompt and workflow instruction bundles.

They are not a direct tool execution path. Any side effects described by a
skill still flow through Aria Agent, ToolIntent, Capability Broker, Approval if
needed, Sandbox Manager, Tool Runtime, and Audit.

## Sources

Skills may come from:

- bundled runtime assets
- user-installed skills under `ARIA_HOME`
- future connector or workspace-provided skill catalogs

## Rules

- Skill loading contributes prompt/context material.
- Skill content must not grant side-effect permissions by itself.
- Tool availability and side effects are governed by manifests, capability,
  policy, approvals, sandbox, and audit.
- Mobile may display or request skills through node APIs, but does not own skill
  state.
