# CLI Commands & TUI

Public CLI identity: `aria`.

## Core Commands

| Command           | Purpose                                          |
| ----------------- | ------------------------------------------------ |
| `aria`            | Start the runtime if needed and open the TUI     |
| `aria onboard`    | Run the onboarding wizard                        |
| `aria config`     | Open the interactive configuration editor        |
| `aria automation` | Inspect durable automation tasks and runs        |
| `aria audit`      | Inspect the runtime audit log                    |
| `aria memory`     | Inspect layered memory and memory search results |
| `aria engine ...` | Manage runtime lifecycle                         |
| `aria stop`       | Cancel all currently running agent work          |
| `aria restart`    | Restart Aria Runtime                             |
| `aria shutdown`   | Stop Aria Runtime gracefully                     |

## Projects Commands

`aria projects` is the tracked-work operator surface over `packages/work`, `packages/workspaces`, `packages/jobs`, and `packages/handoff`.

Current commands include:

- inspection: `projects`, `repos`, `tasks`, `threads`, `dispatches`, `worktrees`, `refs`, `handoffs`
- planning: `runnable`, `queue`, `backends`, `run-dispatch`
- mutation: `project-create`, `repo-register`, `task-create`, `task-status`, `thread-create`, `job-add`, `dispatch-create`
- workflow: `worktree-register`, `worktree-retain`, `worktree-prune`, `review-create`, `review-resolve`, `publish-create`, `publish-complete`
- handoff: `handoff-submit`, `handoff-process`

This command surface now covers real tracked-work mutation, not just inspection.

## Gateway Commands

`aria gateway` is the operator surface for secure gateway access.

Current commands include:

- `status`
- `pair-code`

## Connector Commands

Configured connectors auto-start with `Aria Server` when their credentials are present.
The CLI commands below remain useful when you want to run a connector explicitly for debugging
or as a standalone surface:

- `aria telegram`
- `aria discord`
- `aria slack [webhook [port]|socket]`
- `aria teams`
- `aria gchat`
- `aria github`
- `aria linear`
- `aria wechat [start|login]`

## Client Slash Commands

Slash commands are cross-client runtime commands. Clients may offer suggestions
or compact UI for them, but command meaning belongs to the shared Aria Runtime
and gateway path rather than to one surface.

Important slash commands remain:

- `/new`
- `/init`
- `/plan <task>`
- `/rename <session title>`
- `/review [target]`
- `/security-review [target]`
- `/stop`
- `/restart`
- `/shutdown`
- `/status`
- `/model <name>`
- `/sessions`
- `/archives`
- `/search <query>`
- `/history <id>`
- `/automation`
- `/approvals`
- `/memory`
- `/audit`
- `/rollback`

## Runtime Pairing

CLI and connectors pair with the runtime using the gateway auth flow rather than owning separate execution state. Pairing code issuance should happen from a local/admin surface such as `aria gateway pair-code`, not from a public unauthenticated API. The CLI remains an operator surface, not a second runtime.
