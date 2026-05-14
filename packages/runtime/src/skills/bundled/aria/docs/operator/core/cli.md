# CLI

The public CLI identity is:

```text
aria
```

The CLI operates a node. Command groups align with Aria Node Runtime ownership:

- `aria node`
- `aria gateway`
- `aria projects`
- `aria jobs`
- `aria automation`
- `aria connectors`
- `aria memory`
- `aria audit`
- `aria secrets`
- `aria config`

## Runtime Rules

- CLI commands that create work submit commands through Gateway or Kernel.
- CLI commands do not bypass Capability, Approval, Sandbox, or Audit.
- Local project mutations require the same approval and workspace mutation flow
  as Desktop and Mobile initiated work.
