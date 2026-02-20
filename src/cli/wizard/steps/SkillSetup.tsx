import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

export interface SkillSetupData {
  installSkills: boolean;
}

interface SkillSetupProps {
  onNext: (data: SkillSetupData) => void;
  onBack: () => void;
}

const STARTER_SKILLS = [
  { name: "skill-creator", description: "Create new agent skills (bundled)" },
  { name: "code-review", description: "AI-powered code review assistance" },
  { name: "git-commit", description: "Generate commit messages from diffs" },
  { name: "summarize", description: "Summarize documents and web pages" },
];

export function SkillSetup({ onNext, onBack }: SkillSetupProps) {
  const [selected, setSelected] = useState(0);

  useInput((input, key) => {
    if (key.escape) { onBack(); return; }

    if (key.upArrow) {
      setSelected((s) => Math.max(0, s - 1));
      return;
    }
    if (key.downArrow) {
      setSelected((s) => Math.min(1, s + 1));
      return;
    }

    if (key.return) {
      onNext({ installSkills: selected === 0 });
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Agent Skills
      </Text>
      <Text />
      <Text>
        SA uses agent skills — prompt-level instructions that teach the AI how
        to perform specific tasks using existing tools.
      </Text>
      <Text />
      <Text>Popular skills on ClawHub (clawhub.ai):</Text>
      {STARTER_SKILLS.map((skill) => (
        <Text key={skill.name}>
          {"  "}<Text color="yellow">{skill.name}</Text> — {skill.description}
        </Text>
      ))}
      <Text />
      <Text>Would you like to browse and install skills from ClawHub?</Text>
      <Text />
      <Box flexDirection="column">
        <Text>
          {selected === 0 ? <Text color="green">{"● "}</Text> : <Text>{"○ "}</Text>}
          Browse skills after setup
        </Text>
        <Text>
          {selected === 1 ? <Text color="green">{"● "}</Text> : <Text>{"○ "}</Text>}
          Skip for now (you can install skills later)
        </Text>
      </Box>
      <Text />
      <Text dimColor>↑↓ to select | Enter to proceed | Esc to go back</Text>
    </Box>
  );
}
