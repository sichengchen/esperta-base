# Development

## Prerequisites

- [Bun](https://bun.sh) v1.0 or later (runtime, package manager, and test runner)
- Node.js is **not** required

## Setup

```bash
git clone <repo-url> sa
cd sa
bun install
cp .env.example .env
# Edit .env and fill in at least one provider API key
```

## Scripts

All scripts are run with `bun run <script>`.

| Script       | Command                                          | Description                          |
|--------------|--------------------------------------------------|--------------------------------------|
| `dev`        | `bun run src/cli/index.ts`                       | Start Engine (if needed) + open TUI  |
| `build`      | `bun build src/cli/index.ts --outdir dist --target bun` | Compile to `dist/` for distribution |
| `test`       | `bun test`                                       | Run all tests                        |
| `lint`       | `eslint src/`                                    | Lint the source directory            |
| `typecheck`  | `tsc --noEmit`                                   | Type-check without emitting files    |

## Running SA

`bun run dev` (or `sa` if installed) starts the Engine daemon if it isn't running, then opens the TUI. Configured IM connectors (Telegram, Discord) auto-start with the Engine.

```bash
bun run dev         # start Engine + TUI
sa engine status    # check daemon status
sa engine logs      # view Engine logs
sa engine stop      # stop the daemon
```

## Tests

Tests use `bun:test` and live alongside source files or in `tests/`:

```bash
bun test                                # run all tests
bun test src/config/secrets.test.ts     # run a single file
```

## Project structure

```
src/
  agent/          # Agent class, conversation loop, tool dispatch
  cli/            # SA CLI: default opens TUI, `sa engine` manages daemon
  clawhub/        # ClawHub API client and skill installer
  config/         # ConfigManager, types, defaults, secrets
  connectors/
    tui/          # TUI (Ink-based, on-demand via `sa`)
    telegram/     # Telegram connector (Grammy, auto-starts with Engine)
    discord/      # Discord connector (discord.js, auto-starts with Engine)
  engine/         # Engine daemon: server, runtime, router, auth, sessions, scheduler
  memory/         # MemoryManager, persistence
  router/         # ModelRouter, ModelConfig types
  shared/         # Shared types, Connector interface, tRPC client factory
  skills/         # Skill loader, registry, prompt builder
  tools/          # read, write, edit, bash, remember, read_skill, clawhub_search
  wizard/         # Onboarding wizard components
```

## Key dependencies

| Package                  | Purpose                                   |
|--------------------------|-------------------------------------------|
| `@mariozechner/pi-ai`   | Unified multi-provider LLM API            |
| `@trpc/server` + `@trpc/client` | Typed RPC between Engine and Connectors |
| `grammy`                 | Telegram Bot API                          |
| `discord.js`             | Discord Bot API                           |
| `ink` + `react`          | Terminal UI framework                     |
| `ws`                     | WebSocket server for tRPC subscriptions   |
| `zod`                    | Schema validation                         |
| `superjson`              | tRPC serialisation (dates, Maps, etc.)    |

## Notes

This is a personal, single-user project. There is no contribution workflow, CI pipeline, or release process. The `main` branch reflects the stable state; features are developed on `feature/<phase>` branches.
