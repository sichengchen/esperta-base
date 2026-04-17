import { create } from "zustand";

export interface TerminalSession {
  id: string;
  pid: number;
  cols: number;
  rows: number;
}

interface TerminalState {
  sessions: Record<string, TerminalSession>;
  activeSessionId: string | null;
}

interface TerminalActions {
  addSession: (session: TerminalSession) => void;
  removeSession: (id: string) => void;
  setActiveSession: (id: string | null) => void;
  updateSessionSize: (id: string, cols: number, rows: number) => void;
}

export type TerminalStore = TerminalState & TerminalActions;

export const useTerminalStore = create<TerminalStore>((set) => ({
  sessions: {},
  activeSessionId: null,

  addSession: (session) =>
    set((state) => ({
      sessions: { ...state.sessions, [session.id]: session },
      activeSessionId: session.id,
    })),

  removeSession: (id) =>
    set((state) => {
      const { [id]: _, ...rest } = state.sessions;
      return {
        sessions: rest,
        activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
      };
    }),

  setActiveSession: (id) => set({ activeSessionId: id }),

  updateSessionSize: (id, cols, rows) =>
    set((state) => {
      const session = state.sessions[id];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [id]: { ...session, cols, rows },
        },
      };
    }),
}));

// Terminal spawn helper that wires up IPC to the store
export async function spawnTerminal(id: string, cwd?: string): Promise<TerminalSession> {
  const terminal = window.ariaDesktop?.terminal;
  if (!terminal) throw new Error("Terminal IPC not available");
  const { pid } = await terminal.spawn(id, cwd);
  const session: TerminalSession = { id, pid, cols: 80, rows: 24 };
  useTerminalStore.getState().addSession(session);
  return session;
}

export async function writeToTerminal(id: string, data: string): Promise<void> {
  const terminal = window.ariaDesktop?.terminal;
  if (!terminal) return;
  await terminal.write(id, data);
}

export async function resizeTerminal(id: string, cols: number, rows: number): Promise<void> {
  const terminal = window.ariaDesktop?.terminal;
  if (!terminal) return;
  await terminal.resize(id, cols, rows);
  useTerminalStore.getState().updateSessionSize(id, cols, rows);
}

export async function killTerminal(id: string): Promise<void> {
  const terminal = window.ariaDesktop?.terminal;
  if (!terminal) return;
  await terminal.kill(id);
  useTerminalStore.getState().removeSession(id);
}

export function setupTerminalDataListener(
  onData: (id: string, data: string) => void,
): () => void {
  const terminal = window.ariaDesktop?.terminal;
  if (!terminal) return () => {};
  return terminal.onData(onData);
}

export function setupTerminalExitListener(
  onExit: (id: string, exitCode: number) => void,
): () => void {
  const terminal = window.ariaDesktop?.terminal;
  if (!terminal) return () => {};
  return terminal.onExit(onExit);
}
