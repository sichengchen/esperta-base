export const ARIA_INIT_COMMAND = "/init";
export const ARIA_PLAN_COMMAND = "/plan";
export const ARIA_RENAME_COMMAND = "/rename";
export const ARIA_REVIEW_COMMAND = "/review";
export const ARIA_SECURITY_REVIEW_COMMAND = "/security-review";

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

export function buildAriaReviewPrompt(request: string): string {
  const trimmedRequest = request.trim();
  const target = trimmedRequest
    ? `The user supplied this review target or context:\n\n${trimmedRequest}`
    : "The user did not supply a target. Review the current repository changes or, if this is a GitHub PR workflow, inspect the active/open PR context.";

  return `You are doing a focused Aria code review.

${target}

Review workflow:

- Inspect the relevant diff before drawing conclusions. Prefer current branch or worktree changes; if the target is a PR number or URL, use the GitHub/gh workflow available in this environment to inspect PR metadata and diff.
- Read surrounding code as needed to understand behavior, ownership boundaries, and project conventions.
- Prioritize correctness bugs, behavioral regressions, broken contracts, missing tests for risky changes, performance problems with concrete impact, and security concerns that are directly relevant to the reviewed change.
- Do not spend review space on style preferences, broad refactors, or generic best practices unless they cause an actionable risk.

Output rules:

- Lead with findings, ordered by severity.
- For every finding, include a precise file and line reference when possible, severity, why it matters, and the smallest useful fix direction.
- If there are no findings, say that clearly and mention any meaningful test gap or residual risk.
- Keep any overview or change summary brief and after the findings.`;
}

export function buildAriaSecurityReviewPrompt(request: string): string {
  const trimmedRequest = request.trim();
  const target = trimmedRequest
    ? `The user supplied this security review target or context:\n\n${trimmedRequest}`
    : "The user did not supply a target. Security-review the current repository changes or active PR diff.";

  return `You are a senior security engineer conducting a focused Aria security review.

${target}

Objective:

Identify high-confidence, newly introduced security vulnerabilities with realistic exploitation potential. This is not a general code review. Do not report pre-existing issues unless the reviewed change makes them newly exploitable.

Review workflow:

- Inspect the complete relevant diff first. Prefer the current branch/worktree diff; if the target is a PR number or URL, inspect that PR's metadata and diff.
- Read enough surrounding code to understand trust boundaries, authorization checks, input validation, persistence, secrets handling, shell/process execution, network access, and rendering behavior.
- Compare the changed code with existing secure patterns in the repo.
- Trace untrusted input into sensitive operations before reporting an issue.

Report only concrete HIGH or MEDIUM findings. Exclude denial-of-service, rate limiting, generic hardening, dependency freshness, documentation-only concerns, test-only files, log spoofing, regex injection, theoretical races, and low-confidence observations.

Security categories to consider:

- injection into SQL, NoSQL, commands, templates, XML, YAML, deserialization, eval, or file paths
- authentication bypass, authorization bypass, privilege escalation, or session flaws
- sensitive data exposure, including secrets or PII in logs or API responses
- weak or bypassed crypto, randomness, certificate validation, or key handling
- XSS only where the framework is actually bypassed, such as unsafe HTML sinks
- SSRF only where the reviewed change can control host or protocol

Output rules:

- Return markdown findings only.
- For each finding include file, line, severity, category, confidence from 1-10, exploit scenario, and fix recommendation.
- Do not include findings below confidence 8.
- If there are no qualifying vulnerabilities, output: "No high-confidence security findings."`;
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

  if (text === ARIA_REVIEW_COMMAND || text.startsWith(`${ARIA_REVIEW_COMMAND} `)) {
    const request =
      text === ARIA_REVIEW_COMMAND ? "" : text.slice(ARIA_REVIEW_COMMAND.length).trim();
    return {
      displayText: text,
      message: buildAriaReviewPrompt(request),
    };
  }

  if (
    text === ARIA_SECURITY_REVIEW_COMMAND ||
    text.startsWith(`${ARIA_SECURITY_REVIEW_COMMAND} `)
  ) {
    const request =
      text === ARIA_SECURITY_REVIEW_COMMAND
        ? ""
        : text.slice(ARIA_SECURITY_REVIEW_COMMAND.length).trim();
    return {
      displayText: text,
      message: buildAriaSecurityReviewPrompt(request),
    };
  }

  if (parseAriaRenameSlashCommand(text)) {
    return null;
  }

  return null;
}
