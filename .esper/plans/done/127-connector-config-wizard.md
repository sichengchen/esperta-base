---
id: 127
title: Onboarding and config wizard for all Chat SDK connectors
status: done
type: feature
priority: 2
phase: 009-chat-sdk-and-agent-tools
branch: feature/009-chat-sdk-and-agent-tools
created: 2026-02-25
shipped_at: 2026-02-26
---
# Onboarding and config wizard for all Chat SDK connectors

## Context

The onboarding wizard (`src/cli/wizard/`) currently has setup steps for Telegram (`TelegramSetup.tsx`) and Discord (`DiscordSetup.tsx`). Each step collects bot tokens and optional IDs, stores them encrypted in `secrets.enc` via `apiKeys`, and is skippable.

The config editor (`src/cli/config/ConnectorSettings.tsx`) allows editing tokens post-setup with masked display and per-connector tool approval mode cycling.

Adding 5 new Chat SDK connectors (Slack, Teams, Google Chat, GitHub, Linear) requires:
1. New wizard steps for each platform's credentials
2. Config editor entries for editing tokens + approval modes
3. Updated confirm step showing all configured connectors

## Approach

### Wizard Steps (create 5 new step components)

Each follows the existing `TelegramSetup.tsx` / `DiscordSetup.tsx` pattern:
- Token input with optional "skip" flow
- "Keep current [K] / Change [C]" for re-runs
- Credential-specific guidance text (where to get the token)

1. **SlackSetup.tsx** — `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET` (required for webhook verification), optional `SLACK_APP_TOKEN` (for Socket Mode)
2. **TeamsSetup.tsx** — `TEAMS_BOT_ID`, `TEAMS_BOT_PASSWORD`, optional `TEAMS_TENANT_ID`
3. **GChatSetup.tsx** — `GOOGLE_CHAT_SERVICE_ACCOUNT` (JSON key file path or paste), webhook URL
4. **GitHubSetup.tsx** — `GITHUB_TOKEN` (PAT or bot token), optional `GITHUB_WEBHOOK_SECRET`
5. **LinearSetup.tsx** — `LINEAR_API_KEY`, optional `LINEAR_WEBHOOK_SECRET`

### Wizard Flow Update

In `Wizard.tsx`:
- Add steps to `Step` union type: `"slack" | "teams" | "gchat" | "github" | "linear"`
- Insert after existing Discord step (before SkillSetup)
- Thread data through `WizardData` interface
- In `handleConfirm`: persist all new tokens to `secrets.enc` via `apiKeys`

### Config Editor Update

In `ConnectorSettings.tsx`:
- Add menu items for each new connector's tokens (masked display)
- Add tool approval mode cycling for: `slack`, `teams`, `gchat`, `github`, `linear`
- Add substeps for editing each token

### Confirm Step Update

In `Confirm.tsx`:
- Show configuration status for all 7 connectors (Telegram, Discord, Slack, Teams, Google Chat, GitHub, Linear)

### Welcome Step Update

In `Welcome.tsx`:
- Update the setup phase count/description to reflect new connectors

## Files to change

- `src/cli/wizard/steps/SlackSetup.tsx` (create — Slack credential setup)
- `src/cli/wizard/steps/TeamsSetup.tsx` (create — Teams credential setup)
- `src/cli/wizard/steps/GChatSetup.tsx` (create — Google Chat credential setup)
- `src/cli/wizard/steps/GitHubSetup.tsx` (create — GitHub credential setup)
- `src/cli/wizard/steps/LinearSetup.tsx` (create — Linear credential setup)
- `src/cli/wizard/Wizard.tsx` (modify — add steps, update flow, update WizardData)
- `src/cli/wizard/steps/Confirm.tsx` (modify — show all connector statuses)
- `src/cli/wizard/steps/Welcome.tsx` (modify — update description)
- `src/cli/config/ConnectorSettings.tsx` (modify — add token editing + approval modes for 5 new connectors)

## Verification

- Run: `bun run typecheck`
- Expected: All wizard steps compile, WizardData includes new fields
- Manual: Run `sa onboard`, step through all connector setup screens, verify tokens saved to `secrets.enc`
- Edge cases: Re-run wizard with existing config (keep/change flow), skip all new connectors, set then clear a token

## Progress
- Created 5 new wizard step components: SlackSetup, TeamsSetup, GChatSetup, GitHubSetup, LinearSetup
- Updated Wizard.tsx: new step flow discord→slack→teams→gchat→github→linear→skills, WizardData fields, persistence
- Updated Confirm.tsx: WizardData interface extended, display sections for all 7 connectors
- Updated ConnectorSettings.tsx: 10 new edit substeps, menu items, handlers, render blocks, approval modes
- Modified: SlackSetup.tsx, TeamsSetup.tsx, GChatSetup.tsx, GitHubSetup.tsx, LinearSetup.tsx, Wizard.tsx, Confirm.tsx, ConnectorSettings.tsx
- Verification: typecheck pass, lint pass, 740 tests pass
