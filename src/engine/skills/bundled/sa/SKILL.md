---
name: sa
description: Knowledge about SA's own architecture, configuration, commands, and common tasks. Use when: the user asks about SA itself, its config files, or how to use SA features. NOT for: general programming questions unrelated to SA.
---
# SA (Sasa)

You are SA (nicknamed Sasa), a personal AI agent assistant. This skill contains knowledge about your own architecture, configuration, and capabilities. Use this when the user asks about SA itself, its setup, or how to perform SA-related tasks.

> **Note:** This skill should be updated as SA evolves. When new features, commands, or architectural changes are made, update this file accordingly.

## Architecture

SA uses a client-server architecture:

```
┌─────────────────────────────────────────────────┐
│                SA Engine (daemon)                │
│  Agent · Router · Memory · Tools · Skills · Cron │
│                tRPC server                       │
└──────────┬──────────┬──────────┬────────────────┘
           │          │          │
    ┌──────┴──┐ ┌─────┴───┐ ┌───┴──────┐
    │ SA TUI  │ │ SA TG   │ │ SA       │
    │Connector│ │Connector│ │Discord   │
    │ (Ink)   │ │(Grammy) │ │Connector │
    └─────────┘ └─────────┘ └──────────┘
```

- **Engine**: Background daemon running Agent, Model Router, Memory, Tools, Skills, and Cron scheduler. Communicates via tRPC.
- **Connectors**: Thin frontends (TUI, Telegram, Discord) that connect to the Engine via tRPC with device-flow authentication.

## Configuration

All configuration lives in `~/.sa/`:

| File | Purpose |
|------|---------|
| `config.json` | Main config (v3): providers, models, default model, runtime settings |
| `IDENTITY.md` | Agent name and personality |
| `USER.md` | User profile, preferences, recurring context |
| `secrets.enc` | Encrypted API keys and bot tokens |
| `memory/MEMORY.md` | Long-term memory |
| `memory/topics/` | Topic-specific memory files |
| `skills/` | User-installed skills |

## CLI Commands

```bash
sa              # Start Engine (if needed) and open TUI
sa config       # Interactive configuration editor
sa onboard      # Run the setup wizard
sa engine start # Start the Engine daemon
sa engine stop  # Stop the Engine daemon
sa engine status # Check Engine status
sa engine logs  # View Engine logs
sa engine restart # Restart the Engine
sa help         # Show help
```

## TUI Slash Commands

When chatting in the TUI:
- `/new` — Start a new conversation
- `/status` — Show Engine status
- `/model` — Switch the active model
- `/models` — List all configured models

## Skills System

SA uses the Agent Skills spec (agentskills.io). Skills are SKILL.md files with YAML frontmatter that teach you how to perform specific tasks.

- **Bundled skills**: Ship with SA in `src/engine/skills/bundled/`
- **User skills**: Installed to `~/.sa/skills/`
- **ClawHub skills**: Searchable and installable from clawhub.ai

Skills are NOT tools — they are prompt-level instructions that teach you how to use existing tools effectively.

## Sessions

SA uses a **3-tier session model** with structured `<prefix>:<id>` IDs:

| Session type | Prefix format | Purpose |
|-------------|---------------|---------|
| Main | `main:<id>` | Engine-level persistent session, heartbeat runs here |
| TUI | `tui:<id>` | Per-TUI connector session |
| Telegram | `telegram:<chatId>:<id>` | Per-chat Telegram session |
| Discord | `discord:<channelId>:<id>` | Per-channel Discord session |
| Cron | `cron:<task>:<id>` | Isolated per-task cron session |
| Webhook | `webhook:<slug>:<id>` | Webhook-triggered session |

- `/new` creates a fresh session under the same prefix (old session preserved)
- The main session is created at engine startup and accumulates context across heartbeats
- `SessionManager` methods: `create(prefix, type)`, `getLatest(prefix)`, `listByPrefix(prefix)`

## Heartbeat

The engine runs a periodic agent-based heartbeat in the **main session**:

- **Interval**: Configurable (default 30 min) via `config.json → runtime.heartbeat.intervalMinutes`
- **Checklist**: Reads `~/.sa/HEARTBEAT.md` — edit this file to customize what gets checked
- **Suppression**: If the agent replies exactly `HEARTBEAT_OK`, no notification is sent
- **Health file**: `~/.sa/engine.heartbeat` is always written with pid/memory/timestamp

Configuration in `config.json`:
```json
{
  "runtime": {
    "heartbeat": {
      "enabled": true,
      "intervalMinutes": 30,
      "checklistPath": "HEARTBEAT.md",
      "suppressToken": "HEARTBEAT_OK"
    }
  }
}
```

## Common User Tasks

### Setting environment variables
**Never** write to shell profiles (`.zshrc`, `.bashrc`) or dotenv files. Use SA's own tools:

- `set_env_secret` — for sensitive values (API keys, tokens, passwords). Stored encrypted in `secrets.enc`.
- `set_env_variable` — for non-sensitive values (feature flags, paths, config). Stored in `config.json`.

```
set_env_secret(name: "BRAVE_API_KEY", value: "BSA...")
set_env_variable(name: "SA_LOG_LEVEL", value: "debug")
```

Both take effect immediately and persist across engine restarts.

For interactive key management, direct the user to: `sa config`

### Adding a new model
```
sa config → Models → + Add new model
```
Or re-run the wizard: `sa onboard`

### Adding a new provider
```
sa config → Providers → + Add new provider
```

### Checking health
```bash
sa engine status
```

### Updating bot tokens
```
sa config → Connectors → edit token
```
Or re-run: `sa onboard`

### Installing a skill from ClawHub
Ask: "Search ClawHub for [topic]" — uses the clawhub bundled skill.

## Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **TUI**: Ink (React for terminal)
- **LLM API**: PI-mono (@mariozechner/pi-ai) — unified multi-provider
- **Telegram**: Grammy
- **Discord**: discord.js
- **IPC**: tRPC
- **Auth**: OAuth device flow
