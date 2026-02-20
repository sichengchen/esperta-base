import React from "react";
import { Box, Text, useInput } from "ink";

interface WelcomeProps {
  onNext: () => void;
}

export function Welcome({ onNext }: WelcomeProps) {
  useInput((_input, key) => {
    if (key.return) onNext();
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Welcome to SA (Sasa)
      </Text>
      <Text />
      <Text>
        SA (Sasa) is your personal AI agent assistant.
      </Text>
      <Text />
      <Text>This wizard will help you set up:</Text>
      <Text> 1. Agent identity and personality</Text>
      <Text> 2. Your profile (name, preferences)</Text>
      <Text> 3. LLM model provider and API key</Text>
      <Text> 4. Telegram bot (optional)</Text>
      <Text />
      <Text dimColor>Press Enter to begin...</Text>
    </Box>
  );
}
