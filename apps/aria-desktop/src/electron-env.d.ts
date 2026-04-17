interface AriaDesktopRendererConfig {
  target: {
    serverId: string;
    baseUrl: string;
    token?: string;
  };
  terminal?: {
    spawn: (id: string, cwd?: string) => Promise<{ pid: number }>;
    write: (id: string, data: string) => Promise<void>;
    resize: (id: string, cols: number, rows: number) => Promise<void>;
    kill: (id: string) => Promise<void>;
    list: () => Promise<Array<{ id: string; pid: number; cols: number; rows: number }>>;
    onData: (callback: (id: string, data: string) => void) => () => void;
    onExit: (callback: (id: string, exitCode: number) => void) => () => void;
  };
}

interface Window {
  ariaDesktop?: AriaDesktopRendererConfig;
}

declare module "*.css";
