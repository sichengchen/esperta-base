# Configuration

Esperta Aria stores node state under `~/.aria/` unless `ARIA_HOME` overrides it.

## Target Layout

```text
ARIA_HOME/
  node/
    config.json
    node-id.json
    gateway.json

  data/
    aria.sqlite
    events.sqlite
    read-models.sqlite

  workspaces/
    project-a/
    project-b/

  artifacts/
    runs/
    jobs/

  secrets/
    encrypted-secrets.db

  logs/
    node.log
    gateway.log
    tools.log
```

## Node Config

```toml
[node]
id = "node-id"
name = "My Aria Node"

[gateway]
enabled = true
bind = "127.0.0.1"
port = 0

[sandbox]
provider = "justbash"

[automation]
enabled = true

[connectors]
enabled = true
```

## Project Config

```toml
[project]
id = "project-id"
name = "example-project"

[sandbox]
provider = "justbash"
```

## Run-Level Override

```json
{
  "runId": "run-id",
  "sandboxProvider": "justbash"
}
```

Run-level override is an explicit user or API choice. It is not selected by
policy.

## Environment Variables

Common variables:

| Variable                  | Purpose                                                                   |
| ------------------------- | ------------------------------------------------------------------------- |
| `ARIA_HOME`               | Override runtime home.                                                    |
| `ARIA_ENGINE_PORT`        | Override local development gateway port where supported during migration. |
| provider API keys         | Model provider authentication.                                            |
| connector-specific tokens | Connector authentication owned by the hosting node.                       |

Secrets should be stored as node-owned secret handles, not embedded in prompts
or client state.
