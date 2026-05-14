import { describe, expect, test } from "bun:test";
import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);

async function listSourceFiles(relativeDir: string): Promise<string[]> {
  const absoluteDir = join(ROOT, relativeDir);
  const entries = await readdir(absoluteDir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = `${relativeDir}/${entry.name}`;
      if (entry.isDirectory()) return listSourceFiles(relativePath);
      return SOURCE_EXTENSIONS.has(extname(entry.name)) ? [relativePath] : [];
    }),
  );
  return nested.flat();
}

async function findForbiddenImports(
  relativeDir: string,
  forbidden: readonly RegExp[],
): Promise<string[]> {
  const offenders: string[] = [];
  for (const file of await listSourceFiles(relativeDir)) {
    const source = await readFile(join(ROOT, file), "utf-8");
    if (forbidden.some((pattern) => pattern.test(source))) {
      offenders.push(file);
    }
  }
  return offenders;
}

async function directoryExists(relativeDir: string): Promise<boolean> {
  try {
    return (await stat(join(ROOT, relativeDir))).isDirectory();
  } catch {
    return false;
  }
}

describe("target dependency graph", () => {
  test("desktop renderer stays on client/protocol style boundaries", async () => {
    await expect(
      findForbiddenImports("apps/aria-desktop/src/renderer", [
        /from ["']@aria\/(?:kernel|node-runtime|agent|tools|persistence|memory|workspaces|sandbox(?:-[^"']+)?)\b/,
      ]),
    ).resolves.toEqual([]);
  });

  test("gateway does not import tool, memory, workspace, agent, or sandbox internals", async () => {
    await expect(
      findForbiddenImports("packages/gateway/src", [
        /from ["']@aria\/(?:agent|tools|memory|workspaces|sandbox(?:-[^"']+)?)\b/,
      ]),
    ).resolves.toEqual([]);
  });

  test("agent runtime does not import tool implementations directly", async () => {
    await expect(
      findForbiddenImports("packages/agent/src", [/from ["']@aria\/tools\b/]),
    ).resolves.toEqual([]);
  });

  test("policy does not select sandbox providers", async () => {
    await expect(
      findForbiddenImports("packages/policy/src", [
        /from ["']@aria\/sandbox(?:-justbash|-full)?\b/,
      ]),
    ).resolves.toEqual([]);
  });

  test("mobile is absent or remains a remote-client-only package", async () => {
    if (!(await directoryExists("apps/aria-mobile"))) {
      expect(await directoryExists("apps/aria-mobile")).toBe(false);
      return;
    }

    await expect(
      findForbiddenImports("apps/aria-mobile", [
        /from ["']@aria\/(?:kernel|node-runtime|agent|tools|persistence|memory|workspaces|workspace|automation|connectors|sandbox(?:-[^"']+)?)\b/,
      ]),
    ).resolves.toEqual([]);
  });
});
