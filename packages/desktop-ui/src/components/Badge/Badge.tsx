import { type ReactElement, type HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "danger" | "accent";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "default",
  size = "sm",
  ...props
}: BadgeProps): ReactElement {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md border font-medium tracking-tight",
        size === "sm" && "px-1.5 py-0.5 text-[10px]",
        size === "md" && "px-2 py-1 text-xs",
        variant === "default" &&
          "border-[var(--aria-border)] bg-transparent text-[var(--aria-text-muted)]",
        variant === "success" &&
          "border-[var(--aria-success)] bg-[var(--aria-success-soft)] text-[var(--aria-success)]",
        variant === "danger" &&
          "border-[var(--aria-danger)] bg-[var(--aria-danger-soft)] text-[var(--aria-danger)]",
        variant === "accent" &&
          "border-[var(--aria-accent)] bg-[var(--aria-accent-soft)] text-[var(--aria-accent)]",
        className,
      )}
      {...props}
    />
  );
}
