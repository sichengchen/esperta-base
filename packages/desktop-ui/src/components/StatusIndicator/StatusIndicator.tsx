import { type ReactElement } from "react";
import { cn } from "../../lib/utils";

export interface StatusIndicatorProps {
  connected: boolean;
  modelName?: string;
  sessionId?: string;
  className?: string;
}

export function StatusIndicator({
  connected,
  modelName,
  sessionId,
  className,
}: StatusIndicatorProps): ReactElement {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 text-xs text-[var(--aria-text-muted)]",
        className,
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          connected
            ? "bg-[var(--aria-success)]"
            : "bg-[var(--aria-danger)]",
        )}
        title={connected ? "Connected" : "Disconnected"}
      />
      {modelName && <span>{modelName}</span>}
      {sessionId && (
        <span className="font-mono text-[10px]">{sessionId.slice(0, 8)}</span>
      )}
    </div>
  );
}
