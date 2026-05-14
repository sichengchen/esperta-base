import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readFile, rm, mkdtemp } from "node:fs/promises";
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
  testDir = await mkdtemp(`${tmpdir()}/aria-node-gateway-http-`);
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

describe("gateway HTTP transport and auth", () => {
  test("serves unauthenticated health without creating sessions", async () => {
    const runtime = await createTestRuntime(testDir);
    const initialSessions = runtime.sessions.listSessions().length;
    const port = await getAvailableGatewayPortPair();
    let server: EngineServer | undefined;

    try {
      server = await startServer(runtime, { port });
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: "ok" });
      expect(runtime.sessions.listSessions()).toHaveLength(initialSessions);
      expect(await readFile(join(testDir, "engine.url"), "utf-8")).toBe(`http://127.0.0.1:${port}`);
    } finally {
      await server?.stop();
    }
  });

  test("allows master token tRPC calls and rejects webhook tokens", async () => {
    const runtime = await createTestRuntime(testDir);
    const port = await getAvailableGatewayPortPair();
    let server: EngineServer | undefined;

    try {
      server = await startServer(runtime, { hostname: "127.0.0.1", port });
      const urls = {
        httpUrl: `http://127.0.0.1:${port}`,
        wsUrl: `ws://127.0.0.1:${port + 1}`,
      };
      const masterClient = createEngineClient({
        ...urls,
        token: runtime.auth.getMasterToken(),
      });
      await expect(masterClient.mainSession.info.query()).resolves.toMatchObject({
        sessionId: runtime.mainSessionId,
        session: {
          id: runtime.mainSessionId,
          connectorType: "engine",
        },
      });

      const webhookClient = createEngineClient({
        ...urls,
        token: runtime.auth.getWebhookToken(),
      });
      await expect(webhookClient.mainSession.info.query()).rejects.toThrow(
        "Webhook tokens cannot access the tRPC API",
      );
    } finally {
      await server?.stop();
    }
  });

  test("does not expose pairing code issuance on unauthenticated HTTP", async () => {
    const runtime = await createTestRuntime(testDir);
    const port = await getAvailableGatewayPortPair();
    let server: EngineServer | undefined;

    try {
      server = await startServer(runtime, { hostname: "127.0.0.1", port });
      const urls = {
        httpUrl: `http://127.0.0.1:${port}`,
        wsUrl: `ws://127.0.0.1:${port + 1}`,
      };
      const publicClient = createEngineClient(urls);
      await expect(publicClient.auth.code.query()).rejects.toThrow("Missing auth token");

      const masterClient = createEngineClient({
        ...urls,
        token: runtime.auth.getMasterToken(),
      });
      const issued = await masterClient.auth.code.query();
      expect(issued.code).toMatch(/^[A-Z2-9]{8}$/);
      const paired = await publicClient.auth.pair.mutate({
        credential: issued.code,
        connectorId: "telegram:gateway-http",
        connectorType: "telegram",
      });
      expect(paired).toMatchObject({
        paired: true,
        error: null,
      });
      expect(paired.token).toEqual(expect.any(String));

      const reused = await publicClient.auth.pair.mutate({
        credential: issued.code,
        connectorId: "telegram:gateway-http-2",
        connectorType: "telegram",
      });
      expect(reused).toMatchObject({
        paired: false,
        token: null,
      });
    } finally {
      await server?.stop();
    }
  });

  test("records explicit bind address in discovery without changing auth", async () => {
    const runtime = await createTestRuntime(testDir);
    const port = await getAvailableGatewayPortPair();
    let server: EngineServer | undefined;

    try {
      server = await startServer(runtime, { hostname: "0.0.0.0", port });
      expect(await readFile(join(testDir, "engine.url"), "utf-8")).toBe(`http://0.0.0.0:${port}`);
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      expect(response.status).toBe(200);
      const client = createEngineClient({
        httpUrl: `http://127.0.0.1:${port}`,
        wsUrl: `ws://127.0.0.1:${port + 1}`,
      });
      await expect(client.mainSession.info.query()).rejects.toThrow("Missing auth token");
    } finally {
      await server?.stop();
    }
  });
});
