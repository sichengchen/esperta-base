# Target Suite Map

This file maps the documented cases to target automated suites.

| Target suite                                    | Owns cases                                                                                                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tests/server/gateway-http.test.ts`             | `GTW-001` `GTW-002` `GTW-004` `GTW-005` `GTW-010`                                                                                                                  |
| `tests/server/gateway-ws.test.ts`               | `GTW-009` `CHAT-005`                                                                                                                                               |
| `tests/server/webhook-endpoints.test.ts`        | `GTW-008` `AUT-008` `AFLOW-004`                                                                                                                                    |
| `tests/server/aria-chat-e2e.test.ts`            | `RUN-005` `RUN-006` `RUN-007` `CHAT-001` `CHAT-003` `CHAT-004`                                                                                                     |
| `tests/server/automation-e2e.test.ts`           | `AUT-003` `AUT-004` `AUT-005` `AUT-006` `AUT-009` `AFLOW-002` `AFLOW-003` `AFLOW-005`                                                                              |
| `tests/server/connector-flow.test.ts`           | `CON-002` `CON-003` `CON-004` `CON-005` `CON-007` `CON-008` `CFLOW-001` `CFLOW-002` `CFLOW-003` `CFLOW-004` `CFLOW-005`                                            |
| `tests/server/project-workflow-e2e.test.ts`     | `MEM-007` `PRJ-004` `PRJ-005` `PRJ-007` `PRJ-008` `PFLOW-001` `PFLOW-002` `PFLOW-003` `PFLOW-004` `APFLOW-001` `APFLOW-002` `APFLOW-003` `APFLOW-004` `APFLOW-005` |
| `tests/server/recovery-restart.test.ts`         | `GTW-007` `RUN-010` `AUT-010` `OPS-003` `OPS-004` `CHAT-006` `AFLOW-006` `PFLOW-005`                                                                               |
| `tests/server/memory-prompt-e2e.test.ts`        | `MEM-006` `MEM-008`                                                                                                                                                |
| `tests/server/checkpoints-e2e.test.ts`          | `OPS-006`                                                                                                                                                          |
| `tests/server/console-e2e.test.ts`              | `CHAT-007`                                                                                                                                                         |
| `tests/live/server-gateway.test.ts`             | `LIVE-003` `LIVE-004` `LIVE-005` `LIVE-006`                                                                                                                        |
| `tests/live/automation-live.test.ts`            | `LIVE-007` `LIVE-008`                                                                                                                                              |
| `tests/live/project-orchestration-live.test.ts` | `LIVE-009`                                                                                                                                                         |

## Rule

The doc case is the source of truth.

The suite name is not important by itself. What matters is that every documented case has an owned automated suite.
