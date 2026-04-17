import { type ReactElement, type ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface AppFrameProps {
  children?: ReactNode;
  className?: string;
}

export interface AppFrameHeaderProps {
  children?: ReactNode;
  className?: string;
}

export interface AppFrameWorkbenchProps {
  children?: ReactNode;
  className?: string;
}

export interface AppFrameSidebarProps {
  children?: ReactNode;
  className?: string;
}

export interface AppFrameCenterProps {
  children?: ReactNode;
  className?: string;
}

export interface AppFrameRightRailProps {
  children?: ReactNode;
  className?: string;
}

export interface AppFrameFooterProps {
  children?: ReactNode;
  className?: string;
}

export function AppFrame({ children, className }: AppFrameProps): ReactElement {
  return (
    <div
      className={cn("flex flex-col h-full min-h-0 bg-[var(--aria-bg)]", className)}
    >
      {children}
    </div>
  );
}

export function AppFrameHeader({ children, className }: AppFrameHeaderProps): ReactElement {
  return (
    <header
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 min-h-[56px] border-b border-[var(--aria-border)] bg-[var(--aria-panel)] px-4",
        className,
      )}
    >
      {children}
    </header>
  );
}

export function AppFrameWorkbench({ children, className }: AppFrameWorkbenchProps): ReactElement {
  return (
    <main
      className={cn(
        "grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)_320px]",
        className,
      )}
    >
      {children}
    </main>
  );
}

export function AppFrameSidebar({ children, className }: AppFrameSidebarProps): ReactElement {
  return (
    <aside
      className={cn(
        "flex min-h-0 min-w-0 flex-col bg-[var(--aria-panel)] border-r border-[var(--aria-border)]",
        className,
      )}
    >
      {children}
    </aside>
  );
}

export function AppFrameCenter({ children, className }: AppFrameCenterProps): ReactElement {
  return (
    <section
      className={cn(
        "flex min-h-0 min-w-0 flex-col bg-[var(--aria-panel)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function AppFrameRightRail({ children, className }: AppFrameRightRailProps): ReactElement {
  return (
    <aside
      className={cn(
        "flex min-h-0 min-w-0 flex-col bg-[var(--aria-panel)] border-l border-[var(--aria-border)]",
        className,
      )}
    >
      {children}
    </aside>
  );
}

export function AppFrameFooter({ children, className }: AppFrameFooterProps): ReactElement {
  return (
    <footer
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)] items-stretch gap-3 min-h-[112px] border-t border-[var(--aria-border)] bg-[var(--aria-panel)] p-3",
        className,
      )}
    >
      {children}
    </footer>
  );
}
