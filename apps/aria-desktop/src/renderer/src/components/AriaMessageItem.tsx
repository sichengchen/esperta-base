import { CircleAlert, FileText, Globe, MessageSquare, Search, Shield, Wrench } from "lucide-react";
import type { AriaDesktopChatMessage } from "../../../shared/api.js";
import { AriaMarkdown } from "./AriaMarkdown.js";

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  ask_user: "Question",
  edit: "Edit file",
  memory_delete: "Delete memory",
  memory_read: "Read memory",
  memory_search: "Search memory",
  memory_write: "Write memory",
  reaction: "Reaction",
  read: "Read file",
  read_skill: "Read skill",
  set_env_secret: "Save secret",
  set_env_variable: "Set variable",
  skill_manage: "Manage skill",
  web_fetch: "Fetch page",
  web_search: "Web search",
  write: "Write file",
};

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatToolDisplayName(toolName?: string | null): string | null {
  if (!toolName) {
    return null;
  }

  const known = TOOL_DISPLAY_NAMES[toolName];
  if (known) {
    return known;
  }

  const normalized = toolName.replace(/^mcp_/, "").replace(/_/g, " ").replace(/-/g, " ").trim();

  return normalized ? toTitleCase(normalized) : "Tool";
}

function formatToolMessageCopy(message: AriaDesktopChatMessage): string {
  if (message.role !== "tool" || !message.toolName) {
    return message.content;
  }

  if (message.content === `Calling ${message.toolName}...`) {
    const label = formatToolDisplayName(message.toolName);
    if (message.toolName === "ask_user") {
      return "Waiting for input";
    }
    return label ? `Using ${label.toLowerCase()}` : "Using tool";
  }

  return message.content;
}

function getToolIcon(toolName?: string | null) {
  if (!toolName) {
    return <Wrench aria-hidden="true" />;
  }

  if (toolName === "ask_user") {
    return <MessageSquare aria-hidden="true" />;
  }

  if (toolName === "web_search" || toolName === "memory_search") {
    return <Search aria-hidden="true" />;
  }

  if (toolName === "web_fetch") {
    return <Globe aria-hidden="true" />;
  }

  if (
    toolName === "read" ||
    toolName === "write" ||
    toolName === "edit" ||
    toolName === "read_skill" ||
    toolName === "skill_manage"
  ) {
    return <FileText aria-hidden="true" />;
  }

  if (toolName === "tool_approval" || toolName === "security" || toolName === "approval") {
    return <Shield aria-hidden="true" />;
  }

  return <Wrench aria-hidden="true" />;
}

export function AriaMessageItem({ message }: { message: AriaDesktopChatMessage }) {
  if (message.role === "assistant") {
    return (
      <article className="aria-message aria-message-assistant">
        <div className="aria-message-assistant-content">
          <AriaMarkdown content={message.content} />
        </div>
      </article>
    );
  }

  if (message.role === "user") {
    return (
      <article className="aria-message aria-message-user">
        <div className="aria-message-user-content">
          <div className="aria-message-user-bubble">{message.content}</div>
        </div>
      </article>
    );
  }

  const icon = message.toolName ? (
    getToolIcon(message.toolName)
  ) : message.role === "error" ? (
    <CircleAlert aria-hidden="true" />
  ) : (
    <Wrench aria-hidden="true" />
  );
  const displayName = formatToolDisplayName(message.toolName);
  const displayCopy = formatToolMessageCopy(message);

  return (
    <article className={`aria-message aria-message-system aria-message-${message.role}`}>
      <div className="aria-message-system-content">
        <span className="aria-message-system-icon">{icon}</span>
        <div className="aria-message-system-body">
          {displayName ? <span className="aria-message-system-label">{displayName}</span> : null}
          <span className="aria-message-system-copy">{displayCopy}</span>
        </div>
      </div>
    </article>
  );
}
