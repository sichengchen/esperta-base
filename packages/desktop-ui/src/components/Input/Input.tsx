import { type ReactElement, type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "search";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, variant = "default", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-8 w-full rounded-md border border-[var(--aria-border)] bg-white px-3 text-sm text-[var(--aria-text)] placeholder:text-[var(--aria-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--aria-accent)] focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
        variant === "search" && "pl-9",
        className,
      )}
      {...props}
    />
  );
});
