import {
  type ReactElement,
  type ReactNode,
  createContext,
  useContext,
  useState,
  useId,
} from "react";
import { cn } from "../../lib/utils";

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children?: ReactNode;
  className?: string;
}

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className,
}: TabsProps): ReactElement {
  const baseId = useId();
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const activeTab = value ?? internalValue;

  const setActiveTab = (id: string) => {
    if (value === undefined) setInternalValue(id);
    onValueChange?.(id);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, baseId }}>
      <div className={cn("flex flex-col", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export interface TabListProps {
  children?: ReactNode;
  className?: string;
  "aria-label"?: string;
}

export function TabList({
  children,
  className,
  "aria-label": ariaLabel,
}: TabListProps): ReactElement {
  const { baseId } = useContext(TabsContext)!;

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex items-stretch border-b border-[var(--aria-border)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface TabProps {
  value: string;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function Tab({ value, children, className, disabled }: TabProps): ReactElement {
  const { activeTab, setActiveTab, baseId } = useContext(TabsContext)!;
  const isActive = activeTab === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`${baseId}-panel-${value}`}
      id={`${baseId}-tab-${value}`}
      disabled={disabled}
      onClick={() => setActiveTab(value)}
      className={cn(
        "inline-flex min-h-[32px] items-center justify-center border-r border-[var(--aria-border)] bg-transparent px-3 text-sm transition-colors",
        isActive
          ? "bg-[var(--aria-panel-active)] text-[var(--aria-text)]"
          : "text-[var(--aria-text-muted)] hover:bg-[var(--aria-panel-muted)] hover:text-[var(--aria-text)]",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export interface TabPanelProps {
  value: string;
  children?: ReactNode;
  className?: string;
}

export function TabPanel({ value, children, className }: TabPanelProps): ReactElement | null {
  const { activeTab, baseId } = useContext(TabsContext)!;

  if (activeTab !== value) return null;

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      className={cn("flex-1 overflow-auto p-3", className)}
    >
      {children}
    </div>
  );
}
