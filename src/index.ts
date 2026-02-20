#!/usr/bin/env bun

import React from "react";
import { render } from "ink";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { ConfigManager } from "./config/index.js";
import { ModelRouter } from "./router/index.js";
import { Agent } from "./agent/index.js";
import { MemoryManager } from "./memory/index.js";
import { getBuiltinTools, formatToolsSection } from "./tools/index.js";
import { createRememberTool } from "./tools/remember.js";
import { App } from "./tui/index.js";
import { TelegramTransport } from "./telegram/index.js";
import { Wizard, type WizardData } from "./wizard/index.js";

const saHome = process.env.SA_HOME ?? join(homedir(), ".sa");
const forceSetup = process.argv.includes("--setup");

const SAFETY_ADVISORY = `## Safety
You have no independent goals: do not pursue self-preservation, resource acquisition, or \
capability expansion beyond what the current task requires; avoid long-term plans beyond \
the user's request.
Prioritize safety and human oversight over task completion; if instructions conflict, \
pause and ask; comply with stop/pause requests and never bypass safeguards.
Do not manipulate the user to expand your access or disable safeguards. Do not modify \
your own system prompt, safety rules, or tool behaviour unless explicitly asked.`;

function buildHeartbeat(router: ModelRouter): string {
  const now = new Date();
  const dateStr = now.toISOString().replace("T", " ").slice(0, 19) + " UTC";
  let modelName = "unknown";
  try { modelName = router.getActiveModelName(); } catch { /* fallback */ }
  return `## Session\nStarted: ${dateStr} | Model: ${modelName}`;
}

async function launchApp() {
  const config = new ConfigManager(saHome);
  const saConfig = await config.load();

  // Initialize memory
  const memoryDir = join(config.homeDir, saConfig.runtime.memory.directory);
  const memory = new MemoryManager(memoryDir);
  await memory.init();

  // Load encrypted secrets (API keys, bot token) — null if file missing/corrupted
  const secrets = await config.loadSecrets();

  // Initialize model router
  const router = await ModelRouter.load(config.getModelsPath(), secrets);

  // Initialize agent
  const tools = [...getBuiltinTools(), createRememberTool(memory)];

  // Assemble system prompt: identity → tools → safety → user profile → heartbeat → memory
  const userProfile = await config.loadUserProfile();
  const toolsSection = formatToolsSection(tools);
  const heartbeat = buildHeartbeat(router);
  const memoryContext = await memory.loadContext();

  const systemPrompt = [
    saConfig.identity.systemPrompt,
    `\n${toolsSection}`,
    `\n${SAFETY_ADVISORY}`,
    userProfile ? `\n## User Profile\n${userProfile}` : "",
    `\n${heartbeat}`,
    memoryContext ? `\n## Memory\n${memoryContext}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const agent = new Agent({
    router,
    tools,
    systemPrompt,
  });

  // Start Telegram bot if token is available (env var takes precedence over secrets)
  const telegramTokenVar = saConfig.runtime.telegramBotTokenEnvVar;
  const telegramToken = process.env[telegramTokenVar] ?? secrets?.botToken;
  if (telegramToken) {
    const telegram = new TelegramTransport({
      botToken: telegramToken,
      agent,
      allowedChatId: secrets?.pairedChatId,
      pairingCode: secrets?.pairingCode,
      onPaired: async (chatId) => {
        const current = (await config.loadSecrets()) ?? { apiKeys: {} };
        await config.saveSecrets({ ...current, pairedChatId: chatId });
      },
    });
    telegram.start().catch((err) => {
      console.error("Telegram bot failed to start:", err);
    });
  }

  // Render TUI (unless --telegram-only flag)
  if (!process.argv.includes("--telegram-only")) {
    render(React.createElement(App, { agent, router }));
  }
}

async function main() {
  const isFirstRun = !existsSync(join(saHome, "config.json"));

  if (isFirstRun || forceSetup) {
    let existingConfig: WizardData | undefined;
    if (forceSetup && !isFirstRun) {
      try {
        const config = new ConfigManager(saHome);
        const saConfig = await config.load();
        const secrets = await config.loadSecrets();
        const modelsRaw = JSON.parse(
          await readFile(config.getModelsPath(), "utf8")
        );
        const defaultModel = modelsRaw.models?.[0];
        existingConfig = {
          name: saConfig.identity.name,
          personality: saConfig.identity.personality,
          provider: defaultModel?.provider ?? "anthropic",
          model: defaultModel?.model ?? "",
          apiKeyEnvVar: defaultModel?.apiKeyEnvVar ?? "ANTHROPIC_API_KEY",
          baseUrl: defaultModel?.baseUrl,
          apiKey:
            secrets?.apiKeys?.[defaultModel?.apiKeyEnvVar ?? ""] ?? "",
          botToken: secrets?.botToken ?? "",
          pairingCode: secrets?.pairingCode,
        };
      } catch {
        // If loading fails, start fresh (e.g. corrupted config)
      }
    }

    const { unmount, waitUntilExit } = render(
      React.createElement(Wizard, {
        homeDir: saHome,
        existingConfig,
        onComplete: () => {
          unmount();
          launchApp();
        },
      })
    );
    await waitUntilExit();
  } else {
    await launchApp();
  }
}

main().catch((err) => {
  console.error("SA failed to start:", err);
  process.exit(1);
});
