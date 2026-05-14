import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createEngineClient } from "@aria/access-client";
import { startServer, type EngineServer } from "@aria/gateway/server";
import { createTestRuntime, getAvailableGatewayPortPair } from "../helpers/server-runtime.js";

let testDir: string;
let previousAriaHome: string | undefined;
let previousTestApiKey: string | undefined;

beforeEach(async () => {
  previousAriaHome = process.env.ARIA_HOME;
  previousTestApiKey = process.env.TEST_API_KEY;
  testDir = await mkdtemp(`${tmpdir()}/aria-node-checkpoints-e2e-`);
  process.env.ARIA_HOME = testDir;
});

afterEach(async () => {
  if (previousAriaHome === undefined) {
    delete process.env.ARIA_HOME;
  } else {
    process.env.ARIA_HOME = previousAriaHome;
  }

  if (previousTestApiKey === undefined) {
    delete process.env.TEST_API_KEY;
  } else {
    process.env.TEST_API_KEY = previousTestApiKey;
  }

  await rm(testDir, { recursive: true, force: true });
});

describe("checkpoint server workflow", () => {
  test("lists, diffs, and restores checkpointed workdirs through the gateway", async () => {
    const runtime = await createTestRuntime(testDir);
    const workdir = join(testDir, "workspace");
    const notePath = join(workdir, "note.txt");
    await mkdir(workdir, { recursive: true });
    await writeFile(notePath, "initial checkpoint\n");

    expect(await runtime.checkpoints.ensureCheckpoint(workdir, "initial snapshot")).toBe(true);
    runtime.checkpoints.newTurn();
    await writeFile(notePath, "updated checkpoint\n");
    expect(await runtime.checkpoints.ensureCheckpoint(workdir, "updated snapshot")).toBe(true);

    const port = await getAvailableGatewayPortPair();
    let server: EngineServer | undefined;

    try {
      server = await startServer(runtime, { hostname: "127.0.0.1", port });
      const adminClient = createEngineClient({
        httpUrl: `http://127.0.0.1:${port}`,
        wsUrl: `ws://127.0.0.1:${port + 1}`,
        token: runtime.auth.getMasterToken(),
      });

      const listed = await adminClient.checkpoint.list.query({ workingDir: workdir });
      expect(listed.workingDir).toBe(workdir);
      expect(listed.checkpoints.map((checkpoint) => checkpoint.reason)).toEqual([
        "updated snapshot",
        "initial snapshot",
      ]);

      const initial = listed.checkpoints.find(
        (checkpoint) => checkpoint.reason === "initial snapshot",
      );
      expect(initial).toBeDefined();

      const diff = await adminClient.checkpoint.diff.query({
        workingDir: workdir,
        commitHash: initial!.hash,
      });
      expect(diff).toMatchObject({ workingDir: workdir, success: true });
      expect(diff.diff).toContain("-initial checkpoint");
      expect(diff.diff).toContain("+updated checkpoint");

      const escapedRestore = await adminClient.checkpoint.restore.mutate({
        workingDir: workdir,
        commitHash: initial!.hash,
        filePath: "../outside.txt",
      });
      expect(escapedRestore).toMatchObject({
        workingDir: workdir,
        success: false,
        error: "filePath escapes the working directory.",
      });

      const restored = await adminClient.checkpoint.restore.mutate({
        workingDir: workdir,
        commitHash: initial!.hash,
        filePath: "note.txt",
      });
      expect(restored).toMatchObject({ workingDir: workdir, success: true });
      expect(await readFile(notePath, "utf-8")).toBe("initial checkpoint\n");

      const paired = runtime.auth.pair(
        runtime.auth.getMasterToken(),
        "telegram:checkpoint",
        "telegram",
      );
      expect(paired.success).toBe(true);
      const sessionClient = createEngineClient({
        httpUrl: `http://127.0.0.1:${port}`,
        wsUrl: `ws://127.0.0.1:${port + 1}`,
        token: paired.token!,
      });
      await expect(sessionClient.checkpoint.list.query({ workingDir: workdir })).rejects.toThrow(
        "workingDir overrides require the master token",
      );
    } finally {
      await server?.stop();
    }
  });
});
