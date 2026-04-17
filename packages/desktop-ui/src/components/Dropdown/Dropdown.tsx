import { type ReactElement, type ReactNode, useState, useRef, useEffect } from "react";
import { cn } from "../../lib/utils";
import { ChevronDown } from "lucide-react";

export interface DropdownItem {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
  onClick?: () => void;
}

export interface DropdownProps {
  trigger?: ReactNode;
  items: DropdownItem[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  align?: "start" | "end";
}

export function Dropdown({
  trigger,
  items,
  open,
  onOpenChange,
  className,
  align = "start",
}: DropdownProps): ReactElement {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setIsOpen = (value: boolean) => {
    setInternalOpen(value);
    onOpenChange?.(value);
  };
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1"
      >
        {trigger ?? <ChevronDown className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 mt-1 min-w-[180px] rounded-md border border-[var(--aria-border)] bg-[var(--aria-panel)] py-1 shadow-lg",
            align === "start" && "left-0",
            align === "end" && "right-0",
          )}
        >
          {items.map((item, index) =>
            item.separator ? (
              <div
                key={`sep-${index}`}
                className="my-1 h-px bg-[var(--aria-border)]"
              />
            ) : (
              <button
                key={item.id}
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  item.onClick?.();
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                  item.disabled
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer hover:bg-[var(--aria-panel-muted)]",
                  item.danger && "text-[var(--aria-danger)]",
                )}
              >
                {item.icon && <span className="h-4 w-4">{item.icon}</span>}
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
