import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";

const ROOT = "/Users/sichengchen/.codex/worktrees/911d/sa";

async function read(path: string): Promise<string> {
  return readFile(`${ROOT}/${path}`, "utf-8");
}

describe("docs consistency", () => {
  test("documentation indexes reference the new system docs", async () => {
    const readme = await read("docs/README.md");
    const index = await read("docs/index.md");

    for (const path of [
      "system/projects-engine.md",
      "system/relay-model.md",
      "system/handoff.md",
    ]) {
      expect(readme).toContain(path);
      expect(index).toContain(path);
    }
  });

  test("rewritten architecture docs avoid stale canonical src ownership", async () => {
    const overview = await read("docs/overview.md");
    const development = await read("docs/development.md");
    const sessions = await read("docs/sessions.md");
    const skills = await read("docs/skills.md");

    expect(overview).not.toContain("| Engine core | `src/engine/`");
    expect(overview).not.toContain("| Connectors | `src/connectors/`");
    expect(development).not.toContain("| `@aria/engine/*`     | `src/engine/*`");
    expect(sessions).not.toContain("8-character hex string");
    expect(skills).not.toContain("Ship with Esperta Aria at `src/engine/skills/bundled/`");
  });

  test("rewritten docs describe the package-owned architecture", async () => {
    const overview = await read("docs/overview.md");
    const sessions = await read("docs/sessions.md");
    const skills = await read("docs/skills.md");
    const tools = await read("docs/tools/README.md");

    expect(overview).toContain("packages/runtime");
    expect(overview).toContain("packages/projects-engine");
    expect(overview).toContain("packages/relay");
    expect(overview).toContain("packages/handoff");
    expect(sessions).toContain("full UUID");
    expect(skills).toContain("packages/runtime/src/skills/bundled/");
    expect(tools).toContain("runtime.toolApproval");
  });
});
