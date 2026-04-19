import { describe, expect, test } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { AriaDesktopAriaShellState } from "../apps/aria-desktop/src/shared/api.js";
import {
  AriaChatView,
  AriaSidebar,
} from "../apps/aria-desktop/src/renderer/src/components/DesktopWorkbenchApp.js";
import { AriaMessageItem } from "../apps/aria-desktop/src/renderer/src/components/AriaMessageItem.js";

const SAMPLE_ARIA_STATE: AriaDesktopAriaShellState = {
  automations: {
    lastError: null,
    runs: [],
    selectedTaskId: null,
    tasks: [],
  },
  chat: {
    agentName: "Esperta Aria",
    approvalMode: "ask",
    connected: true,
    isStreaming: false,
    lastError: null,
    messages: [],
    modelName: "sonnet",
    pendingApproval: null,
    pendingQuestion: null,
    securityMode: "default",
    securityModeRemainingTTL: null,
    sessionId: "chat-1",
    sessionStatus: "resumed",
    streamingText: "",
    streamingPhase: null,
  },
  chatSessions: [
    {
      archived: false,
      connectorId: "desktop",
      connectorType: "tui",
      lastActiveAt: 100,
      preview: "Draft release notes",
      sessionId: "chat-1",
      summary: null,
      title: "Draft release notes",
    },
    {
      archived: true,
      connectorId: "desktop",
      connectorType: "tui",
      lastActiveAt: 99,
      preview: "Older archived chat",
      sessionId: "chat-archived",
      summary: "Older archived chat",
      title: "Archived chat",
    },
  ],
  connectorSessions: [],
  connectors: {
    agentName: "Esperta Aria",
    approvalMode: "ask",
    connected: false,
    isStreaming: false,
    lastError: null,
    messages: [],
    modelName: "unknown",
    pendingApproval: null,
    pendingQuestion: null,
    securityMode: "default",
    securityModeRemainingTTL: null,
    sessionId: null,
    sessionStatus: "disconnected",
    streamingText: "",
    streamingPhase: null,
  },
  selectedAriaScreen: null,
  selectedAriaSessionId: "chat-1",
  serverLabel: "Local Server",
};

