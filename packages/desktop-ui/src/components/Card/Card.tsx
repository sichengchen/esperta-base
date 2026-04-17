import { type ReactElement, type HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "soft" | "lead" | "error";
}

export function Card({
  className,
  variant = "default",
  ...props
}: CardProps): ReactElement {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-lg border border-[var(--aria-border)] bg-white p-3",
        variant === "soft" && "bg-[var(--aria-panel-muted)]",
        variant === "lead" && "border-[var(--aria-accent)]/30",
        variant === "error" && "border-[var(--aria-danger)]/30 bg-red-50/50",
        className,
      )}
      {...props}
    />
  );
}
