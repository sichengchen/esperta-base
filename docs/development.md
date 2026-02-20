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
| `dev`        | `bun run src/index.ts`                           | Run the agent directly (no build step) |
| `build`      | `bun build src/index.ts --outdir dist --target bun` | Compile to `dist/` for distribution |
| `test`       | `bun test`                                       | Run all tests (unit, integration, e2e) |
| `lint`       | `eslint src/`                                    | Lint the source directory            |
| `typecheck`  | `tsc --noEmit`                                   | Type-check without emitting files    |

## Tests

Tests live in `tests/` with three sub-directories:

```
tests/
  unit/         # per-subsystem unit tests
  integration/  # cross-subsystem flows (config+router, agent+tools, memory persistence)
  e2e/          # smoke test for the full startup path
```

Run all tests:

```bash
bun test
```

Run a single file:

```bash
bun test tests/unit/agent.test.ts
```

## Project structure

```
src/
  agent/      # Agent class, conversation loop, tool dispatch
  config/     # ConfigManager, types, defaults
  memory/     # MemoryManager, persistence
  router/     # ModelRouter, ModelConfig types
  telegram/   # TelegramTransport (GrammY)
  tools/      # read, write, edit, bash, remember
  tui/        # Ink React components
  wizard/     # Onboarding wizard components
  index.ts    # Entry point
```

## Notes

This is a personal, single-user project. There is no contribution workflow, CI pipeline, or release process. The `main` branch reflects the stable state; features are developed on `feature/<phase>` branches.
