import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_DIR = fileURLToPath(new URL("..", import.meta.url));

function readRepoFile(relativePath: string): string {
  return readFileSync(join(REPO_DIR, relativePath), "utf-8");
}

function readRepoJson<T>(relativePath: string): T {
  return JSON.parse(readRepoFile(relativePath)) as T;
}

const removedDesktopSeams = [
  "@aria/desktop",
  "@aria/desktop-bridge",
  "@aria/desktop-git",
  "@aria/desktop-ui",
  "aria-desktop",
  "packages/desktop",
  "packages/desktop-bridge",
  "packages/desktop-git",
  "packages/desktop-ui",
  "apps/aria-desktop",
];
const removedClientShellSeams = [
  "@aria/mobile",
  "packages/mobile",
  "aria-mobile",
  "apps/aria-mobile",
];
const currentBootstrapFiles = [
  "package.json",
  "packages/cli/src/index.ts",
  "packages/cli/src/engine.ts",
  "packages/node-runtime/src/app.ts",
  "packages/node-host/src/daemon.ts",
  "apps/aria-node/src/index.ts",
  "apps/aria-server/src/index.ts",
] as const;
const coreRuntimeBootstrapFiles = [
  "packages/cli/src/index.ts",
  "packages/cli/src/engine.ts",
  "packages/node-runtime/src/app.ts",
  "packages/node-host/src/daemon.ts",
  "apps/aria-node/src/main.ts",
] as const;

type RootPackageJson = {
  main?: string;
  bin?: Record<string, string>;
  scripts?: Record<string, string>;
};
type TsConfigJson = {
  compilerOptions?: {
    paths?: Record<string, string[]>;
  };
};

