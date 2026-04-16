# Connectors

Spec sources:

- [../../../../architecture/surfaces/server.md](../../../../architecture/surfaces/server.md)
- [../../../../architecture/core/overview.md](../../../../architecture/core/overview.md)
- [../../../../architecture/runtime/interaction-protocol.md](../../../../architecture/runtime/interaction-protocol.md)

| Case ID | Feature path | Scenario | Expected result | Lane | Status | Target suite |
| --- | --- | --- | --- | --- | --- | --- |
| `CON-001` | `connectors.session-scope` | Connector token creates and accesses only its own sessions | Cross-connector access is rejected | `workflow` | `covered` | `tests/procedures.test.ts` |
| `CON-002` | `connectors.inbound-normalization` | Inbound IM message becomes connector-owned Aria thread input | Session prefix, connector type, and ownership are preserved | `server-e2e` | `missing` | `tests/server/connector-flow.test.ts` |
| `CON-003` | `connectors.output-filtering` | Same Aria run is viewed through IM surface | IM surface receives filtered or reformatted events without semantic drift | `workflow` | `partial` | `tests/chat-sdk-adapter.test.ts`, `tests/server/connector-flow.test.ts` |
| `CON-004` | `connectors.approval-reply` | Connector replies to pending approval through short command path | Approval is resolved against the correct tool call and session | `workflow` | `partial` | `tests/chat-sdk-adapter.test.ts` |
| `CON-005` | `connectors.question-reply` | Connector answers pending question with numbered or free-text reply | Correct answer is bound to the right pending question and session | `workflow` | `partial` | `tests/chat-sdk-adapter.test.ts` |
| `CON-006` | `connectors.chunking-formatting` | Connector formats long streamed output and tool results | Output stays within platform limits and remains readable | `integration` | `partial` | `tests/telegram.test.ts`, `tests/stream-handler.test.ts` |
| `CON-007` | `connectors.delivery` | Automation or notify tool delivers to connector target | Delivery reaches target connector and reports delivery status back to server state | `workflow` | `missing` | `tests/server/connector-flow.test.ts` |
| `CON-008` | `connectors.boundary-rule` | IM connector attempts to bind to local project thread | Binding is rejected because connectors are server-owned Aria flows only | `contract` | `missing` | `tests/server/connector-flow.test.ts` |

## Notes

- Adapter-level tests exist.
- Full connector ingress and egress still need proof from the server boundary.
