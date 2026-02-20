#!/usr/bin/env bun

import { createRuntime } from "./runtime.js";
import { startServer } from "./server.js";
import { createEngineClient } from "../shared/client.js";

const port = process.env.SA_ENGINE_PORT
  ? parseInt(process.env.SA_ENGINE_PORT, 10)
  : undefined;

async function main() {
  console.log("SA Engine bootstrapping...");
  const runtime = await createRuntime();
  const server = await startServer(runtime, { port });

  // Build a loopback tRPC client for connectors running in-process
  const httpUrl = `http://127.0.0.1:${server.port}`;
  const wsUrl = `ws://127.0.0.1:${server.port + 1}`;
  const token = runtime.auth.getMasterToken();
  const client = createEngineClient({ httpUrl, wsUrl, token });

  // Auto-start Telegram connector if bot token is configured
  const secrets = await runtime.config.loadSecrets();
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN ?? secrets?.botToken;
  if (telegramToken) {
    const { TelegramConnector } = await import("../connectors/telegram/transport.js");
    const connector = new TelegramConnector(client, {
      botToken: telegramToken,
      allowedChatId: secrets?.pairedChatId,
      pairingCode: secrets?.pairingCode,
      onPaired: async (chatId) => {
        const current = (await runtime.config.loadSecrets()) ?? { apiKeys: {} };
        await runtime.config.saveSecrets({ ...current, pairedChatId: chatId });
      },
    });
    connector.start().catch((err) => {
      console.error("Telegram connector failed to start:", err);
    });
  }

  // Auto-start Discord connector if bot token is configured
  const discordToken = process.env.DISCORD_TOKEN ?? secrets?.discordToken;
  if (discordToken) {
    const { DiscordConnector } = await import("../connectors/discord/transport.js");
    const connector = new DiscordConnector(client, {
      botToken: discordToken,
      allowedGuildId: process.env.DISCORD_GUILD_ID ?? secrets?.discordGuildId,
    });
    connector.start().catch((err) => {
      console.error("Discord connector failed to start:", err);
    });
  }

  // Graceful shutdown
  function shutdown() {
    console.log("\nSA Engine shutting down...");
    server.stop().then(() => process.exit(0));
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("SA Engine failed to start:", err);
  process.exit(1);
});
