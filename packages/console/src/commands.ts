import type { ModelConfig, ProviderConfig } from "@aria/gateway/router/types";
import type { Session } from "@aria/protocol";
import type { ChatMessage } from "./MessageBlock.js";
import type { createTuiClient } from "./client.js";

type EngineClient = ReturnType<typeof createTuiClient>;
type PendingMessage = Omit<ChatMessage, "id">;

function mapHistoryMessages(messages: any[]): PendingMessage[] {
  return messages.map((message: any) => ({
    role: message.role === "assistant" ? "assistant" : message.role === "user" ? "user" : "tool",
    content:
      typeof message.content === "string" ? message.content : JSON.stringify(message.content),
    toolName: typeof message.toolName === "string" ? message.toolName : undefined,
  }));
}

export interface ConsoleWorkflowHandlers {
  addMessage(message: PendingMessage): void;
  appendMessages(messages: PendingMessage[]): void;
  setSessionId(sessionId: string): void;
  setSessionConnectorType(connectorType: string): void;
  setShowModelPicker(show: boolean): void;
  setShowSessionPicker(show: boolean): void;
  setModels(models: ModelConfig[]): void;
  setSessions(sessions: Session[]): void;
  scheduleExit(delayMs: number): void;
}

export interface ConsoleWorkflowContext {
  client: EngineClient;
  sessionId: string | null;
  modelName: string;
  handlers: ConsoleWorkflowHandlers;
}

export async function handleConsoleWorkflowCommand(
  text: string,
  context: ConsoleWorkflowContext,
): Promise<boolean> {
  const { client, sessionId, modelName, handlers } = context;

  if (text === "/new") {
    try {
      if (sessionId) {
        await client.session.destroy.mutate({ sessionId });
      }
      const { session } = await client.session.create.mutate({
        connectorType: "tui",
        prefix: "tui",
      });
      handlers.setSessionId(session.id);
      handlers.setSessionConnectorType("tui");
      handlers.addMessage({
        role: "tool",
        content: `New session started: ${session.id.slice(0, 12)}`,
        toolName: "system",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      handlers.addMessage({ role: "error", content: msg });
    }
    return true;
  }

  if (text === "/stop") {
    try {
      if (sessionId) {
        const result = await client.chat.stop.mutate({ sessionId });
        handlers.addMessage({
          role: "tool",
          content: result.cancelled ? "Stopped all running tasks." : "Nothing running.",
          toolName: "system",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      handlers.addMessage({ role: "error", content: msg });
    }
    return true;
  }

  if (text === "/shutdown") {
    try {
      handlers.addMessage({
        role: "tool",
        content: "Shutting down Aria Runtime...",
        toolName: "system",
      });
      await client.engine.shutdown.mutate();
      handlers.scheduleExit(500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      handlers.addMessage({ role: "error", content: msg });
    }
    return true;
  }

  if (text === "/restart") {
    try {
      handlers.addMessage({
        role: "tool",
        content: "Restarting Aria Runtime...",
        toolName: "system",
      });
      await client.engine.restart.mutate();
      handlers.scheduleExit(500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      handlers.addMessage({ role: "error", content: msg });
    }
    return true;
  }

  if (text === "/status") {
    try {
      const ping = await client.health.ping.query();
      handlers.addMessage({
        role: "tool",
        content: `Engine: ${ping.status} | Model: ${ping.model} | Sessions: ${ping.sessions} | Uptime: ${Math.floor(ping.uptime)}s`,
        toolName: "system",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      handlers.addMessage({ role: "error", content: msg });
    }
    return true;
  }

  if (text === "/model") {
    try {
      const freshModels = await client.model.list.query();
      handlers.setModels(freshModels);
    } catch {}
    handlers.setShowModelPicker(true);
    return true;
  }

  if (text === "/models") {
    try {
      const modelList = await client.model.list.query();
      const lines = modelList.map((model: ModelConfig) => {
        const marker = model.name === modelName ? "●" : "○";
        const extras: string[] = [];
        if (model.temperature !== undefined) extras.push(`temp=${model.temperature}`);
        if (model.maxTokens !== undefined) extras.push(`max=${model.maxTokens}`);
        const suffix = extras.length > 0 ? `  (${extras.join(", ")})` : "";
        return `${marker} ${model.name}  ${model.provider} → ${model.model}${suffix}`;
      });
      handlers.addMessage({
        role: "tool",
        content: `Models:\n${lines.join("\n")}`,
        toolName: "system",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      handlers.addMessage({ role: "error", content: msg });
    }
    return true;
  }

  if (text === "/provider") {
    try {
      const providers = await client.provider.list.query();
      const lines = providers.map((provider: ProviderConfig) => {
        const base = `• ${provider.id} (${provider.type}) — ${provider.apiKeyEnvVar}`;
        return provider.baseUrl ? `${base}  [${provider.baseUrl}]` : base;
      });
      handlers.addMessage({
        role: "tool",
        content: `Providers:\n${lines.join("\n")}`,
        toolName: "system",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      handlers.addMessage({ role: "error", content: msg });
    }
    return true;
  }

  if (text === "/sessions") {
    try {
      const list = await client.session.list.query();
      handlers.setSessions(list);
      handlers.setShowSessionPicker(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      handlers.addMessage({ role: "error", content: msg });
    }
    return true;
  }

  if (text.startsWith("/switch ")) {
    const target = text.slice(8).trim();
    if (!target) {
      handlers.addMessage({
        role: "error",
        content: "Usage: /switch <session-id>",
      });
      return true;
    }

    try {
      const list = await client.session.list.query();
      const match = list.find((session: Session) => session.id.startsWith(target));
      if (!match) {
        handlers.addMessage({
          role: "error",
          content: `No session found matching: ${target}`,
        });
        return true;
      }
      handlers.setSessionId(match.id);
      handlers.setSessionConnectorType(match.connectorType);
      const history = await client.chat.history.query({
        sessionId: match.id,
      });
      handlers.appendMessages([
        {
          role: "tool",
          content: `Switched to session ${match.id.slice(0, 8)} [${match.connectorType}]`,
          toolName: "system",
        },
        ...mapHistoryMessages(history.messages as any[]),
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      handlers.addMessage({ role: "error", content: msg });
    }
    return true;
  }

  return false;
}
