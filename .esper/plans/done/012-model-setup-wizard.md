---
id: 12
title: Model setup wizard — provider picker + model list
status: done
type: feature
priority: 1
phase: phase-1
branch: feature/phase-1
created: 2026-02-19
shipped_at: 2026-02-19
---
# Model setup wizard — provider picker + model list

## Context

The current `ModelSetup.tsx` wizard step is a simple 2-substep flow: pick from a hard-coded list of 3 providers (Anthropic / OpenAI / Google) and enter an API key. It pre-selects a default model with no visibility or choice for the user.

This plan replaces that step with a richer 4-substep interactive flow:
1. Choose provider type (official + OpenAI-compatible)
2. Enter credentials (key; base URL + custom name for OpenAI-compat)
3. Fetch available models from the provider's API; show them for selection
4. Choose (or confirm) the default model — with manual fallback if fetch fails

Relevant files from exploration:
- `src/wizard/steps/ModelSetup.tsx` — current 2-substep component, completely replaced
- `src/wizard/Wizard.tsx` — manages `WizardData` and writes `models.json`; needs `baseUrl?` in the data shape
- `src/router/types.ts` — `ModelConfig` needs an optional `baseUrl?` field for OpenAI-compatible
- `src/router/router.ts` — `getModel()` passes `provider + model` to pi-ai; needs to handle `baseUrl`

**Risk:** `@mariozechner/pi-ai`'s `getModel()` currently takes `(provider, model)` only. Supporting OpenAI-compatible base URLs may require inspecting the pi-ai API or falling back to passing the base URL via environment variable / custom `apiKeyEnvVar` workaround. Investigate during implementation and document the approach chosen.

## Approach

### Step 1 — Add `baseUrl?` to `ModelConfig` and update router

In `src/router/types.ts`, add:
```typescript
baseUrl?: string;  // for OpenAI-compatible providers
```

In `src/router/router.ts`, update `getModel()` to pass `baseUrl` if present:
- Check if pi-ai's `getModel` accepts options; if not, look at alternatives (e.g., constructing an OpenAI SDK instance manually or using an env var workaround).
- Document the chosen approach in a comment.

### Step 2 — Rewrite `ModelSetup.tsx`

Replace the file with a multi-substep Ink component. Internal substep state machine:

```
"provider" → "credentials" → "fetching" → "model" → done
```

**Substep: `provider`**
Four options (arrow keys to select, Enter to confirm):
- `Anthropic (official)` — provider: `"anthropic"`, apiKeyEnvVar: `ANTHROPIC_API_KEY`
- `OpenAI (official)` — provider: `"openai"`, apiKeyEnvVar: `OPENAI_API_KEY`
- `Google (official)` — provider: `"google"`, apiKeyEnvVar: `GOOGLE_AI_API_KEY`
- `OpenAI compatible` — provider: `"openai"`, user-supplied name, baseUrl, and apiKeyEnvVar

**Substep: `credentials`**
For official providers: single API key text input (masked with `•`).
For OpenAI-compatible: three sequential text fields:
1. Display name (e.g., `openrouter`) → determines config `name` and `apiKeyEnvVar` (auto-derived: `NAME_UPPER_API_KEY`)
2. Base URL (e.g., `https://openrouter.ai/api/v1`)
3. API key (masked)
Navigate fields with Enter; Esc goes back to substep `provider`.

**Substep: `fetching`** (auto-advance, no user input)
Fire a `fetch()` call to the provider's model-list endpoint using the entered key:
- Anthropic: `GET https://api.anthropic.com/v1/models` — header `x-api-key: <key>`, `anthropic-version: 2023-06-01` — response: `{ data: [{ id }] }`
- OpenAI / OpenAI-compat: `GET {baseUrl}/v1/models` (or `{baseUrl}/models`) — header `Authorization: Bearer <key>` — response: `{ data: [{ id }] }`
- Google: `GET https://generativelanguage.googleapis.com/v1beta/models?key=<key>` — response: `{ models: [{ name }] }` (strip `models/` prefix)

On success → advance to `model` substep with the list.
On error → advance to `model` substep with empty list + error message (user types model ID manually).

**Substep: `model`**
If model list is non-empty: scrollable arrow-key selection (same pattern as `Identity.tsx` uses for field navigation). Show model IDs. Enter to confirm.
If empty (fetch failed or list was empty): show error message in dim text + a text input for manual model ID entry.

On completion, call `onNext` with the final `ModelSetupData`.

**Updated `ModelSetupData` interface:**
```typescript
interface ModelSetupData {
  name: string;       // config display name (e.g., "anthropic", custom name)
  provider: string;   // pi-ai provider string
  model: string;      // model ID
  apiKeyEnvVar: string;
  apiKey: string;
  baseUrl?: string;   // OpenAI-compatible only
}
```

### Step 3 — Update `Wizard.tsx`

- Extend `WizardData` with `name` and optional `baseUrl` fields.
- In `handleModelDone`, write the `ModelConfig` to `models.json` including `baseUrl` if present.

## Files to change

- `src/wizard/steps/ModelSetup.tsx` (modify — complete rewrite)
- `src/wizard/Wizard.tsx` (modify — extend WizardData, pass baseUrl to models.json write)
- `src/router/types.ts` (modify — add `baseUrl?: string` to ModelConfig)
- `src/router/router.ts` (modify — handle baseUrl when constructing OpenAI-compatible models)

## Verification

- Run: `bun test` + manual
- Expected: All 76 existing tests still pass. Manual: run `bun run dev --setup`, step through wizard — all four provider paths complete without error; models.json is written correctly with name, provider, model, apiKeyEnvVar, and baseUrl (where applicable).
- Edge cases:
  - Fetch fails (bad key, no network) → model substep shows error + manual input accepts text → wizard completes
  - OpenAI-compatible with unusual base URLs (trailing slash, no `/v1` suffix) → handle both `/models` and `/v1/models` attempt
  - Empty model name input in manual fallback → do not advance until non-empty
  - Long model lists → scrolling selection doesn't overflow terminal height (cap visible rows at ~8, show scroll hints)

## Progress
- Milestones: 3 commits
- Modified: src/router/types.ts, src/router/router.ts, src/wizard/steps/ModelSetup.tsx, src/wizard/steps/Confirm.tsx, src/wizard/Wizard.tsx
- pi-ai baseUrl support: pi-ai's `Model<TApi>` has a `baseUrl` field; for custom providers we construct the Model object manually (no workaround needed)
- Verification: not yet run — run /esper:finish to verify and archive
