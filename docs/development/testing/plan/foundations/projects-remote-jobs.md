# Projects And Remote Jobs

Spec sources:

- [../../../../architecture/surfaces/server.md](../../../../architecture/surfaces/server.md)
- [../../../../architecture/core/overview.md](../../../../architecture/core/overview.md)
- [../../../../architecture/core/domain-model.md](../../../../architecture/core/domain-model.md)

| Case ID | Feature path | Scenario | Expected result | Lane | Status | Target suite |
| --- | --- | --- | --- | --- | --- | --- |
| `PRJ-001` | `projects.registry` | Persist server, workspace, project, environment, and binding hierarchy | Canonical execution hierarchy is durable and queryable | `integration` | `covered` | `tests/projects-workflows.test.ts` |
| `PRJ-002` | `projects.environment-switch` | Switch active environment for a project thread | Binding history persists without losing thread identity | `integration` | `covered` | `tests/projects-workflows.test.ts` |
| `PRJ-003` | `projects.dispatch.lifecycle` | Remote dispatch runs through worker backend | Running, waiting-approval, completed, and failed states flow back into project records | `integration` | `covered` | `tests/dispatch-runner.test.ts` |
| `PRJ-004` | `projects.remote-thread-open` | Open remote project thread through server boundary | Active environment and remote thread metadata are resolved correctly | `server-e2e` | `missing` | `tests/server/project-workflow-e2e.test.ts` |
| `PRJ-005` | `projects.remote-cancel-resume` | Cancel remote job and later reconnect to thread | Cancellation is durable and reconnect preserves thread identity | `server-e2e` | `missing` | `tests/server/project-workflow-e2e.test.ts` |
| `PRJ-006` | `projects.handoff.idempotent` | Aria-managed handoff materialization runs twice | Thread, job, and queued dispatch records remain idempotent | `integration` | `covered` | `tests/projects-workflows.test.ts` |
| `PRJ-007` | `projects.local-bridge-explicit` | Aria chooses local execution only when explicit desktop bridge is attached | Local bridge use is explicit and never implicit | `workflow` | `missing` | `tests/server/project-workflow-e2e.test.ts` |
| `PRJ-008` | `projects.boundary-rule` | Remote coding agent attempts direct Aria memory or automation access | Access is blocked by architecture boundary | `workflow` | `missing` | `tests/server/project-workflow-e2e.test.ts` |

## Notes

- Project services are already relatively well modeled.
- The missing area is the full server-hosted workflow boundary: open thread, dispatch, cancel, reconnect, and boundary isolation.
