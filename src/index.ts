#!/usr/bin/env bun

import React from "react";
import { render } from "ink";
import { ConfigManager } from "./config/index.js";
import { ModelRouter } from "./router/index.js";
import { Agent } from "./agent/index.js";
import { MemoryManager } from "./memory/index.js";
import { getBuiltinTools } from "./tools/index.js";
import { createRememberTool } from "./tools/remember.js";
import { App } from "./tui/index.js";
import { join } from "node:path";

async function main() {
  // Load configuration
  const config = new ConfigManager();
  const saConfig = await config.load();

  // Initialize memory
  const memoryDir = join(config.homeDir, saConfig.runtime.memory.directory);
  const memory = new MemoryManager(memoryDir);
  await memory.init();

  // Load memory context for system prompt
  const memoryContext = await memory.loadContext();
  const systemPrompt = [
    saConfig.identity.systemPrompt,
    memoryContext ? `\n## Memory\n${memoryContext}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  // Initialize model router
  const router = await ModelRouter.load(config.getModelsPath());

  // Initialize agent
  const tools = [...getBuiltinTools(), createRememberTool(memory)];
  const agent = new Agent({
    router,
    tools,
    systemPrompt,
  });

  // Render TUI
  render(React.createElement(App, { agent, router }));
}

main().catch((err) => {
  console.error("SA failed to start:", err);
  process.exit(1);
});
