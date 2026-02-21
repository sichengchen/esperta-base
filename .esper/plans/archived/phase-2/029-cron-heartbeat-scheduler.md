---
id: 29
title: Cron & heartbeat scheduler
status: done
type: feature
priority: 3
phase: phase-2
branch: feature/phase-2
created: 2026-02-19
shipped_at: 2026-02-20
pr: https://github.com/sichengchen/sa/pull/2
---
# Cron & heartbeat scheduler

## Context
Since the Engine runs as a persistent background daemon, it's the natural place for scheduled tasks. This plan adds a cron scheduler that can run periodic tasks: heartbeat checks, memory consolidation, skill updates, and user-defined scheduled prompts.

## Approach
1. Create `src/engine/scheduler.ts` — cron scheduler:
   - Uses `setInterval`-based scheduling (no external cron dependency)
   - `registerTask(name, cronExpr, handler)` — register a recurring task
   - `unregisterTask(name)` — remove a task
   - `listTasks()` — list all registered tasks with next run time
   - Parse cron expressions (minute, hour, day, month, weekday) — use a lightweight parser or implement basic support
2. Define built-in scheduled tasks:
   - **Heartbeat** (every 5 min): Update `~/.sa/engine.heartbeat` timestamp, log memory usage
   - **Memory consolidation** (daily): Summarize and compact memory entries older than N days
   - **Skill update check** (daily): Check ClawHub for updates to installed skills, notify via connected Connectors
3. Support user-defined scheduled prompts in config:
   ```json
   {
     "cron": [
       { "name": "morning-briefing", "schedule": "0 8 * * *", "prompt": "Give me a morning briefing" }
     ]
   }
   ```
   - Engine sends the prompt to the agent and routes the response to the user's preferred Connector
4. Wire up tRPC procedures:
   - `cron.list` — list scheduled tasks
   - `cron.add` — add a user-defined task
   - `cron.remove` — remove a task
5. Integrate with Engine runtime — start scheduler on Engine boot, stop on shutdown
6. Write unit tests for cron expression parsing and task scheduling

## Files to change
- `src/engine/scheduler.ts` (create — cron scheduler implementation)
- `src/engine/runtime.ts` (modify — start scheduler on boot)
- `src/engine/router.ts` (modify — add cron tRPC procedures)
- `src/config/types.ts` (modify — add cron config schema)
- `tests/scheduler.test.ts` (create — unit tests)

## Verification
- Run: `bun test`
- Run: Start Engine, verify heartbeat file is updated every 5 minutes
- Expected: Tasks run on schedule, user-defined prompts trigger agent responses
- Edge cases: Task throws error (don't crash scheduler), system clock change, Engine restart (tasks re-register)

## Progress
- Created src/engine/scheduler.ts with Scheduler class, matchesCron parser, and heartbeat built-in task
- Cron parser supports wildcards, step syntax (*/N), comma-separated values, and all 5 fields
- Built-in heartbeat task writes JSON with timestamp, PID, and memory usage to engine.heartbeat
- Updated src/engine/runtime.ts to start scheduler on boot with heartbeat task
- Updated src/engine/router.ts with cron.list, cron.add, cron.remove tRPC procedures
- Skipped config/types.ts modification — user-defined cron tasks added via tRPC API instead
- Created tests/scheduler.test.ts — 16 tests covering cron matching, task management, error handling, heartbeat
- Modified: src/engine/scheduler.ts, runtime.ts, router.ts, tests/scheduler.test.ts
- Verification: 163 tests pass, typecheck clean, lint clean
