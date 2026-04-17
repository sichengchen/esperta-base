import { type ReactElement, type ReactNode, useRef } from "react";
import { cn } from "../../lib/utils";

export interface ScrollAreaProps {
  children?: ReactNode;
  className?: string;
  orientation?: "vertical" | "horizontal" | "both";
}

export function ScrollArea({
  children,
  className,
  orientation = "vertical",
}: ScrollAreaProps): ReactElement {
  const viewportRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={viewportRef}
      className={cn(
        "overflow-auto",
        orientation === "vertical" && "overflow-y-auto",
        orientation === "horizontal" && "overflow-x-auto",
        className,
      )}
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "var(--aria-border-strong) transparent",
      }}
    >
      {children}
    </div>
  );
}
