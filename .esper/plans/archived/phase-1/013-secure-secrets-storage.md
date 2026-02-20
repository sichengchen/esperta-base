---
id: 13
title: Secure secrets storage — encrypted file + wizard persistence
status: done
type: feature
priority: 2
phase: phase-1
branch: feature/phase-1
created: 2026-02-19
shipped_at: 2026-02-19
pr: https://github.com/sichengchen/sa/pull/1
---
# Secure secrets storage — encrypted file + wizard persistence

## Context

Currently SA collects the API key and Telegram bot token during the onboarding wizard but discards them immediately after — only the env var *name* (e.g. `"ANTHROPIC_API_KEY"`) is written to `models.json` and `config.json`. At runtime, `ModelRouter` and `index.ts` read secrets from `process.env`, requiring the user to configure env vars manually in their shell profile or `.env` file.

The wizard has a `WizardData` interface (in `src/wizard/steps/Confirm.tsx`) that already carries `apiKey` and `botToken` fields; they are simply ignored at persistence time in `Wizard.tsx`'s `handleConfirm()`.

Relevant files:
- `src/wizard/steps/Confirm.tsx` — `WizardData` type; `handleConfirm()` writes config files
- `src/wizard/Wizard.tsx` — top-level wizard orchestration
- `src/config/manager.ts` — `ConfigManager` reads/writes `~/.sa/{config,models,identity}.json`
- `src/config/defaults.ts` — default config values
- `src/config/types.ts` — `RuntimeConfig`, `ModelConfig` types
- `src/router/router.ts` — `ModelRouter.getModel()` reads `process.env[cfg.apiKeyEnvVar]`
- `src/index.ts` — reads `process.env[telegramBotTokenEnvVar]` to start Telegram

No encryption library exists yet in `package.json`.

## Approach

### 1. Add a secrets module (`src/config/secrets.ts`)

Use Node's built-in `crypto` module (available in Bun) to implement AES-256-GCM encryption. Derive a machine-specific encryption key from a stable machine identifier (e.g. hostname + a random salt stored alongside the encrypted file). This avoids requiring a passphrase from the user while still protecting the file at rest.

- `encryptSecrets(secrets: SecretsFile): string` — encrypt and return base64 JSON
- `decryptSecrets(raw: string): SecretsFile` — decrypt and return parsed object
- `loadSecrets(homeDir): SecretsFile | null` — read `~/.sa/secrets.enc` if present
- `saveSecrets(homeDir, secrets: SecretsFile): void` — write `~/.sa/secrets.enc` with chmod 600

`SecretsFile` shape:
```typescript
interface SecretsFile {
  apiKeys: Record<string, string>;  // envVarName → raw key
  botToken?: string;
}
```

The salt (not the derived key) is stored in `~/.sa/.salt` (chmod 600) to allow re-deriving the key on any subsequent run on the same machine.

### 2. Extend `ConfigManager`

Add `loadSecrets()` and `saveSecrets(secrets)` methods to `ConfigManager` that delegate to the secrets module.

### 3. Update `Wizard.tsx` — persist secrets on confirm

In `handleConfirm()`, after writing `models.json` and `config.json`, call `configManager.saveSecrets()` with:
- `apiKeys: { [wizardData.apiKeyEnvVar]: wizardData.apiKey }`
- `botToken: wizardData.botToken`

### 4. Update `ModelRouter` — fall back to secrets file

In `ModelRouter.getModel()`, change the secret resolution order:
1. `process.env[cfg.apiKeyEnvVar]` (env var takes precedence — existing behaviour)
2. `secrets.apiKeys[cfg.apiKeyEnvVar]` from the loaded `SecretsFile`
3. Throw with a helpful error message if neither is set

`ModelRouter` should accept an optional `SecretsFile` at load time (passed from `index.ts`).

### 5. Update `index.ts` — fall back to secrets file for bot token

After loading `saConfig`, call `configManager.loadSecrets()`. Resolve the bot token as:
1. `process.env[telegramTokenVar]` (env var takes precedence)
2. `secrets?.botToken`

### 6. Add `src/config/secrets.test.ts`

Unit tests for encrypt/decrypt round-trip and `loadSecrets`/`saveSecrets` with a temp directory.

## Files to change

- `src/config/secrets.ts` (create — encryption/decryption, load/save helpers)
- `src/config/secrets.test.ts` (create — unit tests)
- `src/config/manager.ts` (modify — add `loadSecrets()` / `saveSecrets()` methods)
- `src/config/types.ts` (modify — add `SecretsFile` interface)
- `src/wizard/steps/Confirm.tsx` (modify — call `saveSecrets` in `handleConfirm`)
- `src/router/router.ts` (modify — accept and use `SecretsFile` for key resolution)
- `src/index.ts` (modify — load secrets, pass to router, resolve bot token with fallback)

## Progress
- Milestones: 7 commits
- Modified: src/config/types.ts, src/config/secrets.ts (new), src/config/secrets.test.ts (new), src/config/manager.ts, src/wizard/Wizard.tsx, src/router/router.ts, src/index.ts, tests/router.test.ts
- Verification: not yet run — run /esper:finish to verify and archive

## Verification

- Run: `bun test`
- Expected: all existing tests pass; new `secrets.test.ts` tests pass (round-trip, persistence)
- Manual: run `bun run dev` on a machine with no env vars set → wizard completes → agent starts successfully using stored secrets
- Edge cases:
  - Env var set AND secrets file present → env var wins (regression test)
  - Secrets file missing (fresh install, no wizard yet) → graceful `null`, existing error message
  - Corrupted `secrets.enc` → catch decryption error, log warning, fall back to env var
  - `botToken` absent from secrets → Telegram transport simply skipped (existing behaviour)
