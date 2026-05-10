export const ARIA_INIT_COMMAND = "/init";
export const ARIA_PLAN_COMMAND = "/plan";
export const ARIA_RENAME_COMMAND = "/rename";

export const ARIA_INIT_PROMPT = `Please analyze this codebase and create an AGENTS.md file, which will be given to future Aria agents and other coding agents operating in this repository.

What to add:

- Commands that will be commonly used, such as how to build, lint, and run tests.
- The necessary commands to develop in this codebase, such as how to run a single test.
- High-level code architecture and structure so future agent instances can become productive quickly. Focus on the big-picture architecture that requires reading multiple files to understand.
- Important repo-specific instructions from README.md, Cursor rules in .cursor/rules/ or .cursorrules, and Copilot rules in .github/copilot-instructions.md.

Usage notes:

- If AGENTS.md already exists, inspect it and suggest or apply improvements instead of duplicating it.
- Do not repeat yourself.
- Do not include obvious instructions like "provide helpful error messages to users", "write unit tests for all new utilities", or "never include sensitive information in code or commits".
- Avoid listing every component or file structure that can be easily discovered.
- Do not include generic development practices.
- If README.md exists, include only the important repo-specific parts.
- Do not make up information such as "Common Development Tasks", "Tips for Development", or "Support and Documentation" unless it is expressly included in files you read.

Be sure to prefix the file with the following text:

# AGENTS.md

This file provides guidance to Aria agents when working with code in this repository.`;

export interface SlashPromptExpansion {
  displayText: string;
  message: string;
}

export interface RenameSlashCommand {
  title: string;
}

export function parseAriaRenameSlashCommand(text: string): RenameSlashCommand | null {
  if (text !== ARIA_RENAME_COMMAND && !text.startsWith(`${ARIA_RENAME_COMMAND} `)) {
    return null;
  }

  const title = text === ARIA_RENAME_COMMAND ? "" : text.slice(ARIA_RENAME_COMMAND.length).trim();
  return { title };
}

export function buildAriaPlanPrompt(request: string): string {
  const trimmedRequest = request.trim();

  if (!trimmedRequest) {
    return `The user invoked ${ARIA_PLAN_COMMAND} without a project task.

Ask the user what Aria project work they want planned. Do not edit files or run non-read-only commands while clarifying the planning target.`;
  }

  return `You are planning Aria project work. The user asked:

${trimmedRequest}

Plan-mode rules:

- Do not edit files, stage changes, commit, install dependencies, or run commands that modify state until the user approves the plan.
- Use read-only exploration first: read the relevant project context files, inspect existing code paths, search for reusable patterns, and trace the current architecture.
- Ask the user only for requirements, priorities, tradeoffs, or edge cases that cannot be discovered from the repository.
- Prefer the repo's existing architecture, package boundaries, docs, and command surface over inventing a parallel path.

When the plan is ready, respond with a concise implementation plan for the user to approve. Include:

- context and goal
- recommended approach
- files or packages likely to change
- sequencing and dependencies
- risks or open questions
- verification commands and any manual checks

Do not ask for approval with a vague text question. End by clearly presenting the plan and stating that implementation should wait for user approval.`;
}

export function expandAriaSlashPrompt(text: string): SlashPromptExpansion | null {
  if (text === ARIA_INIT_COMMAND) {
    return {
      displayText: ARIA_INIT_COMMAND,
      message: ARIA_INIT_PROMPT,
    };
  }

  if (text === ARIA_PLAN_COMMAND || text.startsWith(`${ARIA_PLAN_COMMAND} `)) {
    const request = text === ARIA_PLAN_COMMAND ? "" : text.slice(ARIA_PLAN_COMMAND.length).trim();
    return {
      displayText: text,
      message: buildAriaPlanPrompt(request),
    };
  }

  if (parseAriaRenameSlashCommand(text)) {
    return null;
  }

  return null;
}
