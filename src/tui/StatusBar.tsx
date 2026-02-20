import React from "react";
import { Box, Text } from "ink";

interface StatusBarProps {
  modelName: string;
  isStreaming: boolean;
}

export function StatusBar({ modelName, isStreaming }: StatusBarProps) {
  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1}>
      <Text color="cyan" bold>
        model:
      </Text>
      <Text> {modelName}</Text>
      <Text> | </Text>
      <Text color={isStreaming ? "yellow" : "green"}>
        {isStreaming ? "streaming..." : "ready"}
      </Text>
      <Text dimColor> | Ctrl+M: switch model | Ctrl+C: exit</Text>
    </Box>
  );
}
