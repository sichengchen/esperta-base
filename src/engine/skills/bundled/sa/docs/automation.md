# Automation

SA supports three automation mechanisms for running agent tasks without manual
intervention: **heartbeat**, **cron**, and **webhook-triggered tasks**. All
three share the same engine infrastructure -- they create isolated agent
sessions, dispatch prompts, and log results to `~/.sa/automation/`.

Configuration lives in `config.json` under `runtime.heartbeat` (for the
heartbeat) and `runtime.automation` (for cron and webhook tasks). The engine
restores persisted tasks on startup so automation survives restarts.

---

## Heartbeat

The heartbeat is an agent-based periodic check that runs in the **main
session** (not an isolated session). Its purpose is lightweight, recurring
health monitoring -- the agent reads a user-defined checklist and either
reports issues or silently suppresses the notification.

### Configuration

Heartbeat settings live in `config.json` at `runtime.heartbeat`:

```json
{
  "runtime": {
    "heartbeat": {
      "enabled": true,
      "intervalMinutes": 30,
      "checklistPath": "HEARTBEAT.md",
      "suppressToken": "HEARTBEAT_OK"
    }
  }
}
```

| Field              | Type    | Default          | Description                                          |
|--------------------|---------|------------------|------------------------------------------------------|
| `enabled`          | boolean | `true`           | Whether the heartbeat agent runs on each cycle       |
| `intervalMinutes`  | number  | `30`             | Minutes between heartbeat checks                     |
| `checklistPath`    | string  | `"HEARTBEAT.md"` | Path to the checklist file, relative to `SA_HOME`    |
| `suppressToken`    | string  | `"HEARTBEAT_OK"` | Exact response that suppresses user notification     |

### How it works

1. The scheduler fires the heartbeat task every `intervalMinutes` minutes
   (cron expression: `*/30 * * * *` for the default 30-minute interval).
2. A health JSON file is written to `~/.sa/engine.heartbeat` on every cycle,
   regardless of whether the agent runs. This file contains `pid`, `memory`
   (heap usage), `timestamp`, and the agent result fields. External monitoring
   tools can watch this file for staleness.
3. If `enabled` is true and a main agent exists, the engine reads
   `~/.sa/HEARTBEAT.md` (or the configured `checklistPath`).
4. The agent receives the checklist with instructions: handle each item, and
   reply with exactly the `suppressToken` if nothing needs attention.
5. **Smart suppression**: if the agent's full response is exactly
   `HEARTBEAT_OK`, the result is marked `suppressed: true` and no
   notification is sent to the user. Any other response is logged and
   delivered.

### Checklist file

Users customize `~/.sa/HEARTBEAT.md` to define what the agent checks. The
default content created on first run:

```markdown
# Heartbeat checklist
- Check if any background tasks have completed -- summarize results
- If idle for 8+ hours, send a brief check-in
```

Add, remove, or edit items at any time. The file is read fresh on each
heartbeat cycle.

### tRPC API

| Procedure             | Type     | Description                                      |
|-----------------------|----------|--------------------------------------------------|
| `heartbeat.status`    | query    | Returns current config and last heartbeat result |
| `heartbeat.update`    | mutation | Update `enabled` and/or `intervalMinutes`        |
| `heartbeat.trigger`   | mutation | Manually trigger a heartbeat check immediately   |

### HTTP endpoint

```
POST /webhook/heartbeat
Authorization: Bearer <token>
```

Triggers the heartbeat immediately via the webhook connector. Requires the
webhook connector to be enabled (`runtime.webhook.enabled: true`) and a valid
bearer token.

---

## Cron dispatch

User-defined scheduled tasks that run on standard 5-field cron expressions.
Each task dispatches a prompt to a fresh, isolated agent session.

### Adding a task

Tasks are managed via the `cron` tRPC router:

```typescript
// Add a daily summary task at 9:00 AM
await client.cron.add.mutate({
  name: "daily-summary",
  schedule: "0 9 * * *",
  prompt: "Summarize yesterday's activity and list any pending items.",
});
```

| Field      | Type    | Required | Description                                    |
|------------|---------|----------|------------------------------------------------|
| `name`     | string  | yes      | Unique task identifier                         |
| `schedule` | string  | yes      | 5-field cron expression (minute hour day month weekday) |
| `prompt`   | string  | yes      | Prompt sent to the agent                       |
| `oneShot`  | boolean | no       | Auto-remove after first execution              |
| `model`    | string  | no       | Model override for this task                   |

### Cron expression syntax

Standard 5-field format: `minute hour day month weekday`

- `*` -- matches any value
- `*/N` -- step syntax (every N units)
- `1,15,30` -- comma-separated specific values

Examples:
- `0 9 * * *` -- daily at 09:00
- `*/15 * * * *` -- every 15 minutes
- `0 0 1 * *` -- first day of each month at midnight
- `30 17 * * 1,5` -- Monday and Friday at 17:30

### Session isolation

Each cron execution creates a dedicated session with the ID format
`cron:<taskName>`. A fresh agent instance is created for each run, so tasks
do not share message history or state with each other or with the main
session.

### One-shot tasks

Setting `oneShot: true` causes the task to auto-unregister after its first
execution. The task is also removed from `config.json` persistence via the
`onComplete` callback. This is useful for delayed one-time tasks (e.g.,
"remind me in 2 hours").

### Persistence

Tasks are persisted in `config.json` at `runtime.automation.cronTasks`:

```json
{
  "runtime": {
    "automation": {
      "cronTasks": [
        {
          "name": "daily-summary",
          "schedule": "0 9 * * *",
          "prompt": "Summarize yesterday's activity.",
          "enabled": true,
          "oneShot": false
        }
      ]
    }
  }
}
```

