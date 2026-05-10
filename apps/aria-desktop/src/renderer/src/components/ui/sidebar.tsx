"use client";

import * as React from "react";

import { PanelLeftOpen } from "src/renderer/src/components/DesktopIcon";
import { Button } from "src/renderer/src/components/ui/button";
import { cn } from "src/renderer/src/lib/utils";

const SIDEBAR_WIDTH = "16rem";

type SidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);

  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }

  return context;
}

type SidebarProviderProps = React.ComponentProps<"div"> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function SidebarProvider({
  className,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  style,
  ...props
}: SidebarProviderProps) {
  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;
  const setOpen = React.useCallback(
    (value: boolean) => {
      onOpenChange?.(value);

      if (openProp === undefined) {
        _setOpen(value);
      }
    },
    [onOpenChange, openProp],
  );
  const contextValue = React.useMemo<SidebarContextValue>(
    () => ({ open, setOpen }),
    [open, setOpen],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        data-slot="sidebar-provider"
        data-state={open ? "expanded" : "collapsed"}
        className={cn(
          "group/sidebar-wrapper flex min-h-svh w-full has-data-[slot=sidebar-inset]:bg-sidebar",
          className,
        )}
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            ...style,
          } as React.CSSProperties
        }
        {...props}
      />
    </SidebarContext.Provider>
  );
}

type SidebarProps = React.ComponentProps<"aside"> & {
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
};

function Sidebar({ className, side = "left", variant = "sidebar", ...props }: SidebarProps) {
  const { open } = useSidebar();

  return (
    <aside
      data-slot="sidebar"
      data-side={side}
      data-state={open ? "expanded" : "collapsed"}
      data-variant={variant}
      className={cn(
        "group/sidebar flex h-svh w-(--sidebar-width) shrink-0 flex-col bg-sidebar text-sidebar-foreground",
        "data-[side=left]:border-r data-[side=right]:border-l data-[side=left]:border-sidebar-border data-[side=right]:border-sidebar-border",
        "data-[variant=floating]:rounded-lg data-[variant=floating]:border data-[variant=floating]:shadow-sm",
        "data-[variant=inset]:m-2 data-[variant=inset]:h-[calc(100svh-1rem)] data-[variant=inset]:rounded-lg data-[variant=inset]:border data-[variant=inset]:shadow-sm",
        "group-data-[state=collapsed]/sidebar-wrapper:hidden",
        className,
      )}
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn("flex min-h-12 shrink-0 flex-col gap-2 p-2", className)}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn("flex shrink-0 flex-col gap-2 p-2", className)}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2", className)}
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group"
      className={cn("relative flex w-full min-w-0 flex-col gap-1", className)}
      {...props}
    />
  );
}

function SidebarGroupLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-label"
      className={cn(
        "flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none",
        className,
      )}
      {...props}
    />
  );
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="sidebar-group-content" className={cn("w-full text-sm", className)} {...props} />
  );
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-menu"
      role="list"
      className={cn("flex w-full min-w-0 flex-col gap-1", className)}
      {...props}
    />
  );
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-menu-item"
      role="listitem"
      className={cn("relative min-w-0", className)}
      {...props}
    />
  );
}

type SidebarMenuButtonProps = React.ComponentProps<typeof Button> & {
  isActive?: boolean;
};

function SidebarMenuButton({
  className,
  isActive,
  size = "sm",
  variant = "ghost",
  ...props
}: SidebarMenuButtonProps) {
  return (
    <Button
      data-slot="sidebar-menu-button"
      data-active={isActive ? "true" : undefined}
      variant={variant}
      size={size}
      className={cn(
        "w-full justify-start rounded-md px-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn("relative flex min-w-0 flex-1 flex-col bg-background", className)}
      {...props}
    />
  );
}

function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {
  const { open, setOpen } = useSidebar();

  return (
    <Button
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon-sm"
      className={className}
      onClick={(event) => {
        onClick?.(event);
        setOpen(!open);
      }}
      {...props}
    >
      <PanelLeftOpen aria-hidden="true" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
};
