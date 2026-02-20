import React from "react";
import { Box, Text } from "ink";
import { MarkdownText } from "./MarkdownText.js";

export interface ChatMessage {
  role: "user" | "assistant" | "tool" | "error";
  content: string;
  toolName?: string;
}

interface ChatViewProps {
  messages: ChatMessage[];
  streamingText: string;
  agentName: string;
}

export function ChatView({ messages, streamingText, agentName }: ChatViewProps) {
  return (
    <Box flexDirection="column" flexGrow={1}>
      {messages.map((msg, i) => (
        <Box key={i} marginBottom={1}>
          <MessageBlock message={msg} agentName={agentName} />
        </Box>
      ))}
      {streamingText && (
        <Box marginBottom={1}>
          <Text color="green" bold>
            {`${agentName}: `}
          </Text>
          <MarkdownText>{streamingText}</MarkdownText>
          <Text color="yellow">{"▊"}</Text>
        </Box>
      )}
    </Box>
  );
}

function MessageBlock({ message, agentName }: { message: ChatMessage; agentName: string }) {
  switch (message.role) {
    case "user":
      return (
        <Box>
          <Text color="blue" bold>
            {"You: "}
          </Text>
          <Text>{message.content}</Text>
        </Box>
      );
    case "assistant":
      return (
        <Box>
          <Text color="green" bold>
            {`${agentName}: `}
          </Text>
          <MarkdownText>{message.content}</MarkdownText>
        </Box>
      );
    case "tool":
      return (
        <Box>
          <Text color="magenta" bold>
            {`[${message.toolName ?? "tool"}] `}
          </Text>
          <Text dimColor>{message.content}</Text>
        </Box>
      );
    case "error":
      return (
        <Box>
          <Text color="red" bold>
            {"Error: "}
          </Text>
          <Text color="red">{message.content}</Text>
        </Box>
      );
  }
}
