import React, { useState, useCallback } from "react";
import { Box, useApp, useInput } from "ink";
import { Agent } from "../agent/index.js";
import { ModelRouter } from "../router/index.js";
import { ChatView, type ChatMessage } from "./ChatView.js";
import { Input } from "./Input.js";
import { StatusBar } from "./StatusBar.js";
import { ModelPicker } from "./ModelPicker.js";

interface AppProps {
  agent: Agent;
  router: ModelRouter;
}

export function App({ agent, router }: AppProps) {
  const { exit } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);

  useInput((_input, key) => {
    if (key.ctrl && _input === "c") {
      exit();
      return;
    }
    if (key.ctrl && _input === "m" && !isStreaming) {
      setShowModelPicker((v) => !v);
    }
  });

  const handleSubmit = useCallback(
    async (text: string) => {
      if (isStreaming) return;

      // Handle /model command
      if (text === "/model" || text === "/models") {
        setShowModelPicker(true);
        return;
      }

      setMessages((prev) => [...prev, { role: "user", content: text }]);
      setIsStreaming(true);
      setStreamingText("");

      let fullText = "";

      try {
        for await (const event of agent.chat(text)) {
          switch (event.type) {
            case "text_delta":
              fullText += event.delta;
              setStreamingText(fullText);
              break;
            case "tool_start":
              setMessages((prev) => [
                ...prev,
                {
                  role: "tool",
                  content: `Calling ${event.name}...`,
                  toolName: event.name,
                },
              ]);
              break;
            case "tool_end":
              setMessages((prev) => [
                ...prev,
                {
                  role: "tool",
                  content: event.result.content.slice(0, 500),
                  toolName: event.name,
                },
              ]);
              break;
            case "done":
              if (fullText) {
                setMessages((prev) => [
                  ...prev,
                  { role: "assistant", content: fullText },
                ]);
              }
              break;
            case "error":
              setMessages((prev) => [
                ...prev,
                { role: "error", content: event.message },
              ]);
              break;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setMessages((prev) => [...prev, { role: "error", content: msg }]);
      }

      setStreamingText("");
      setIsStreaming(false);
    },
    [agent, isStreaming]
  );

  const handleModelSelect = useCallback(
    (name: string) => {
      router.switchModel(name);
      setShowModelPicker(false);
      setMessages((prev) => [
        ...prev,
        { role: "tool", content: `Switched to model: ${name}`, toolName: "system" },
      ]);
    },
    [router]
  );

  return (
    <Box flexDirection="column" height="100%">
      <StatusBar
        modelName={router.getActiveModelName()}
        isStreaming={isStreaming}
      />
      <ChatView messages={messages} streamingText={streamingText} />
      {showModelPicker ? (
        <ModelPicker
          models={router.listModels()}
          activeModel={router.getActiveModelName()}
          onSelect={handleModelSelect}
          onCancel={() => setShowModelPicker(false)}
        />
      ) : (
        <Input onSubmit={handleSubmit} disabled={isStreaming} />
      )}
    </Box>
  );
}
