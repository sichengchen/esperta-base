import type { ReactNode } from "react";

import { Button } from "./ui/button.js";

export type DesktopSidebarButtonProps = {
  active?: boolean;
  className?: string;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
};

export function DesktopSidebarButton({
  active = false,
  className,
  disabled = false,
  icon,
  label,
  onClick,
}: DesktopSidebarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="default"
      className={`desktop-sidebar-button${active ? " is-active" : ""}${disabled ? " is-disabled" : ""}${className ? ` ${className}` : ""}`}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="desktop-sidebar-button-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="desktop-sidebar-button-label">{label}</span>
    </Button>
  );
}
