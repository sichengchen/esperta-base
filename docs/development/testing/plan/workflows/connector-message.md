# Workflow: Connector Message

Primary spec:

- [../../../../architecture/surfaces/server.md](../../../../architecture/surfaces/server.md)
- [../../../../architecture/core/overview.md](../../../../architecture/core/overview.md)

| Case ID     | Workflow path                                          | Scenario                                               | Expected result                                                                | Lane         | Status    | Target suite                                                            |
| ----------- | ------------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------ | --------- | ----------------------------------------------------------------------- |
| `CFLOW-001` | `connector inbound -> connector runtime -> aria-agent` | First inbound connector message                        | Connector session is created with correct ownership and thread identity        | `server-e2e` | `missing` | `tests/server/connector-flow.test.ts`                                   |
| `CFLOW-002` | `connector inbound -> existing connector session`      | Follow-up connector message                            | Existing connector session is resumed rather than mis-routed to another thread | `server-e2e` | `missing` | `tests/server/connector-flow.test.ts`                                   |
| `CFLOW-003` | `aria-agent -> connector outbound`                     | Normal assistant response returns to connector         | Outbound formatting, chunking, and IM filtering are correct                    | `workflow`   | `partial` | `tests/chat-sdk-adapter.test.ts`, `tests/server/connector-flow.test.ts` |
| `CFLOW-004` | `connector reply -> approval resolution`               | Connector user approves or denies pending tool request | Approval is resolved against the correct pending item and run                  | `workflow`   | `partial` | `tests/chat-sdk-adapter.test.ts`, `tests/server/connector-flow.test.ts` |
| `CFLOW-005` | `connector reply -> question answer`                   | Connector user answers pending question                | Correct question is answered and run continues or completes correctly          | `workflow`   | `partial` | `tests/chat-sdk-adapter.test.ts`, `tests/server/connector-flow.test.ts` |
| `CFLOW-006` | `connector auth -> gateway/runtime`                    | Connector token tries to access foreign sessions       | Foreign access is blocked and audit log captures the auth boundary             | `workflow`   | `covered` | `tests/procedures.test.ts`                                              |

## Shipping Rule

Connector support is not done when adapter helpers pass. It is done when inbound and outbound behavior work against the server-owned session model.
