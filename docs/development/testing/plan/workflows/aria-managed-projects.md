# Workflow: Aria-Managed Projects

Primary spec:

- [../../../../architecture/surfaces/server.md](../../../../architecture/surfaces/server.md)
- [../../../../architecture/core/overview.md](../../../../architecture/core/overview.md)

| Case ID      | Workflow path                    | Scenario                                                            | Expected result                                                                     | Lane       | Status    | Target suite                                |
| ------------ | -------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------- | --------- | ------------------------------------------- |
| `APFLOW-001` | `aria-agent -> projects control` | User asks Aria to manage a project                                  | Aria orchestrates through `Projects Control`, not by collapsing into worker runtime | `workflow` | `missing` | `tests/server/project-workflow-e2e.test.ts` |
| `APFLOW-002` | `aria-agent -> remote target`    | Aria selects remote execution target                                | Remote dispatch is created and summary is linked back to Aria thread                | `workflow` | `missing` | `tests/server/project-workflow-e2e.test.ts` |
| `APFLOW-003` | `aria-agent -> local bridge`     | Aria selects local execution target                                 | Local execution is allowed only when explicit bridge attachment exists              | `workflow` | `missing` | `tests/server/project-workflow-e2e.test.ts` |
| `APFLOW-004` | `worker result -> aria summary`  | Worker completes and Aria summarizes next step                      | Aria thread retains orchestration ownership while worker owns concrete execution    | `workflow` | `missing` | `tests/server/project-workflow-e2e.test.ts` |
| `APFLOW-005` | `boundary enforcement`           | Remote coding agent tries to use Aria memory or automation directly | Access is blocked because worker boundaries remain explicit                         | `workflow` | `missing` | `tests/server/project-workflow-e2e.test.ts` |

## Shipping Rule

This workflow is central to the architecture. It must be tested as an explicit orchestration flow, not inferred from unrelated project-service tests.
