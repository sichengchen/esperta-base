import { ipcMain, BrowserWindow } from "electron";
import * as pty from "node-pty";

interface TerminalSession {
  id: string;
  pid: number;
  cols: number;
  rows: number;
  pty: pty.IPty;
}

const terminals = new Map<string, TerminalSession>();

export function setupTerminalIPC() {
  ipcMain.handle("terminal:spawn", (event, id: string, cwd: string) => {
    const shell = process.platform === "win32" ? "powershell.exe" : "zsh";
    const term = pty.spawn(shell, [], {
      cwd: cwd || process.env.HOME || process.cwd(),
      env: process.env as Record<string, string>,
    });

    terminals.set(id, {
      id,
      pid: term.pid,
      cols: 80,
      rows: 24,
      pty: term,
    });

    term.onData((data) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        win.webContents.send("terminal:data", id, data);
      }
    });

    term.onExit(({ exitCode }) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        win.webContents.send("terminal:exit", id, exitCode);
      }
      terminals.delete(id);
    });

    return { pid: term.pid };
  });

  ipcMain.handle("terminal:write", (_event, id: string, data: string) => {
    terminals.get(id)?.pty.write(data);
  });

  ipcMain.handle("terminal:resize", (_event, id: string, cols: number, rows: number) => {
    const session = terminals.get(id);
    if (session) {
      session.cols = cols;
      session.rows = rows;
      session.pty.resize(cols, rows);
    }
  });

  ipcMain.handle("terminal:kill", (_event, id: string) => {
    const session = terminals.get(id);
    if (session) {
      session.pty.kill();
      terminals.delete(id);
    }
  });

  ipcMain.handle("terminal:list", () => {
    return Array.from(terminals.values()).map((s) => ({
      id: s.id,
      pid: s.pid,
      cols: s.cols,
      rows: s.rows,
    }));
  });
}

export function cleanupTerminals() {
  for (const session of terminals.values()) {
    session.pty.kill();
  }
  terminals.clear();
}
