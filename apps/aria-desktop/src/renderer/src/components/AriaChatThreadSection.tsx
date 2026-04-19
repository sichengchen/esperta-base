import { Archive, MessageSquarePlus, Pin } from "lucide-react";
import type { AriaDesktopSessionSummary } from "../../../shared/api.js";
import { DesktopIconButton } from "./DesktopIconButton.js";
import { DesktopSidebarSectionHeader } from "./DesktopSidebarSectionHeader.js";
import { DesktopThreadListItem } from "./DesktopThreadListItem.js";
import { useTransientScrollbar } from "./useTransientScrollbar.js";

type AriaChatThreadSectionProps = {
  disabled?: boolean;
  formatMeta: (updatedAt?: number | null) => string | null;
  pinnedSessionIds?: string[];
  onArchiveSession: (sessionId: string) => void;
  onCreateChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onTogglePinnedSession: (sessionId: string) => void;
  selectedSessionId: string | null;
  sessions: AriaDesktopSessionSummary[];
};

export function AriaChatThreadSection({
  disabled = false,
  formatMeta,
  pinnedSessionIds = [],
  onArchiveSession,
  onCreateChat,
  onSelectSession,
  onTogglePinnedSession,
  selectedSessionId,
  sessions,
}: AriaChatThreadSectionProps) {
  const { onScroll, scrollRef } = useTransientScrollbar<HTMLDivElement>();
  const pinnedSessionIdSet = new Set(pinnedSessionIds);
  const orderedSessions = [
    ...sessions.filter((session) => pinnedSessionIdSet.has(session.sessionId)),
    ...sessions.filter((session) => !pinnedSessionIdSet.has(session.sessionId)),
  ];

  return (
    <section className="desktop-chat-thread-section">
      <DesktopSidebarSectionHeader
        actions={
          <DesktopIconButton
            disabled={disabled}
            icon={<MessageSquarePlus aria-hidden="true" />}
            label="Create chat"
            onClick={onCreateChat}
          />
        }
        title="Chat"
      />

      <div
        ref={scrollRef}
        className="thread-list desktop-scroll-region"
        role="list"
        onScroll={onScroll}
      >
        {orderedSessions.map((session) => {
          const pinned = pinnedSessionIdSet.has(session.sessionId);
          return (
            <DesktopThreadListItem
              key={session.sessionId}
              active={session.sessionId === selectedSessionId}
              disabled={disabled}
              meta={session.archived ? "archived" : formatMeta(session.lastActiveAt)}
              onSelect={() => onSelectSession(session.sessionId)}
              preview={session.preview ?? session.summary ?? null}
              trailingAction={
                <div className="thread-list-item-actions">
                  <DesktopIconButton
                    active={pinned}
                    className="thread-list-item-action"
                    disabled={disabled}
                    icon={<Pin aria-hidden="true" />}
                    label={pinned ? `Unpin ${session.title}` : `Pin ${session.title}`}
                    onClick={() => onTogglePinnedSession(session.sessionId)}
                  />
                  {!session.archived ? (
                    <DesktopIconButton
                      className="thread-list-item-action"
                      disabled={disabled}
                      icon={<Archive aria-hidden="true" />}
                      label={`Archive ${session.title}`}
                      onClick={() => onArchiveSession(session.sessionId)}
                    />
                  ) : null}
                </div>
              }
              title={session.title}
            />
          );
        })}
      </div>
    </section>
  );
}
