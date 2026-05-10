import type { ReactNode } from "react";

import { Button } from "./ui/button.js";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip.js";

export type DesktopIconButtonProps = {
  active?: boolean;
  className?: string;
  controlsId?: string;
  disabled?: boolean;
  expanded?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
};

export function DesktopIconButton({
  active = false,
  className,
  controlsId,
  disabled = false,
  expanded,
  icon,
  label,
  onClick,
}: DesktopIconButtonProps) {
  const button = (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className={`desktop-icon-button${active ? " is-active" : ""}${disabled ? " is-disabled" : ""}${className ? ` ${className}` : ""}`}
      aria-controls={controlsId}
      aria-label={label}
      aria-expanded={expanded}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
    </Button>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={button} />
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
