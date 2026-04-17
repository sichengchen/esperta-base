import {
  type ReactElement,
  type ReactNode,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { cn } from "../../lib/utils";
import { Search, Command } from "lucide-react";

export interface CommandItem {
  id: string;
  label: string;
  shortcut?: string;
  category?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCommand: (command: CommandItem) => void;
  commands: CommandItem[];
  className?: string;
  placeholder?: string;
}

function fuzzyMatch(text: string, query: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let queryIndex = 0;
  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }
  return queryIndex === lowerQuery.length;
}

export function CommandPalette({
  isOpen,
  onClose,
  onSelectCommand,
  commands,
  className,
  placeholder = "Type a command...",
}: CommandPaletteProps): ReactElement | null {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    return commands.filter((cmd) => fuzzyMatch(cmd.label, query));
  }, [commands, query]);

  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    for (const cmd of filteredCommands) {
      const category = cmd.category || "General";
      if (!groups[category]) groups[category] = [];
      groups[category].push(cmd);
    }
    return groups;
  }, [filteredCommands]);

  const flatCommands = useMemo(
    () => filteredCommands.filter((cmd) => !cmd.disabled),
    [filteredCommands],
  );

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, flatCommands.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (flatCommands[selectedIndex]) {
            onSelectCommand(flatCommands[selectedIndex]);
            onClose();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [flatCommands, selectedIndex, onSelectCommand, onClose],
  );

  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector(
      "[data-selected='true']",
    ) as HTMLElement | null;
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!isOpen) return null;

  let currentIndex = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className={cn(
          "relative w-full max-w-lg overflow-hidden rounded-lg border border-[var(--aria-border)] bg-white shadow-2xl",
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-[var(--aria-border)] px-4">
          <Search className="h-4 w-4 shrink-0 text-[var(--aria-text-muted)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="h-12 flex-1 border-0 bg-transparent text-sm text-[var(--aria-text)] placeholder:text-[var(--aria-text-muted)] focus:outline-none"
            aria-label="Search commands"
          />
          <kbd className="rounded border border-[var(--aria-border)] bg-[var(--aria-panel-muted)] px-1.5 py-0.5 text-xs text-[var(--aria-text-muted)]">
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div
          ref={listRef}
          className="max-h-[300px] overflow-y-auto p-2"
          role="listbox"
          aria-label="Commands"
        >
          {flatCommands.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--aria-text-muted)]">
              No commands found
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category}>
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--aria-text-muted)]">
                  {category}
                </div>
                {cmds.map((cmd) => {
                  const isSelected = currentIndex === selectedIndex;
                  if (!cmd.disabled) currentIndex++;
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      data-selected={isSelected}
                      disabled={cmd.disabled}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        isSelected
                          ? "bg-[var(--aria-accent-soft)] text-[var(--aria-text)]"
                          : "text-[var(--aria-text-muted)] hover:bg-[var(--aria-panel-muted)] hover:text-[var(--aria-text)]",
                        cmd.disabled && "cursor-not-allowed opacity-50",
                      )}
                      onClick={() => {
                        if (!cmd.disabled) {
                          onSelectCommand(cmd);
                          onClose();
                        }
                      }}
                    >
                      <span className="flex items-center gap-2">
                        {cmd.icon}
                        {cmd.label}
                      </span>
                      {cmd.shortcut && (
                        <kbd className="rounded border border-[var(--aria-border)] bg-[var(--aria-panel-muted)] px-1.5 py-0.5 text-xs">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--aria-border)] px-4 py-2 text-xs text-[var(--aria-text-muted)]">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-[var(--aria-border)] bg-[var(--aria-panel-muted)] px-1">
              ↑↓
            </kbd>
            to navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-[var(--aria-border)] bg-[var(--aria-panel-muted)] px-1">
              ↵
            </kbd>
            to select
          </span>
        </div>
      </div>
    </div>
  );
}
