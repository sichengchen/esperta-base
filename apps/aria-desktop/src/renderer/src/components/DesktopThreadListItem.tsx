import type { ReactNode } from "react";

type DesktopThreadListItemProps = {
  active?: boolean;
  disabled?: boolean;
  meta?: string | null;
  onSelect: () => void;
  preview?: string | null;
  trailingAction?: ReactNode;
  title: string;
};

export function DesktopThreadListItem({
  active = false,
  disabled = false,
  meta,
  onSelect,
  trailingAction,
  title,
}: DesktopThreadListItemProps) {
  return (
    <div
      className={`thread-list-item-shell${active ? " is-active" : ""}${disabled ? " is-disabled" : ""}${trailingAction ? " has-trailing-action" : ""}`}
    >
      <button
        type="button"
        className={`thread-list-item${active ? " is-active" : ""}${disabled ? " is-disabled" : ""} is-compact`}
        disabled={disabled}
        onClick={onSelect}
      >
        <span className="thread-list-item-main">
          <span className="thread-list-item-name">{title}</span>
        </span>
        {meta ? <span className="thread-list-item-meta">{meta}</span> : null}
      </button>

      {trailingAction ? (
        <div className="thread-list-item-overlay is-trailing">{trailingAction}</div>
      ) : null}
    </div>
  );
}
