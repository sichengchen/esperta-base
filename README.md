# Esperta Aria

Local-first agent platform with a durable runtime, structured toolsets, native MCP, and one shared interaction protocol across CLI, connectors, webhooks, and automation.

## Public Identity

- Product: `Esperta Aria`
- Runtime: `Aria Runtime`
- CLI: `aria`
- Runtime home: `~/.aria/` or `ARIA_HOME`

## Development

```bash
bun install
bun run dev
```

On first run, the onboarding flow writes runtime state under `~/.aria/`.

## Commands

| Command | Purpose |
| --- | --- |
| `aria` | Start the runtime if needed and open the TUI |
| `aria onboard` | Run onboarding |
| `aria config` | Open the interactive config editor |
| `aria engine start` | Start Aria Runtime in the background |
| `aria engine stop` | Stop the runtime |
| `aria engine status` | Show runtime status |
| `aria engine logs` | Show runtime logs |
| `aria restart` | Restart the runtime via API |
| `aria shutdown` | Shut the runtime down gracefully |
| `aria audit` | Inspect the audit log |

## Specs

The canonical Aria architecture now lives in [`specs/`](specs/README.md):

- [`specs/product/aria-platform.md`](specs/product/aria-platform.md)
- [`specs/system/runtime-model.md`](specs/system/runtime-model.md)
- [`specs/system/prompt-engine.md`](specs/system/prompt-engine.md)
- [`specs/system/tool-runtime.md`](specs/system/tool-runtime.md)
- [`specs/system/automation.md`](specs/system/automation.md)
- [`specs/interfaces/interaction-protocol.md`](specs/interfaces/interaction-protocol.md)

Additional docs remain under `specs/` for subsystem detail, but the canonical entry points are the Aria product, system, and interface specs listed above.
