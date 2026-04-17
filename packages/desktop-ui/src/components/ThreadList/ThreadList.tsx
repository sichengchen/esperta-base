import { type ReactElement } from "react";
import { cn } from "../../lib/utils";
import { Badge } from "../Badge";

export interface ThreadListItem {
  id: string;
  title: string;
  status?: string;
  threadTypeLabel?: string;
}

export interface ThreadListProps {
  items?: ThreadListItem[];
  activeId?: string;
  onItemClick?: (id: string) => void;
  className?: string;
}

export function ThreadList({
  items,
  activeId,
  onItemClick,
  className,
}: ThreadListProps): ReactElement {
  if (!items || items.length === 0) {
    return (
      <p className="py-2 text-xs text-[var(--aria-text-muted)]">No threads yet.</p>
    );
  }

  return (
    <ul className={cn("flex flex-col", className)}>
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onItemClick?.(item.id)}
            className={cn(
              "flex w-full flex-col items-start gap-1 rounded-md px-2 py-2 text-left transition-colors",
              item.id === activeId
                ? "bg-[var(--aria-panel-active)]"
                : "hover:bg-[var(--aria-panel-muted)]",
            )}
          >
            <span className="text-sm font-medium text-[var(--aria-text)] line-clamp-1">
              {item.title}
            </span>
            <div className="flex items-center gap-1">
              {item.status && (
                <Badge variant="default" size="sm">
                  {item.status}
                </Badge>
              )}
              {item.threadTypeLabel && (
                <span className="text-[10px] text-[var(--aria-text-muted)]">
                  {item.threadTypeLabel}
                </span>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