describe("cli and runtime stability", () => {
  test("keeps removed desktop seams out of current server bootstrap paths", () => {
    for (const relativePath of coreRuntimeBootstrapFiles) {
      const source = readRepoFile(relativePath);
      for (const seam of removedDesktopSeams) {
        expect(source).not.toContain(seam);
      }
    }
  });

  test("keeps client package shells out of current runtime bootstrap paths", () => {
    for (const relativePath of currentBootstrapFiles) {
      const source = readRepoFile(relativePath);
      for (const seam of removedClientShellSeams) {
        expect(source).not.toContain(seam);
      }
    }
  });

  test("preserves current CLI and node bootstrap wiring", () => {
    const cliIndex = readRepoFile("packages/cli/src/index.ts");
    const cliEngine = readRepoFile("packages/cli/src/engine.ts");
    const runtimeDiscovery = readRepoFile("packages/runtime/src/discovery.ts");
    const nodeDaemon = readRepoFile("packages/node-host/src/daemon.ts");
    const nodeIndex = readRepoFile("apps/aria-node/src/index.ts");
    const nodeProcess = readRepoFile("apps/aria-node/src/process.ts");
    const nodeMain = readRepoFile("apps/aria-node/src/main.ts");
    const appIndex = readRepoFile("apps/aria-server/src/index.ts");
    const appProcess = readRepoFile("apps/aria-server/src/process.ts");
    const appMain = readRepoFile("apps/aria-server/src/main.ts");

    expect(cliIndex).toContain('await import("aria-node");');
    expect(cliIndex).toContain("__node_host");
    expect(cliIndex).toContain("__server_host");
    expect(cliEngine).toContain('from "@aria/node-host/daemon";');
    expect(runtimeDiscovery).toContain('from "@aria/node-host/discovery";');
    expect(nodeDaemon).toContain('from "./process.js";');
    expect(nodeDaemon).toContain("spawnAriaNodeDaemonHost");
    expect(nodeIndex).toContain('from "@aria/node-runtime"');
    expect(nodeIndex).toContain("ARIA_NODE_DAEMON_COMMAND");
    expect(nodeIndex).toContain("spawnAriaNodeDaemonHost");
    expect(nodeProcess).toContain('export * from "@aria/node-host/process";');
    expect(nodeMain).toContain('import { RUNTIME_NAME } from "@aria/node-host/brand";');
    expect(nodeMain).toContain('import { runAriaNodeDaemonHost } from "./index.js";');
    expect(nodeMain).toContain("runAriaNodeDaemonHost().catch");
    expect(appIndex).toContain('from "aria-node"');
    expect(appIndex).toContain("ARIA_SERVER_DAEMON_COMMAND");
    expect(appIndex).toContain("spawnAriaServerDaemonHost");
    expect(appProcess).toContain('from "@aria/node-host/process"');
    expect(appMain).toContain('import { RUNTIME_NAME } from "@aria/node-host/brand";');
    expect(appMain).toContain('import { runAriaServerDaemonHost } from "./index.js";');
    expect(appMain).toContain("runAriaServerDaemonHost().catch");
  });

  test("preserves the CLI-owned root entrypoints while client package shells evolve", () => {
    const rootPackage = readRepoJson<RootPackageJson>("package.json");

    expect(rootPackage.main).toBe("packages/cli/src/index.ts");
    expect(rootPackage.bin?.aria).toBe("dist/index.mjs");
    expect(rootPackage.scripts?.dev).toBe("bun run dev:node");
    expect(rootPackage.scripts?.["dev:node"]).toBe("cd apps/aria-node && bun run dev");
    expect(rootPackage.scripts?.["dev:server"]).toBe("cd apps/aria-node && bun run dev");
    expect(rootPackage.scripts?.["dev:desktop"]).toBe("cd apps/aria-desktop && bun run dev");
    expect(rootPackage.scripts?.["dev:mobile"]).toBeUndefined();
    expect(rootPackage.scripts?.build).toBe("vp run repo:build");
  });

  test("keeps the repo build pipeline building the desktop app", () => {
    const viteConfig = readRepoFile("vite.config.ts");

    expect(viteConfig).toContain(
      'command: "vp run repo:prepare-skills && vp pack && bun run --cwd apps/aria-desktop build"',
    );
  });

  test("removes the mobile shell package seams from the repo", () => {
    expect(existsSync(join(REPO_DIR, "packages/mobile/package.json"))).toBe(false);
    expect(existsSync(join(REPO_DIR, "apps/aria-mobile/package.json"))).toBe(false);
  });

  test("removes the old @aria/ui package seam from the repo", () => {
    expect(existsSync(join(REPO_DIR, "packages/ui/package.json"))).toBe(false);
  });

  test("keeps removed package aliases and stale package shells out of the repo", () => {
    const tsconfig = readRepoJson<TsConfigJson>("tsconfig.json");
    const paths = tsconfig.compilerOptions?.paths ?? {};
    const removedAliases = [
      "@aria/engine/*",
      "@aria/projects-engine",
      "@aria/projects-engine/*",
      "@aria/projects",
      "@aria/projects/*",
      "@aria/store",
      "@aria/store/*",
      "@aria/agent-aria",
      "@aria/agent-aria/*",
      "@aria/connectors-im",
      "@aria/connectors-im/*",
      "@aria/agents-coding",
      "@aria/agents-coding/*",
      "@aria/providers-aria",
      "@aria/providers-aria/*",
      "@aria/providers-codex",
      "@aria/providers-codex/*",
      "@aria/providers-claude-code",
      "@aria/providers-claude-code/*",
      "@aria/providers-opencode",
      "@aria/providers-opencode/*",
      "@aria/desktop",
      "@aria/desktop/*",
      "@aria/desktop-ui",
      "@aria/desktop-ui/*",
      "@aria/desktop-bridge",
      "@aria/desktop-bridge/*",
      "@aria/desktop-git",
      "@aria/desktop-git/*",
    ];
    const removedPackageManifests = [
      "packages/agents-coding/package.json",
      "packages/projects/package.json",
      "packages/store/package.json",
      "packages/agent-aria/package.json",
      "packages/connectors-im/package.json",
      "packages/projects-engine/package.json",
      "packages/providers-aria/package.json",
      "packages/providers-codex/package.json",
      "packages/providers-claude-code/package.json",
      "packages/providers-opencode/package.json",
      "packages/desktop/package.json",
      "packages/desktop-ui/package.json",
      "packages/desktop-bridge/package.json",
      "packages/desktop-git/package.json",
      "apps/aria-mobile/package.json",
    ];

    for (const alias of removedAliases) {
      expect(paths).not.toHaveProperty(alias);
    }
    for (const manifestPath of removedPackageManifests) {
      expect(existsSync(join(REPO_DIR, manifestPath))).toBe(false);
    }
  });
});
