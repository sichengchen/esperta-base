# SA (Sasa)

Yet another personal AI assistant.

## Install

```bash
brew install sichengchen/tap/sa
```

Update with `brew upgrade sa`.

### Service

```bash
brew services start sa     # start engine, auto-start on login
brew services stop sa      # stop engine
brew services restart sa   # restart
```

Or manage manually with `sa engine start/stop/restart/status/logs`.

## Architecture

The **Engine** runs as a background daemon and owns the agent loop, tools, memory, skills, scheduler, audio transcription, and model routing. **Connectors** (Telegram, Discord) auto-start with the Engine when configured. The **TUI** is launched on-demand. A **Webhook** endpoint (`POST /webhook`) allows external systems to send messages programmatically.

## Development

```bash
git clone https://github.com/sichengchen/sa.git
cd sa
bun install
bun run dev            # starts Engine (if needed) + opens TUI
```

On first run, an onboarding wizard configures identity, model/provider settings, and optional connectors. Config is saved to `~/.sa/` (or `SA_HOME` if set).

| Command | Purpose |
|---------|---------|
| `bun run dev` | Run from source |
| `bun run build` | Bundle to `dist/` |
| `bun test` | Run tests |
| `bun run lint` | ESLint |
| `bun run typecheck` | TypeScript check |
| `bun run version:bump` | Bump CalVer + tag |

## SA CLI

```text
sa                      Start Engine (if needed) and open the TUI
sa onboard              Run the onboarding wizard
sa config               Open interactive config editor (providers/models/connectors/memory)
sa engine start         Start the Engine as a background daemon
sa engine stop          Stop the running Engine
sa engine status        Show Engine status
sa engine logs          Show recent Engine logs
sa engine restart       Restart the Engine
sa help                 Show help
```

## Skills

- Bundled skills ship in `src/engine/skills/bundled/`
- User-installed/local skills live in `~/.sa/skills/<skill-name>/SKILL.md`

## Documentation

- [Architecture](src/engine/skills/bundled/sa/docs/architecture.md) — Engine subsystems, agent loop, model router, sessions, tRPC API
- [Configuration](src/engine/skills/bundled/sa/docs/configuration.md) — config schema, providers, models, tiers, tool policy, automation
- [Tools](src/engine/skills/bundled/sa/docs/tools.md) — tool danger classification, approval flow, exec hybrid approval, filter patterns
- [Development](src/engine/skills/bundled/sa/docs/development.md) — testing, CI/CD, CalVer, contributing, debugging
- [Skills](src/engine/skills/bundled/sa/docs/skills.md) — SKILL.md format, bundled/user/ClawHub skills, creating custom skills
- [Sessions](src/engine/skills/bundled/sa/docs/sessions.md) — structured IDs, 3-tier session model, SessionManager API
- [Automation](src/engine/skills/bundled/sa/docs/automation.md) — heartbeat, cron dispatch, webhook tasks
- [Security](src/engine/skills/bundled/sa/docs/security.md) — tool danger levels, approval modes, secrets vault, auth

## Config location

Config lives in `~/.sa/` by default. Override with `SA_HOME`.

```text
~/.sa/
  IDENTITY.md       # agent name, personality, system prompt
  USER.md           # user profile (name, timezone, preferences)
  config.json       # runtime + providers + models config
  secrets.enc       # encrypted API keys and connector secrets
  .salt             # local salt used for secrets encryption key derivation
  memory/           # persistent memory files
  skills/           # installed skills
  engine.url        # Engine discovery file (written at startup)
  engine.pid        # Engine PID file
  engine.token      # Engine auth token file
  engine.log        # Engine log output
  engine.heartbeat  # heartbeat metadata written by scheduler
```
