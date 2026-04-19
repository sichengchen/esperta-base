import { useEffect, useRef } from "react";
import type { AriaDesktopChatState } from "../../../shared/api.js";
import { AriaMarkdown } from "./AriaMarkdown.js";
import { AriaMessageItem } from "./AriaMessageItem.js";
import { AriaStreamingIndicator } from "./AriaStreamingIndicator.js";
import { useTransientScrollbar } from "./useTransientScrollbar.js";

type AriaMessageStreamProps = {
  chat: AriaDesktopChatState;
};

export function AriaMessageStream({ chat }: AriaMessageStreamProps) {
  const { onScroll, scrollRef: streamRef, showScrollbar } = useTransientScrollbar<HTMLDivElement>();
  const autoScrollRef = useRef(true);

  function scrollToBottom(): void {
    const streamElement = streamRef.current;
    if (!streamElement) {
      return;
    }

    streamElement.scrollTop = streamElement.scrollHeight;
    showScrollbar();
  }

  useEffect(() => {
    autoScrollRef.current = true;
    scrollToBottom();
    const rafId = window.requestAnimationFrame(() => {
      scrollToBottom();
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [chat.sessionId]);

  useEffect(() => {
    if (!autoScrollRef.current) {
      return;
    }

    scrollToBottom();
  }, [
    chat.isStreaming,
    chat.messages.length,
    chat.pendingApproval?.toolCallId,
    chat.pendingQuestion?.questionId,
    chat.streamingText,
  ]);

  return (
    <div
      ref={streamRef}
      className="aria-message-stream desktop-scroll-region"
      onScroll={() => {
        onScroll();
        const streamElement = streamRef.current;
        if (!streamElement) {
          return;
        }

        const distanceFromBottom =
          streamElement.scrollHeight - streamElement.scrollTop - streamElement.clientHeight;
        autoScrollRef.current = distanceFromBottom < 24;
      }}
    >
      <div className="aria-message-stream-lane">
        {chat.messages.map((message) => (
          <AriaMessageItem key={message.id} message={message} />
        ))}

        {chat.streamingText ? (
          <article className="aria-message aria-message-assistant is-streaming">
            <div className="aria-message-assistant-content">
              <AriaMarkdown content={chat.streamingText} />
            </div>
          </article>
        ) : chat.isStreaming ? (
          <article className="aria-message aria-message-assistant is-streaming">
            <div className="aria-message-assistant-content">
              <AriaStreamingIndicator phase="thinking" />
            </div>
          </article>
        ) : null}
      </div>
    </div>
  );
}
