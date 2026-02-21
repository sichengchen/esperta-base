---
id: 21
title: Engine daemon mode
status: done
type: feature
priority: 1
phase: phase-2
branch: feature/phase-2
created: 2026-02-19
shipped_at: 2026-02-20
pr: https://github.com/sichengchen/sa/pull/2
---
# Engine daemon mode

## Context
The Engine needs to run as a persistent background service so Connectors can connect/disconnect freely. This plan adds daemon management: start (detach to background), stop, status, and log output. On macOS, this can use `Bun.spawn()` to fork the Engine process or integrate with launchd.

## Approach
1. Create `src/cli/engine.ts` — CLI commands for Engine management:
   - `sa engine start` — start Engine as background process, write PID to `~/.sa/engine.pid`, redirect output to `~/.sa/engine.log`
   - `sa engine stop` — read PID file, send SIGTERM, clean up PID file
   - `sa engine status` — check if PID is alive, print status (port, uptime, active sessions)
   - `sa engine logs` — tail `~/.sa/engine.log`
   - `sa engine restart` — stop + start
2. Update `src/engine/server.ts`:
   - Write PID file on start
   - Write engine URL (host:port) to `~/.sa/engine.url` so Connectors can discover it
   - Write auth token to `~/.sa/engine.token` (used by device-flow auth, plan #022)
   - Handle SIGTERM/SIGINT for graceful shutdown (close tRPC server, clean PID file)
3. Create `src/cli/index.ts` — CLI entry point that routes subcommands (`engine`, `connector`, etc.)
4. Update `package.json`:
   - Add `bin` field: `"sa": "src/cli/index.ts"`
   - Add `cli` script: `bun run src/cli/index.ts`
5. Add process health check: Engine writes a heartbeat timestamp to `~/.sa/engine.heartbeat` periodically; `status` command checks staleness

## Files to change
- `src/cli/index.ts` (create — CLI entry point with subcommand routing)
- `src/cli/engine.ts` (create — engine start/stop/status/logs/restart commands)
- `src/engine/server.ts` (modify — PID file, URL file, graceful shutdown)
- `package.json` (modify — add bin field and cli script)

## Verification
- Run: `sa engine start` — Engine starts in background, PID file exists
- Run: `sa engine status` — shows running status, port, PID
- Run: `sa engine stop` — Engine stops, PID file cleaned up
- Run: `sa engine start && sa engine restart` — restart works
- Expected: Engine persists across terminal sessions
- Edge cases: Engine already running (refuse double-start), stale PID file (process died), port conflict

## Progress
- Created src/cli/index.ts — CLI entry point with subcommand routing and help
- Created src/cli/engine.ts — start/stop/status/logs/restart with PID management
- Updated server.ts — writes engine.url discovery file, async stop with cleanup
- Updated package.json — bin field and cli script
- Daemon lifecycle tested: start → status (running, health ok) → stop → status (stopped)
- Handles stale PID files, double-start prevention, graceful SIGTERM shutdown
- Modified: server.ts, index.ts, package.json
- Created: cli/index.ts, cli/engine.ts
- Verification: passed (107 tests, lint clean, typecheck clean, daemon cycle works)
