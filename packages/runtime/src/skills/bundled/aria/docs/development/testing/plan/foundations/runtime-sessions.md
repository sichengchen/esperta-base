# Runtime And Sessions

Spec sources:

- [../../../../architecture/runtime/runtime.md](../../../../architecture/runtime/runtime.md)
- [../../../../architecture/runtime/interaction-protocol.md](../../../../architecture/runtime/interaction-protocol.md)
- [../../../../architecture/surfaces/server.md](../../../../architecture/surfaces/server.md)
- [../../../../operator/operations/sessions.md](../../../../operator/operations/sessions.md)

| Case ID   | Feature path                | Scenario                                                   | Expected result                                                                           | Lane          | Status    | Target suite                                     |
| --------- | --------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------- | --------- | ------------------------------------------------ |
| `RUN-001` | `runtime.main-session`      | Server boots with no prior main session                    | Main session is created exactly once and becomes runtime anchor                           | `integration` | `covered` | `tests/heartbeat.test.ts`                        |
| `RUN-002` | `runtime.session.lifecycle` | Create, list, get latest, touch, transfer, destroy session | Session IDs, connector ownership, and timestamps behave per spec                          | `contract`    | `covered` | `tests/sessions.test.ts`                         |
| `RUN-003` | `runtime.chat.history`      | Read history for live session and archived session         | History falls back to archive when in-memory agent is absent                              | `workflow`    | `covered` | `tests/procedures.test.ts`                       |
| `RUN-004` | `runtime.run.lifecycle`     | Create run, record tool calls, finish run                  | Run, tool-call, and stop-reason records persist correctly                                 | `integration` | `covered` | `packages/runtime/src/operational-store.test.ts` |
| `RUN-005` | `runtime.cancel`            | Cancel active run from control surface                     | Active run becomes `cancelled` or `interrupted` and agent aborts cleanly                  | `workflow`    | `partial` | `tests/server/aria-chat-e2e.test.ts`             |
| `RUN-006` | `runtime.approval`          | Dangerous tool triggers approval; user approves or denies  | Approval record persists, decision is enforced, session override works only as documented | `workflow`    | `partial` | `tests/server/aria-chat-e2e.test.ts`             |
| `RUN-007` | `runtime.question`          | Agent asks user question and resumes after answer          | Question persists, answer resumes same run or session context correctly                   | `workflow`    | `missing` | `tests/server/aria-chat-e2e.test.ts`             |
| `RUN-008` | `runtime.event-identity`    | Streamed events from normal and error paths                | Events include stable `threadId`, `sessionId`, `runId`, and agent identity                | `workflow`    | `covered` | `tests/procedures.test.ts`                       |
| `RUN-009` | `runtime.search`            | Search live and archived session content                   | Search returns relevant sessions without violating session ownership rules                | `workflow`    | `covered` | `tests/procedures.test.ts`                       |
| `RUN-010` | `runtime.shutdown`          | Engine shutdown or restart requested while work is active  | Active work is flushed, interrupted state is durable, archives are synced                 | `recovery`    | `partial` | `tests/server/recovery-restart.test.ts`          |

## Notes

- Session and store tests are in good shape.
- Approval, question, cancel, and shutdown still need fuller proof at the real server boundary.
