import { describe, expect, test } from "bun:test";
import {
  ARIA_INIT_COMMAND,
  ARIA_INIT_PROMPT,
  ARIA_PLAN_COMMAND,
  ARIA_RENAME_COMMAND,
  buildAriaPlanPrompt,
  expandConsoleSlashPrompt,
  parseAriaRenameSlashCommand,
} from "@aria/console/init";

describe("console init prompt", () => {
  test("expands /init into the AGENTS.md initialization prompt", () => {
    const expansion = expandConsoleSlashPrompt(ARIA_INIT_COMMAND);

    expect(expansion).toEqual({
      displayText: ARIA_INIT_COMMAND,
      message: ARIA_INIT_PROMPT,
    });
    expect(ARIA_INIT_PROMPT).toContain("create an AGENTS.md file");
    expect(ARIA_INIT_PROMPT).toContain("# AGENTS.md");
    expect(ARIA_INIT_PROMPT).toContain(
      "This file provides guidance to Aria agents when working with code in this repository.",
    );
    expect(ARIA_INIT_PROMPT).toContain(".cursor/rules/");
    expect(ARIA_INIT_PROMPT).toContain(".github/copilot-instructions.md");
  });

  test("leaves other input untouched", () => {
    expect(expandConsoleSlashPrompt("/status")).toBeNull();
    expect(expandConsoleSlashPrompt("hello")).toBeNull();
  });

  test("expands /plan with a project task into a read-only planning prompt", () => {
    const expansion = expandConsoleSlashPrompt(`${ARIA_PLAN_COMMAND} add project labels`);

    expect(expansion?.displayText).toBe("/plan add project labels");
    expect(expansion?.message).toContain("You are planning Aria project work");
    expect(expansion?.message).toContain("add project labels");
    expect(expansion?.message).toContain("Do not edit files");
    expect(expansion?.message).toContain("read-only exploration");
    expect(expansion?.message).toContain("verification commands");
  });

  test("expands bare /plan into a clarification prompt", () => {
    const prompt = buildAriaPlanPrompt("");

    expect(prompt).toContain("without a project task");
    expect(prompt).toContain("Ask the user what Aria project work they want planned");
    expect(expandConsoleSlashPrompt(ARIA_PLAN_COMMAND)?.message).toBe(prompt);
  });

  test("recognizes /rename as a direct slash command instead of a prompt expansion", () => {
    expect(parseAriaRenameSlashCommand(`${ARIA_RENAME_COMMAND} Release polish`)).toEqual({
      title: "Release polish",
    });
    expect(parseAriaRenameSlashCommand(ARIA_RENAME_COMMAND)).toEqual({ title: "" });
    expect(expandConsoleSlashPrompt(`${ARIA_RENAME_COMMAND} Release polish`)).toBeNull();
  });
});
