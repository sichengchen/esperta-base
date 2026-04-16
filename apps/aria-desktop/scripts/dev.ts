#!/usr/bin/env bun

import { spawn, type ChildProcess } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const desktopDir = join(dirname(fileURLToPath(import.meta.url)), "..");

const childProcesses = new Set<ChildProcess>();
let shuttingDown = false;
let hostStarted = false;
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

function startHost() {
  if (hostStarted) {
    return;
  }

  hostStarted = true;
  spawnDesktopProcess("desktop:host", ["run", "dev:host"]);
}

const renderer = spawnDesktopProcess("desktop:renderer", ["run", "dev:renderer"]);

renderer.stdout?.on("data", (chunk) => {
  if (hostStarted) {
    return;
  }

  const text = chunk.toString();
  if (text.includes("Local:") || text.includes("ready in")) {
    startHost();
  }
});

startHostTimer = setTimeout(() => {
  startHost();
}, 2_000);

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
