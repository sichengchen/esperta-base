import { type ReactElement, type ReactNode, useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../Button";

export interface WorkspaceSectionProps {
  label: string;
  threads?: ReactNode;
  onThreadClick?: (threadId: string) => void;
  onAddThread?: () => void;
  className?: string;
}

export function WorkspaceSection({
  label,
  threads,
  onThreadClick,
  onAddThread,
  className,
}: WorkspaceSectionProps): ReactElement {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm font-medium text-[var(--aria-text)] hover:text-[var(--aria-accent)]"
        >
          <ChevronRight
            className={cn("h-4 w-4 transition-transform", expanded && "rotate-90")}
          />
          {label}
        </button>
        {onAddThread && (
          <Button variant="ghost" size="sm" onClick={onAddThread} className="h-6 w-6 p-0">
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>
      {expanded && threads && (
        <div className="ml-5 flex flex-col border-l border-[var(--aria-border)] pl-2">
          {threads}
        </div>
      )}
    </div>
  );
}
