import { type ReactElement, type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "secondary", size = "md", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 border font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aria-accent)] disabled:pointer-events-none disabled:opacity-50",
        // Size
        size === "sm" && "h-7 min-w-[60px] px-2 text-xs",
        size === "md" && "h-8 min-w-[80px] px-3 text-sm",
        size === "lg" && "h-10 min-w-[100px] px-4 text-base",
        // Variants
        variant === "primary" &&
          "border-transparent bg-[var(--aria-accent)] text-white hover:opacity-90",
        variant === "secondary" &&
          "border-[var(--aria-border)] bg-[var(--aria-panel)] text-[var(--aria-text)] hover:bg-[var(--aria-panel-muted)]",
        variant === "ghost" &&
          "border-transparent bg-transparent text-[var(--aria-text-muted)] hover:bg-[var(--aria-panel-muted)] hover:text-[var(--aria-text)]",
        variant === "danger" &&
          "border-[var(--aria-border)] bg-[var(--aria-panel)] text-[var(--aria-danger)] hover:bg-[var(--aria-danger-soft)]",
        className,
      )}
      {...props}
    />
  );
});
