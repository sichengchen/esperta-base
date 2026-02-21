import React from "react";
import { Box, Text } from "ink";

interface StatusBarProps {
  modelName: string;
  isStreaming: boolean;
  connected: boolean;
  sessionId?: string | null;
  connectorType?: string;
}

export function StatusBar({ modelName, isStreaming, connected, sessionId, connectorType }: StatusBarProps) {
  const sessionLabel = sessionId ? `${connectorType ?? "?"}:${sessionId.slice(0, 8)}` : "none";

  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1}>
      <Text color={connected ? "green" : "red"}>
        {connected ? "●" : "○"}
      </Text>
      <Text> </Text>
      <Text color="cyan" bold>
        model:
      </Text>
      <Text> {modelName}</Text>
      <Text> | </Text>
      <Text dimColor>session: {sessionLabel}</Text>
      <Text> | </Text>
      <Text color={isStreaming ? "yellow" : "green"}>
        {isStreaming ? "streaming..." : "ready"}
      </Text>
      <Text dimColor> | Ctrl+C: exit</Text>
    </Box>
  );
}
