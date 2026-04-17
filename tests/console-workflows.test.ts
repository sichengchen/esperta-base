import { describe, expect, test } from "bun:test";
import { handleConsoleWorkflowCommand, type ConsoleWorkflowContext } from "@aria/console/commands";

interface MutableState {
  sessionId: string | null;
  sessionConnectorType: string;
  showModelPicker: boolean;
  showSessionPicker: boolean;
  models: Array<{ name: string }>;
  sessions: Array<{ id: string; connectorType: string }>;
  scheduledExitMs: number | null;
  messages: Array<{ role: string; content: string; toolName?: string }>;
}

function createContext(overrides: Partial<ConsoleWorkflowContext> = {}) {
  const state: MutableState = {
    sessionId: "tui:session-1",
    sessionConnectorType: "tui",
    showModelPicker: false,
    showSessionPicker: false,
    models: [],
    sessions: [],
    scheduledExitMs: null,
    messages: [],
  };

  const client = {
    session: {
      destroy: {
        mutate: async () => undefined,
      },
      create: {
        mutate: async () => ({ session: { id: "tui:session-2" } }),
      },
      list: {
        query: async () => [
          { id: "tui:session-1", connectorType: "tui" },
          { id: "tui:session-2", connectorType: "telegram" },
        ],
      },
    },
    chat: {
      stop: {
        mutate: async () => ({ cancelled: true }),
      },
      history: {
        query: async () => ({
          messages: [
            { role: "user", content: "hello" },
            { role: "assistant", content: "world" },
          ],
        }),
      },
    },
    engine: {
      shutdown: {
        mutate: async () => undefined,
      },
      restart: {
        mutate: async () => undefined,
      },
    },
    health: {
      ping: {
        query: async () => ({
          status: "ok",
          model: "sonnet",
          sessions: 3,
          uptime: 42.6,
        }),
      },
    },
    model: {
      list: {
        query: async () => [
          {
            name: "sonnet",
            provider: "anthropic",
            model: "claude",
            temperature: 0.7,
          },
          {
            name: "opus",
            provider: "anthropic",
            model: "claude-opus",
            maxTokens: 4096,
          },
        ],
      },
    },
    provider: {
      list: {
        query: async () => [
          {
            id: "anthropic",
            type: "anthropic",
            apiKeyEnvVar: "ANTHROPIC_API_KEY",
          },
        ],
      },
    },
  } as any;

  const context: ConsoleWorkflowContext = {
    client,
    sessionId: state.sessionId,
    modelName: "sonnet",
    handlers: {
      addMessage(message) {
        state.messages.push(message);
      },
      appendMessages(messages) {
        state.messages.push(...messages);
      },
      setSessionId(sessionId) {
        state.sessionId = sessionId;
      },
      setSessionConnectorType(connectorType) {
        state.sessionConnectorType = connectorType;
      },
      setShowModelPicker(show) {
        state.showModelPicker = show;
      },
      setShowSessionPicker(show) {
        state.showSessionPicker = show;
      },
      setModels(models) {
        state.models = models;
      },
      setSessions(sessions) {
        state.sessions = sessions as any;
      },
      scheduleExit(delayMs) {
        state.scheduledExitMs = delayMs;
      },
    },
    ...overrides,
  };

  return { context, state, client };
}

describe("console workflow commands", () => {
  test("starts a new session and records the workflow message", async () => {
    const { context, state } = createContext();

    const handled = await handleConsoleWorkflowCommand("/new", context);

    expect(handled).toBe(true);
    expect(state.sessionId).toBe("tui:session-2");
    expect(state.sessionConnectorType).toBe("tui");
    expect(state.messages).toEqual([
      {
        role: "tool",
        content: "New session started: tui:session-",
        toolName: "system",
      },
    ]);
  });

  test("stops the active session and reports the result", async () => {
    const { context, state } = createContext();

    const handled = await handleConsoleWorkflowCommand("/stop", context);

    expect(handled).toBe(true);
    expect(state.messages).toEqual([
      {
        role: "tool",
        content: "Stopped all running tasks.",
        toolName: "system",
      },
    ]);
  });

  test("loads models and opens the model picker", async () => {
    const { context, state } = createContext();

    const handled = await handleConsoleWorkflowCommand("/model", context);

    expect(handled).toBe(true);
    expect(state.showModelPicker).toBe(true);
    expect(state.models.map((model) => model.name)).toEqual(["sonnet", "opus"]);
  });

  test("lists providers through the console workflow helper", async () => {
    const { context, state } = createContext();

    const handled = await handleConsoleWorkflowCommand("/provider", context);

    expect(handled).toBe(true);
    expect(state.messages[0]).toEqual({
      role: "tool",
      content: "Providers:\n• anthropic (anthropic) — ANTHROPIC_API_KEY",
      toolName: "system",
    });
  });

  test("lists sessions and switches to a matching session with loaded history", async () => {
    const { context, state } = createContext();

    expect(await handleConsoleWorkflowCommand("/sessions", context)).toBe(true);
    expect(state.showSessionPicker).toBe(true);
    expect(state.sessions.map((session) => session.id)).toEqual(["tui:session-1", "tui:session-2"]);

    state.messages = [];
    expect(await handleConsoleWorkflowCommand("/switch tui:session-2", context)).toBe(true);
    expect(state.sessionId).toBe("tui:session-2");
    expect(state.sessionConnectorType).toBe("telegram");
    expect(state.messages).toEqual([
      {
        role: "tool",
        content: "Switched to session tui:sess [telegram]",
        toolName: "system",
      },
      { role: "user", content: "hello", toolName: undefined },
      { role: "assistant", content: "world", toolName: undefined },
    ]);
  });

  test("reports status and schedules exit for shutdown and restart", async () => {
    const { context, state } = createContext();

    expect(await handleConsoleWorkflowCommand("/status", context)).toBe(true);
    expect(state.messages[0]).toEqual({
      role: "tool",
      content: "Engine: ok | Model: sonnet | Sessions: 3 | Uptime: 42s",
      toolName: "system",
    });

    state.messages = [];
    expect(await handleConsoleWorkflowCommand("/shutdown", context)).toBe(true);
    expect(state.messages[0]).toEqual({
      role: "tool",
      content: "Shutting down Aria Runtime...",
      toolName: "system",
    });
    expect(state.scheduledExitMs as number | null).toBe(500);

    state.messages = [];
    state.scheduledExitMs = null;
    expect(await handleConsoleWorkflowCommand("/restart", context)).toBe(true);
    expect(state.messages[0]).toEqual({
      role: "tool",
      content: "Restarting Aria Runtime...",
      toolName: "system",
    });
    expect(state.scheduledExitMs as number | null).toBe(500);
  });

  test("returns false for non-command input", async () => {
    const { context, state } = createContext();

    expect(await handleConsoleWorkflowCommand("hello", context)).toBe(false);
    expect(state.messages).toEqual([]);
  });
});
