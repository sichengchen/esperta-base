# Workflow: Automation Runs

Primary spec:

- [../../../../architecture/runtime/automation.md](../../../../architecture/runtime/automation.md)
- [../../../../architecture/surfaces/server.md](../../../../architecture/surfaces/server.md)
- [../../../../operator/operations/automation.md](../../../../operator/operations/automation.md)

| Case ID | Workflow path | Scenario | Expected result | Lane | Status | Target suite |
| --- | --- | --- | --- | --- | --- | --- |
| `AFLOW-001` | `scheduler -> heartbeat -> runtime -> aria-agent` | Heartbeat fires on schedule | Health file, log file, last result, and optional notification all update correctly | `integration` | `covered` | `tests/heartbeat.test.ts` |
| `AFLOW-002` | `operator -> cron.add -> scheduler` | Add cron task and let it execute | Task is scheduled, runs in isolated session, and durable metadata updates | `server-e2e` | `missing` | `tests/server/automation-e2e.test.ts` |
| `AFLOW-003` | `operator -> cron.run` | Trigger cron task immediately | Fresh run occurs without waiting for wall clock | `workflow` | `missing` | `tests/server/automation-e2e.test.ts` |
| `AFLOW-004` | `external POST -> /webhook/tasks/:slug` | Trigger webhook task over HTTP | Auth, payload framing, run creation, result logging, and metadata updates all succeed | `server-e2e` | `missing` | `tests/server/webhook-endpoints.test.ts` |
| `AFLOW-005` | `automation failure -> retry policy` | First attempt fails and retry policy is enabled | Subsequent attempts are scheduled and final status is correct | `workflow` | `missing` | `tests/server/automation-e2e.test.ts` |
| `AFLOW-006` | `server restart -> scheduler restore` | Restart with cron and webhook tasks configured | Tasks are restored and next runs remain coherent | `recovery` | `partial` | `tests/server/recovery-restart.test.ts` |

## Shipping Rule

Automation is not done until cron, heartbeat, and webhook all have real workflow coverage.
