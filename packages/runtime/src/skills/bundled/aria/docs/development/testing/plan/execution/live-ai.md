# Live AI Coverage

Live AI tests are mandatory whenever model behavior is part of the product contract.

The rule is simple:

- use deterministic or fake models for most contract, integration, workflow, and server-e2e tests
- use real models for the server behaviors that only make sense when the model is actually making decisions

## Assertion Style

Live AI tests must assert:

- event presence and ordering
- tool selection
- approval or question event generation
- durable state changes
- session, run, task, and job identity

Live AI tests must not assert:

- exact prose
- exact token sequence
- exact summary wording

## Required Live Cases

| Case ID | Scope | Scenario | Expected result | Status | Target suite |
| --- | --- | --- | --- | --- | --- |
| `LIVE-001` | agent core | Live single-turn Aria reply | Emits `text_delta`, ends with `done`, no structural error | `covered` | `tests/live/agent-chat.test.ts` |
| `LIVE-002` | agent core | Live tool-use round-trip | Emits `tool_start` and `tool_end` for intended tool | `covered` | `tests/live/agent-chat.test.ts` |
| `LIVE-003` | gateway chat | Live `chat.stream` through server procedure path | Emits stream events with durable event identity | `partial` | `tests/live/procedures.test.ts`, `tests/live/server-gateway.test.ts` |
| `LIVE-004` | approval path | Live dangerous-action prompt causes approval request | Approval event is emitted before tool execution; post-approval execution completes | `missing` | `tests/live/server-gateway.test.ts` |
| `LIVE-005` | question path | Live ambiguous prompt causes user question | Question event is emitted and answering it resumes correctly | `missing` | `tests/live/server-gateway.test.ts` |
| `LIVE-006` | continuity | Live multi-turn thread uses existing session context | Follow-up turn uses prior session state without exact-text matching | `partial` | `tests/live/agent-chat.test.ts`, `tests/live/server-gateway.test.ts` |
| `LIVE-007` | automation | Live cron or heartbeat run executes through automation path | Automation run creates durable records and completes structurally | `missing` | `tests/live/automation-live.test.ts` |
| `LIVE-008` | webhook | Live model handles webhook payload via HTTP endpoint | Endpoint, prompt framing, and response persistence all work with real model | `missing` | `tests/live/automation-live.test.ts` |
| `LIVE-009` | Aria-managed project flow | Live Aria orchestration chooses and drives worker path with deterministic backend | Orchestration flow completes without violating worker boundaries | `missing` | `tests/live/project-orchestration-live.test.ts` |

## Provider Strategy

- use one cheap default provider for standard live runs
- allow provider override through environment variables
- keep alternate provider coverage in a matrix lane, not in every local edit loop

## Shipping Rule

If a workflow depends on live model behavior and only has mocked coverage, it is not done.