describe("desktop aria renderer", () => {
  test("renders the aria sidebar in the required order", () => {
    const html = renderToStaticMarkup(
      React.createElement(AriaSidebar, {
        ariaState: SAMPLE_ARIA_STATE,
        ariaServerConnected: true,
        pinnedSessionIds: [],
        onArchiveChatSession: () => {},
        onCreateChat: () => {},
        onOpenSettings: () => {},
        onSearchChatSessions: () => {},
        onSelectChatSession: () => {},
        onSelectConnectorScreen: () => {},
        onSelectScreen: () => {},
        onTogglePinnedChatSession: () => {},
        settingsActive: false,
      }),
    );

    expect(html.indexOf("Automations")).toBeLessThan(html.indexOf("Connectors"));
    expect(html.indexOf("Connectors")).toBeLessThan(html.indexOf("Chat"));
    expect(html.indexOf("Chat")).toBeLessThan(html.indexOf("Settings"));
    expect(html).toContain("Draft release notes");
    expect(html).not.toContain("Archived chat");
    expect(html).toContain("Pin Draft release notes");
    expect(html).toContain("Archive Draft release notes");
  });

  test("renders the empty chat state as a centered composer with send button", () => {
    const html = renderToStaticMarkup(
      React.createElement(AriaChatView, {
        chat: SAMPLE_ARIA_STATE.chat,
        emptyPlaceholder: "Message Aria",
        onAcceptForSession: () => {},
        onAnswerQuestion: () => {},
        onApproveToolCall: () => {},
        onSendMessage: () => {},
      }),
    );

    expect(html).toContain("aria-chat-composer is-centered");
    expect(html).toContain("Send");
  });

  test("renders assistant messages centered and user messages in bubbles", () => {
    const assistantHtml = renderToStaticMarkup(
      React.createElement(AriaMessageItem, {
        message: {
          content: "**Bold** reply",
          id: "assistant-1",
          role: "assistant",
          toolName: null,
        },
      }),
    );
    const userHtml = renderToStaticMarkup(
      React.createElement(AriaMessageItem, {
        message: {
          content: "A user message",
          id: "user-1",
          role: "user",
          toolName: null,
        },
      }),
    );

    expect(assistantHtml).toContain("aria-message-assistant-content");
    expect(assistantHtml).toContain("<strong>Bold</strong>");
    expect(userHtml).toContain("aria-message-user-content");
    expect(userHtml).toContain("aria-message-user-bubble");
    expect(userHtml).toContain("A user message");
  });

  test("renders tool messages as compact system rows", () => {
    const toolHtml = renderToStaticMarkup(
      React.createElement(AriaMessageItem, {
        message: {
          content: "Calling ask_user...",
          id: "tool-1",
          role: "tool",
          toolName: "ask_user",
        },
      }),
    );

    expect(toolHtml).toContain("aria-message-system-content");
    expect(toolHtml).toContain("Question");
    expect(toolHtml).toContain("Waiting for input");
    expect(toolHtml).not.toContain("ask_user");
  });

  test("renders a thinking state instead of the empty composer while the first response is streaming", () => {
    const html = renderToStaticMarkup(
      React.createElement(AriaChatView, {
        chat: {
          ...SAMPLE_ARIA_STATE.chat,
          isStreaming: true,
          streamingPhase: "thinking",
          streamingText: "",
        },
        emptyPlaceholder: "Message Aria",
        onAcceptForSession: () => {},
        onAnswerQuestion: () => {},
        onApproveToolCall: () => {},
        onSendMessage: () => {},
      }),
    );

    expect(html).toContain("aria-streaming-status");
    expect(html).toContain("Thinking");
    expect(html).not.toContain("aria-chat-composer is-centered");
  });

  test("renders archived sessions as read-only with a new chat action", () => {
    const html = renderToStaticMarkup(
      React.createElement(AriaChatView, {
        chat: {
          ...SAMPLE_ARIA_STATE.chat,
          messages: [
            {
              content: "Archived answer",
              id: "assistant-archived",
              role: "assistant",
              toolName: null,
            },
          ],
        },
        emptyPlaceholder: "Message Aria",
        isArchived: true,
        onAcceptForSession: () => {},
        onAnswerQuestion: () => {},
        onApproveToolCall: () => {},
        onSendMessage: () => {},
      }),
    );

    expect(html).toContain("archived session");
    expect(html).not.toContain("New chat");
    expect(html).not.toContain("aria-chat-composer-shell");
  });

  test("renders pending ask-user prompts above the composer with composer-aligned chrome", () => {
    const html = renderToStaticMarkup(
      React.createElement(AriaChatView, {
        chat: {
          ...SAMPLE_ARIA_STATE.chat,
          messages: [
            {
              content: "Calling ask_user...",
              id: "tool-ask-user",
              role: "tool",
              toolName: "ask_user",
            },
          ],
          pendingQuestion: {
            question: "What would you like to call this session?",
            questionId: "question-1",
          },
        },
        emptyPlaceholder: "Message Aria",
        onAcceptForSession: () => {},
        onAnswerQuestion: () => {},
        onApproveToolCall: () => {},
        onSendMessage: () => {},
      }),
    );

    expect(html).toContain("aria-question-prompt");
    expect(html).toContain("What would you like to call this session?");
    expect(html).toContain("aria-question-prompt-shell");
    expect(html).toContain("Submit answer");
  });

  test("renders pending approvals above the composer with compact action buttons", () => {
    const html = renderToStaticMarkup(
      React.createElement(AriaChatView, {
        chat: {
          ...SAMPLE_ARIA_STATE.chat,
          messages: [
            {
              content: "Calling ask_user...",
              id: "tool-approval",
              role: "tool",
              toolName: "ask_user",
            },
          ],
          pendingApproval: {
            args: { title: "Functionality" },
            toolCallId: "tool-call-1",
            toolName: "ask_user",
          },
        },
        emptyPlaceholder: "Message Aria",
        onAcceptForSession: () => {},
        onAnswerQuestion: () => {},
        onApproveToolCall: () => {},
        onSendMessage: () => {},
      }),
    );

    expect(html).toContain("aria-action-prompt");
    expect(html).toContain("Allow session");
    expect(html).toContain("Approve");
    expect(html).not.toContain("aria-inline-card");
  });
});
