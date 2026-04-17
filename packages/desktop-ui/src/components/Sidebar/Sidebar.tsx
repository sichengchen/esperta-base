import { type ReactElement, type ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Tabs, TabList, Tab } from "../Tabs";
import { Separator } from "../Separator";

export interface SidebarProps {
  children?: ReactNode;
  className?: string;
}

export interface SidebarHeaderProps {
  children?: ReactNode;
  className?: string;
}

export interface SidebarContentProps {
  children?: ReactNode;
  className?: string;
}

export interface SidebarFooterProps {
  children?: ReactNode;
  className?: string;
}

export function Sidebar({ children, className }: SidebarProps): ReactElement {
  return (
    <div className={cn("flex min-h-0 min-w-0 flex-col", className)}>
      {children}
    </div>
  );
}

export function SidebarHeader({ children, className }: SidebarHeaderProps): ReactElement {
  return (
    <div className={cn("flex flex-col gap-2 p-3 border-b border-[var(--aria-border)]", className)}>
      {children}
    </div>
  );
}

export function SidebarContent({ children, className }: SidebarContentProps): ReactElement {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-auto p-3", className)}>
      {children}
    </div>
  );
}

export function SidebarFooter({ children, className }: SidebarFooterProps): ReactElement {
  return (
    <div className={cn("flex items-center gap-2 p-3 border-t border-[var(--aria-border)]", className)}>
      {children}
    </div>
  );
}

export interface SidebarSectionProps {
  title?: string;
  children?: ReactNode;
  className?: string;
}

export function SidebarSection({ title, children, className }: SidebarSectionProps): ReactElement {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {title && (
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--aria-text-muted)]">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
