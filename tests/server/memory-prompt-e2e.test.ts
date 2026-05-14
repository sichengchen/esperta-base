import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRuntime, type EngineRuntime } from "@aria/node-runtime/runtime";

let testDir: string;
let previousAriaHome: string | undefined;
let previousTerminalCwd: string | undefined;
let previousTestApiKey: string | undefined;

beforeEach(async () => {
  previousAriaHome = process.env.ARIA_HOME;
  previousTerminalCwd = process.env.TERMINAL_CWD;
  previousTestApiKey = process.env.TEST_API_KEY;
  testDir = await mkdtemp(`${tmpdir()}/aria-node-memory-prompt-e2e-`);
  process.env.ARIA_HOME = testDir;
  process.env.TERMINAL_CWD = testDir;
  process.env.TEST_API_KEY = "test-key-for-router-init";

  await mkdir(join(testDir, "memory"), { recursive: true });
  await writeFile(
    join(testDir, "IDENTITY.md"),
    "# Test Agent\n\n## Personality\nPrecise.\n\n## System Prompt\nYou are a prompt test agent.\n",
  );
  await writeFile(join(testDir, "USER.md"), "Operator profile: verify prompt-visible state.\n");
  await writeFile(
    join(testDir, "config.json"),
    JSON.stringify(
      {
        version: 3,
        runtime: {
          activeModel: "test-model",
          telegramBotTokenEnvVar: "TEST_BOT_TOKEN",
          memory: { enabled: true, directory: "memory" },
          audio: { enabled: false, preferLocal: true },
          contextFiles: { enabled: true, maxFileChars: 20_000, maxHintChars: 8_000 },
          automation: { cronTasks: [], webhookTasks: [] },
          mcp: { servers: {} },
        },
        providers: [{ id: "anthropic", type: "anthropic", apiKeyEnvVar: "TEST_API_KEY" }],
        models: [
          {
            name: "test-model",
            provider: "anthropic",
            model: "claude-sonnet-4-5-20250514",
            temperature: 0.2,
            maxTokens: 1024,
          },
        ],
        defaultModel: "test-model",
      },
      null,
      2,
    ),
  );
});

afterEach(async () => {
  if (previousAriaHome === undefined) {
    delete process.env.ARIA_HOME;
  } else {
    process.env.ARIA_HOME = previousAriaHome;
  }

  if (previousTerminalCwd === undefined) {
    delete process.env.TERMINAL_CWD;
  } else {
    process.env.TERMINAL_CWD = previousTerminalCwd;
  }

  if (previousTestApiKey === undefined) {
    delete process.env.TEST_API_KEY;
  } else {
    process.env.TEST_API_KEY = previousTestApiKey;
  }

  await rm(testDir, { recursive: true, force: true });
});

describe("server memory and prompt workflow", () => {
  test("loads preferred project context with source metadata", async () => {
    await writeFile(join(testDir, ".aria.md"), "ARIA ROOT CONTEXT\n");
    await writeFile(join(testDir, "AGENTS.md"), "AGENTS ROOT CONTEXT\n");
    await writeFile(join(testDir, "CLAUDE.md"), "CLAUDE ROOT CONTEXT\n");
    const runtime = await createRuntime();

    try {
      const prompt = await runtime.promptEngine.buildBasePrompt(true);
      expect(prompt).toContain("## Project Context");
      expect(prompt).toContain("## .aria.md");
      expect(prompt).toContain("ARIA ROOT CONTEXT");
      expect(prompt).not.toContain("AGENTS ROOT CONTEXT");
      expect(prompt).not.toContain("CLAUDE ROOT CONTEXT");
    } finally {
      await runtime.close();
    }
  }, 15_000);

  test("refreshes prompt-visible skill state after skill_manage mutations", async () => {
    const runtime = await createRuntime();
    const skillManage = runtime.tools.find((tool) => tool.name === "skill_manage");
    expect(skillManage).toBeDefined();

    const originalRefresh = runtime.refreshSystemPrompt.bind(runtime);
    let refreshCount = 0;
    runtime.refreshSystemPrompt = async () => {
      refreshCount += 1;
      return originalRefresh();
    };

    try {
      const created = await skillManage!.execute({
        action: "create",
        name: "server-refresh",
        content: [
          "---",
          "name: server-refresh",
          "description: Verifies server prompt skill refresh",
          "---",
          "",
          "# Server Refresh",
          "",
          "Initial workflow instruction.",
        ].join("\n"),
      });
      expect(created).toMatchObject({ content: "Created skill: server-refresh" });
      expect(refreshCount).toBe(1);

      const basePrompt = await runtime.promptEngine.buildBasePrompt(true);
      expect(basePrompt).toContain("<name>server-refresh</name>");
      expect(basePrompt).toContain(
        "<description>Verifies server prompt skill refresh</description>",
      );

      const patched = await skillManage!.execute({
        action: "patch",
        name: "server-refresh",
        old_string: "Initial workflow instruction.",
        new_string: "Patched workflow instruction.",
      });
      expect(patched).toMatchObject({ content: "Patched skill: server-refresh" });
      expect(refreshCount).toBe(2);

      const session = runtime.sessions.create("tui:prompt", "tui");
      const sessionPrompt = await runtime.promptEngine.buildSessionPrompt({
        sessionId: session.id,
        connectorType: "tui",
        trigger: "chat",
        attachedSkills: ["server-refresh"],
      });
      expect(sessionPrompt).toContain("## Attached Skills");
      expect(sessionPrompt).toContain("Patched workflow instruction.");
      expect(sessionPrompt).not.toContain("Initial workflow instruction.");
    } finally {
      await runtime.close();
    }
  }, 15_000);
});
