# Configuration

SA stores all configuration in a directory on your machine. By default this is `~/.sa/`. You can override the location with the `SA_HOME` environment variable.

## Environment variables

Set these in your shell or in a `.env` file at the project root (see `.env.example`).

| Variable             | Required | Description                        |
|----------------------|----------|------------------------------------|
| `ANTHROPIC_API_KEY`  | If using Anthropic | Anthropic API key        |
| `OPENAI_API_KEY`     | If using OpenAI    | OpenAI API key           |
| `GOOGLE_AI_API_KEY`  | If using Google    | Google AI API key        |
| `TELEGRAM_BOT_TOKEN` | No       | Telegram bot token (enables bot)   |
| `SA_HOME`            | No       | Override config directory location |

## Config directory layout

```
~/.sa/
  IDENTITY.md    # agent identity and personality
  config.json    # runtime settings
  models.json    # model configurations
  memory/        # persistent memory (one file per key)
```

## IDENTITY.md

Defines who the agent is. Edited manually or via the onboarding wizard.

```markdown
# Agent Name

## Personality
A short description of how the agent should behave and communicate.

## System Prompt
The literal text injected as the system prompt for every conversation.
```

## config.json

Runtime settings. Edited manually or updated by the agent at runtime.

```json
{
  "activeModel": "sonnet",
  "telegramBotTokenEnvVar": "TELEGRAM_BOT_TOKEN",
  "memory": {
    "enabled": true,
    "directory": "memory"
  }
}
```

| Field                  | Type    | Description                                                  |
|------------------------|---------|--------------------------------------------------------------|
| `activeModel`          | string  | Name of the active model config (must match a name in `models.json`) |
| `telegramBotTokenEnvVar` | string | Name of the env var that holds the Telegram bot token      |
| `memory.enabled`       | boolean | Whether long-term memory is active                           |
| `memory.directory`     | string  | Path to the memory directory, relative to `SA_HOME`          |

## models.json

Defines available LLM model configurations. You can add as many as you like and switch between them at runtime from the TUI.

```json
{
  "default": "sonnet",
  "models": [
    {
      "name": "sonnet",
      "provider": "anthropic",
      "model": "claude-sonnet-4-5-20250514",
      "apiKeyEnvVar": "ANTHROPIC_API_KEY",
      "temperature": 0.7,
      "maxTokens": 8192
    }
  ]
}
```

| Field         | Type   | Required | Description                                                 |
|---------------|--------|----------|-------------------------------------------------------------|
| `name`        | string | Yes      | Unique display name used to refer to this config            |
| `provider`    | string | Yes      | LLM provider: `"anthropic"`, `"openai"`, `"google"`, etc.  |
| `model`       | string | Yes      | Provider-specific model ID                                  |
| `apiKeyEnvVar`| string | Yes      | Name of the env var that holds the API key for this provider|
| `temperature` | number | No       | Sampling temperature (0–2)                                  |
| `maxTokens`   | number | No       | Maximum output tokens per response                          |

The `default` field at the top level sets which model is used on startup if `config.json` doesn't specify one.
