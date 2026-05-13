# Glossary

| Term                 | Meaning                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Aria Node Runtime`  | Shared runtime used by Desktop and Headless. Hosts Gateway, Kernel, domain engines, Aria Agent, capability control, sandboxing, storage, and outbox delivery. |
| `Desktop Package`    | Desktop UI plus local Aria Node Runtime and node supervision.                                                                                                 |
| `Headless Package`   | Service-managed Aria Node Runtime without Desktop UI.                                                                                                         |
| `Mobile Client`      | Remote client for an existing node. Never hosts Aria Agent or local execution.                                                                                |
| `Gateway`            | The only Aria-owned access boundary. Owns pairing, auth, authorization, command/query/event APIs, and gateway audit events.                                   |
| `Application Kernel` | Coordinator for commands, transactions, idempotency, workflow tasks, domain events, outbox, and persistence.                                                  |
| `Domain Engine`      | Product-state owner such as Threads and Runs, Projects and Jobs, Workspace, Memory, Automation, Connectors, Approvals, or Identity.                           |
| `Aria Agent`         | Node-hosted reasoning participant. Produces assistant output and ToolIntent records; does not execute side effects directly.                                  |
| `ToolIntent`         | Persistent proposal from Aria Agent or a runtime workflow to perform a tool action.                                                                           |
| `Capability Broker`  | Classifies tool intents, checks policy, coordinates approval if required, creates scoped grants, and sends execution to Sandbox Manager.                      |
| `Policy`             | Decides only `allow`, `ask`, or `deny`. It does not select sandbox providers.                                                                                 |
| `ApprovalRequest`    | Simple user-facing request to permit or deny one action.                                                                                                      |
| `Sandbox Manager`    | Executes tools through the configured provider and records execution results and audit.                                                                       |
| `justbash`           | Default sandbox provider. Unsupported actions must fail clearly instead of escaping to host execution.                                                        |
| `Run`                | One execution attempt inside a thread. Chat, project work, automation work, connector-triggered work, and API-triggered work all become runs.                 |
| `Job`                | Durable unit of long-running project work.                                                                                                                    |
| `Artifact`           | Generated file, patch, report, log, diff, or review object.                                                                                                   |
| `Outbox`             | Durable delivery queue for notifications, connector replies, webhook callbacks, and sync messages.                                                            |
