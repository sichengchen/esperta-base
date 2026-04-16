#!/usr/bin/env bun

import { spawn, type ChildProcess } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const desktopDir = join(dirname(fileURLToPath(import.meta.url)), "..");

const childProcesses = new Set<ChildProcess>();
let shuttingDown = false;
let hostStarted = false;
let hostStartPending = false;
let startHostTimer: ReturnType<typeof setTimeout> | null = null;

function forwardOutput(
  child: ChildProcess,
  label: string,
  stream: NodeJS.ReadableStream | null,
  sink: (chunk: string) => void,
) {
  if (!stream) {
    return;
  }

  stream.on("data", (chunk) => {
    const text = chunk.toString();
    for (const line of text.split(/\r?\n/)) {
      if (!line) {
        continue;
      }
      sink(`[${label}] ${line}`);
    }
  });
}

function killChild(child: ChildProcess) {
  if (child.killed || child.exitCode !== null) {
    return;
  }

  child.kill("SIGTERM");
}

function shutdown(code: number) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  if (startHostTimer) {
    clearTimeout(startHostTimer);
    startHostTimer = null;
  }

  for (const child of childProcesses) {
    killChild(child);
  }

  const forceExit = setTimeout(() => {
    for (const child of childProcesses) {
      if (!child.killed && child.exitCode === null) {
        child.kill("SIGKILL");
      }
    }
    process.exit(code);
  }, 2_000);
  process.exitCode = code;
}

function spawnDesktopProcess(label: string, args: string[]) {
  const child = spawn(process.execPath, args, {
    cwd: desktopDir,
    env: process.env,
    stdio: ["inherit", "pipe", "pipe"],
  });
  childProcesses.add(child);

  forwardOutput(child, label, child.stdout, (line) => console.log(line));
  forwardOutput(child, label, child.stderr, (line) => console.error(line));

  child.on("exit", (code, signal) => {
    childProcesses.delete(child);
    if (shuttingDown) {
      return;
    }

    if (signal) {
      shutdown(1);
      return;
    }

    shutdown(code ?? 0);
  });

  return child;
}

async function waitForRenderer(url: string) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  return false;
}

function extractLocalUrl(text: string): string | null {
  const match = text.match(/Local:\s+(http:\/\/[^\s]+)/);
  return match?.[1] ?? null;
}

async function startHost(devServerUrl = "http://127.0.0.1:5173/") {
  if (hostStarted || hostStartPending) {
    return;
  }

  hostStartPending = true;
  const ready = await waitForRenderer(devServerUrl);
  hostStartPending = false;

  if (!ready || shuttingDown || hostStarted) {
    return;
  }

  hostStarted = true;
  const child = spawn(process.execPath, ["run", "dev:host"], {
    cwd: desktopDir,
    env: {
      ...process.env,
      ARIA_DESKTOP_DEV_SERVER_URL: devServerUrl,
    },
    stdio: ["inherit", "pipe", "pipe"],
  });
  childProcesses.add(child);

  forwardOutput(child, "desktop:host", child.stdout, (line) => console.log(line));
  forwardOutput(child, "desktop:host", child.stderr, (line) => console.error(line));

  child.on("exit", (code, signal) => {
    childProcesses.delete(child);
    if (shuttingDown) {
      return;
    }

    if (signal) {
      shutdown(1);
      return;
    }

    shutdown(code ?? 0);
  });
}

const renderer = spawnDesktopProcess("desktop:renderer", ["run", "dev:renderer"]);

renderer.stdout?.on("data", (chunk) => {
  if (hostStarted) {
    return;
  }

  const text = chunk.toString();
  const localUrl = extractLocalUrl(text);
  if (localUrl) {
    void startHost(localUrl);
  }
});

startHostTimer = setTimeout(() => {
  void startHost();
}, 2_000);

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
