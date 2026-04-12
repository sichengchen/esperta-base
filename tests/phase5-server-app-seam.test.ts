import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { EMBEDDED_SKILLS } from "../packages/runtime/src/skills/embedded-skills.generated.js";

function readRepoFile(relativePath: string): string {
  return readFileSync(join(import.meta.dir, "..", relativePath), "utf-8");
}

describe("phase-5 server app seam documentation", () => {
  test("repo docs index the phase-5 ledger", () => {
    expect(readRepoFile("docs/README.md")).toContain("development/phase-5-server-app-seam-ledger.md");
    expect(readRepoFile("docs/development/README.md")).toContain("phase-5-server-app-seam-ledger.md");
  });

  test("migration and architecture docs point to the phase-5 server seam", () => {
    expect(readRepoFile("docs/development/migration.md")).toContain("## Phase 5 Server App Seam");
    expect(readRepoFile("docs/new-architecture/packages.md")).toContain("phase-5-server-app-seam-ledger.md");
    expect(readRepoFile("docs/new-architecture/server.md")).toContain("phase-5-server-app-seam-ledger.md");
  });

  test("embedded aria docs include the phase-5 seam ledger and references", () => {
    const ariaDocs = EMBEDDED_SKILLS.aria;

    expect(ariaDocs["docs/development/phase-5-server-app-seam-ledger.md"]).toContain("# Phase 5 Server App Seam Ledger");
    expect(ariaDocs["docs/development/phase-5-server-app-seam-ledger.md"]).toContain("`@aria/server`");
    expect(ariaDocs["docs/development/phase-5-server-app-seam-ledger.md"]).toContain("`apps/aria-server`");
    expect(ariaDocs["docs/development/README.md"]).toContain("phase-5-server-app-seam-ledger.md");
    expect(ariaDocs["docs/development/migration.md"]).toContain("## Phase 5 Server App Seam");
  });
});