On engine startup, all persisted cron tasks with `enabled: true` are
re-registered with the scheduler. This means tasks survive engine restarts.

### Result logging

Each execution writes a Markdown log file to `~/.sa/automation/`:

```
~/.sa/automation/daily-summary-2026-02-22T09-00-00-000Z.md
```

The log contains the prompt, the agent's response, and any tool calls made
during execution.

### tRPC API

| Procedure    | Type     | Description                                 |
|--------------|----------|---------------------------------------------|
| `cron.list`  | query    | List all registered tasks (built-in + user) |
| `cron.add`   | mutation | Add a new scheduled task                    |
| `cron.remove` | mutation | Remove a user-defined task by name         |

Built-in tasks (like the heartbeat) cannot be removed via `cron.remove`.

---

## Webhook-triggered tasks

Event-driven automation tasks triggered by HTTP POST requests from external
systems. Each task has a unique URL slug and a prompt template with payload
interpolation.

### Defining a task

```typescript
await client.webhookTask.add.mutate({
  name: "GitHub PR Review",
  slug: "gh-pr-review",
  prompt: "A GitHub event was received. Analyze the payload and summarize: {{payload}}",
  enabled: true,
  connector: "telegram",
});
```

| Field       | Type    | Required | Description                                          |
|-------------|---------|----------|------------------------------------------------------|
| `name`      | string  | yes      | Human-readable task name                             |
| `slug`      | string  | yes      | URL slug (alphanumeric, hyphens, underscores only)   |
| `prompt`    | string  | yes      | Prompt template; `{{payload}}` is replaced with the request body |
| `enabled`   | boolean | yes      | Whether the task is active                           |
| `model`     | string  | no       | Model override for this task                         |
| `connector` | string  | no       | Connector to deliver the response through (e.g., `"telegram"`, `"discord"`) |

### HTTP endpoint

```
POST /webhook/tasks/<slug>
Authorization: Bearer <token>
Content-Type: application/json

{ "action": "opened", "pull_request": { "title": "..." } }
```

The endpoint requires:
- The webhook connector to be enabled (`runtime.webhook.enabled: true`)
- A valid bearer token in the `Authorization` header
- The slug to match an enabled webhook task

### Prompt interpolation

The `{{payload}}` placeholder in the prompt template is replaced with the
JSON-serialized request body. Payloads larger than 10,000 characters are
truncated with a `...(truncated)` suffix. If the request has no body or
invalid JSON, the payload defaults to `"{}"`.

### Connector delivery

When a `connector` field is set on the task, the engine uses the `notify`
tool to push the agent's response to the specified connector after execution.
This enables patterns like: GitHub sends a webhook to SA, SA analyzes it, and
the result is delivered to your Telegram chat.

Notification failure is non-fatal -- the HTTP response still returns the
agent's output.

### Session isolation

Each webhook execution creates a session with ID `webhook:<slug>`. Like cron
tasks, each run gets a fresh agent with no shared history.

### Result logging

Execution logs are written to `~/.sa/automation/`:

```
~/.sa/automation/webhook-gh-pr-review-2026-02-22T14-30-00-000Z.log
```

### Persistence

Webhook tasks are persisted in `config.json` at
`runtime.automation.webhookTasks`:

```json
{
  "runtime": {
    "automation": {
      "webhookTasks": [
        {
          "name": "GitHub PR Review",
          "slug": "gh-pr-review",
          "prompt": "Analyze: {{payload}}",
          "enabled": true,
          "connector": "telegram"
        }
      ]
    }
  }
}
```

### tRPC API

| Procedure              | Type     | Description                    |
|------------------------|----------|--------------------------------|
| `webhookTask.list`     | query    | List all webhook tasks         |
| `webhookTask.add`      | mutation | Add a new webhook task         |
| `webhookTask.update`   | mutation | Update an existing task by slug |
| `webhookTask.remove`   | mutation | Remove a task by slug          |

---

## Authentication

Both webhook endpoints (`/webhook/tasks/:slug` and `/webhook/heartbeat`) use
bearer token authentication. The token is configured at
`runtime.webhook.token` in `config.json`:

```json
{
  "runtime": {
    "webhook": {
      "enabled": true,
      "token": "your-secret-token"
    }
  }
}
```

Requests must include the header:

```
Authorization: Bearer your-secret-token
```

Token comparison uses a constant-time safe comparison function to prevent
timing attacks.

---

## Decision guide

| Mechanism | Trigger       | Session        | Best for                                      |
|-----------|---------------|----------------|-----------------------------------------------|
| Heartbeat | Timer (periodic) | Main session | Periodic monitoring, status checks, idle check-ins |
| Cron      | Timer (scheduled) | Isolated (`cron:<name>`) | Scheduled recurring tasks -- daily reports, cleanup, reminders |
| Webhook   | HTTP POST     | Isolated (`webhook:<slug>`) | Event-driven from external systems -- GitHub, CI/CD, monitoring alerts |

**Use heartbeat** when you need a lightweight, always-on monitor that checks a
customizable list of conditions. The checklist-based approach means you can
adjust what gets checked without modifying any code or configuration beyond
editing a Markdown file. The smart suppression mechanism keeps noise low.

**Use cron** when you need tasks to run on a predictable schedule. Each task
gets its own agent session, so cron tasks can be more complex (multi-step,
tool-using) without interfering with each other or the main session. The
one-shot option also makes cron suitable for delayed single-execution tasks.

**Use webhooks** when the trigger originates from an external system. The
`{{payload}}` interpolation gives the agent full context about the external
event, and the optional connector delivery means you can receive the analysis
wherever you prefer (Telegram, Discord) without checking the SA logs.
