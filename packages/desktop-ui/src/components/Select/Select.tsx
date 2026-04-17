import { type ReactElement, type ReactNode, useState, useRef, useEffect } from "react";
import { cn } from "../../lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = "Select...",
  disabled,
  className,
  "aria-label": ariaLabel,
}: SelectProps): ReactElement {
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const selectedValue = value ?? internalValue;
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === selectedValue);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (optValue: string) => {
    setInternalValue(optValue);
    onValueChange?.(optValue);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen(!open)}
        className={cn(
          "flex h-8 w-full min-w-[160px] items-center justify-between rounded-md border border-[var(--aria-border)] bg-white px-3 text-sm",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-[var(--aria-panel-muted)]",
        )}
      >
        <span className={selectedOption ? "text-[var(--aria-text)]" : "text-[var(--aria-text-muted)]"}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-[var(--aria-text-muted)] transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-md border border-[var(--aria-border)] bg-[var(--aria-panel)] py-1 shadow-lg"
        >
          {options.map((option) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === selectedValue}
              aria-disabled={option.disabled}
              onClick={() => !option.disabled && handleSelect(option.value)}
              className={cn(
                "px-3 py-2 text-sm cursor-pointer",
                option.disabled
                  ? "cursor-not-allowed opacity-50"
                  : "hover:bg-[var(--aria-panel-muted)]",
                option.value === selectedValue && "bg-[var(--aria-accent-soft)] text-[var(--aria-accent)]",
              )}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
