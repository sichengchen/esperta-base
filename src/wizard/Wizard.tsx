import React, { useState, useCallback } from "react";
import { Box, Text } from "ink";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Welcome } from "./steps/Welcome.js";
import { Identity } from "./steps/Identity.js";
import { ModelSetup, type ModelSetupData } from "./steps/ModelSetup.js";
import { TelegramSetup } from "./steps/TelegramSetup.js";
import { Confirm, type WizardData } from "./steps/Confirm.js";
import { saveSecrets } from "../config/secrets.js";

type Step = "welcome" | "identity" | "model" | "telegram" | "confirm" | "done";

interface WizardProps {
  homeDir: string;
  onComplete: () => void;
  existingConfig?: WizardData;
}

export function Wizard({ homeDir, onComplete, existingConfig }: WizardProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [data, setData] = useState<WizardData>(
    existingConfig
      ? { ...existingConfig }
      : {
          name: "Sasa",
          personality: "Helpful, concise, and proactive personal assistant",
          provider: "anthropic",
          model: "claude-sonnet-4-5-20250514",
          apiKeyEnvVar: "ANTHROPIC_API_KEY",
          apiKey: "",
          botToken: "",
          baseUrl: undefined,
        }
  );

  const handleConfirm = useCallback(async () => {
    try {
      await mkdir(homeDir, { recursive: true });
      await mkdir(join(homeDir, "memory", "topics"), { recursive: true });

      // Write identity.md
      const identityMd = `# ${data.name}\n\n## Personality\n${data.personality}\n\n## System Prompt\nYou are ${data.name}, a personal AI agent assistant. You help with tasks, answer questions, and use tools when needed. Keep responses concise and actionable.\n`;
      await writeFile(join(homeDir, "identity.md"), identityMd);

      // Write USER.md template (only if it doesn't exist — don't overwrite user edits)
      const userProfilePath = join(homeDir, "USER.md");
      if (!existsSync(userProfilePath)) {
        const userProfileTemplate = `# User Profile

Fill in what you want ${data.name} to always know about you.

## About Me
<!-- Your name, location, timezone, role, etc. -->

## Preferences
<!-- Communication style, preferred tools, habits, etc. -->

## Recurring Context
<!-- Projects, goals, or ongoing context ${data.name} should always be aware of. -->
`;
        await writeFile(userProfilePath, userProfileTemplate);
      }

      // Write config.json
      const config = {
        activeModel: "default",
        telegramBotTokenEnvVar: "TELEGRAM_BOT_TOKEN",
        memory: { enabled: true, directory: "memory" },
      };
      await writeFile(
        join(homeDir, "config.json"),
        JSON.stringify(config, null, 2) + "\n"
      );

      // Write models.json
      const models = {
        default: "default",
        models: [
          {
            name: "default",
            provider: data.provider,
            model: data.model,
            apiKeyEnvVar: data.apiKeyEnvVar,
            temperature: 0.7,
            maxTokens: 8192,
            ...(data.baseUrl ? { baseUrl: data.baseUrl } : {}),
          },
        ],
      };
      await writeFile(
        join(homeDir, "models.json"),
        JSON.stringify(models, null, 2) + "\n"
      );

      // Write empty MEMORY.md
      await writeFile(join(homeDir, "memory", "MEMORY.md"), "");

      // Persist secrets (API key + bot token + pairing code) in encrypted file
      await saveSecrets(homeDir, {
        apiKeys: data.apiKey ? { [data.apiKeyEnvVar]: data.apiKey } : {},
        botToken: data.botToken || undefined,
        pairingCode: data.pairingCode,
      });

      setStep("done");
      // Brief delay then transition to main app
      setTimeout(onComplete, 1500);
    } catch (err) {
      console.error("Setup failed:", err);
    }
  }, [data, homeDir, onComplete]);

  switch (step) {
    case "welcome":
      return <Welcome onNext={() => setStep("identity")} />;
    case "identity":
      return (
        <Identity
          currentValues={
            existingConfig
              ? { name: data.name, personality: data.personality }
              : undefined
          }
          onNext={({ name, personality }) => {
            setData((d) => ({ ...d, name, personality }));
            setStep("model");
          }}
          onBack={() => setStep("welcome")}
        />
      );
    case "model":
      return (
        <ModelSetup
          currentValues={
            existingConfig
              ? {
                  provider: data.provider,
                  model: data.model,
                  apiKeyEnvVar: data.apiKeyEnvVar,
                  apiKey: data.apiKey,
                  baseUrl: data.baseUrl,
                }
              : undefined
          }
          onNext={(modelData: ModelSetupData) => {
            setData((d) => ({ ...d, ...modelData }));
            setStep("telegram");
          }}
          onBack={() => setStep("identity")}
        />
      );
    case "telegram":
      return (
        <TelegramSetup
          currentValues={
            existingConfig
              ? { botToken: data.botToken, pairingCode: data.pairingCode }
              : undefined
          }
          onNext={({ botToken, pairingCode }) => {
            setData((d) => ({ ...d, botToken, pairingCode }));
            setStep("confirm");
          }}
          onBack={() => setStep("model")}
        />
      );
    case "confirm":
      return (
        <Confirm
          data={data}
          onConfirm={handleConfirm}
          onBack={() => setStep("telegram")}
        />
      );
    case "done":
      return (
        <Box padding={1}>
          <Text bold color="green">
            Setup complete! Launching SA...
          </Text>
        </Box>
      );
  }
}
