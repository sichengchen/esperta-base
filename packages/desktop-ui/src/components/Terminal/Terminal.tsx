import {
  type ReactElement,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { cn } from "../../lib/utils";

import "@xterm/xterm/css/xterm.css";

export interface TerminalProps {
  sessionId: string;
  className?: string;
  onReady?: (terminal: XTerm) => void;
}

export function Terminal({
  sessionId,
  className,
  onReady,
}: TerminalProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const handleResize = useCallback(() => {
    if (fitAddonRef.current) {
      fitAddonRef.current.fit();
      const term = terminalRef.current;
      if (term) {
        window.ariaDesktop?.terminal?.resize(sessionId, term.cols, term.rows);
      }
    }
  }, [sessionId]);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        cursor: "#ffffff",
        cursorAccent: "#1e1e1e",
        selectionBackground: "#264f78",
        black: "#1e1e1e",
        red: "#f44747",
        green: "#6a9955",
        yellow: "#dcdcaa",
        blue: "#569cd6",
        magenta: "#c586c0",
        cyan: "#4ec9b0",
        white: "#d4d4d4",
        brightBlack: "#808080",
        brightRed: "#f44747",
        brightGreen: "#6a9955",
        brightYellow: "#dcdcaa",
        brightBlue: "#569cd6",
        brightMagenta: "#c586c0",
        brightCyan: "#4ec9b0",
        brightWhite: "#ffffff",
      },
      fontFamily: "SF Mono, JetBrains Mono, IBM Plex Mono, monospace",
      fontSize: 13,
      cursorBlink: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    onReady?.(term);

    // Set up resize observer
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(containerRef.current);

    // Handle terminal input
    term.onData((data: string) => {
      window.ariaDesktop?.terminal?.write(sessionId, data);
    });

    // Handle resize
    term.onResize(({ cols, rows }: { cols: number; rows: number }) => {
      window.ariaDesktop?.terminal?.resize(sessionId, cols, rows);
    });

    return () => {
      resizeObserver.disconnect();
      term.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [sessionId, onReady, handleResize]);

  // Set up data listener
  useEffect(() => {
    const terminal = window.ariaDesktop?.terminal;
    if (!terminal) return () => {};
    const unsubscribe = terminal.onData((id: string, data: string) => {
      if (id === sessionId && terminalRef.current) {
        terminalRef.current.write(data);
      }
    });
    return unsubscribe;
  }, [sessionId]);

  // Set up exit listener
  useEffect(() => {
    const terminal = window.ariaDesktop?.terminal;
    if (!terminal) return () => {};
    const unsubscribe = terminal.onExit((id: string, exitCode: number) => {
      if (id === sessionId && terminalRef.current) {
        terminalRef.current.write(`\r\n[Process exited with code ${exitCode}]\r\n`);
      }
    });
    return unsubscribe;
  }, [sessionId]);

  return (
    <div
      ref={containerRef}
      className={cn("h-full w-full overflow-hidden", className)}
      data-session-id={sessionId}
    />
  );
}
