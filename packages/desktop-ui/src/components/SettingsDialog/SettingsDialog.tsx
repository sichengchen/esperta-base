import { type ReactElement, type ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Dialog } from "../Dialog";

export interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  children?: ReactNode;
  className?: string;
}

export function SettingsDialog({
  isOpen,
  onClose,
  children,
  className,
}: SettingsDialogProps): ReactElement {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Settings"
      description="Configure your Aria Desktop preferences."
      className={cn("max-w-md", className)}
    >
      <div className="py-4">{children}</div>
    </Dialog>
  );
}

export interface SettingsSectionProps {
  title: string;
  children?: ReactNode;
  className?: string;
}

export function SettingsSection({
  title,
  children,
  className,
}: SettingsSectionProps): ReactElement {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--aria-text-muted)]">
        {title}
      </h3>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

export interface SettingsRowProps {
  label: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

export function SettingsRow({
  label,
  description,
  children,
  className,
}: SettingsRowProps): ReactElement {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="flex flex-col">
        <label className="text-sm font-medium text-[var(--aria-text)]">
          {label}
        </label>
        {description && (
          <span className="text-xs text-[var(--aria-text-muted)]">
            {description}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
