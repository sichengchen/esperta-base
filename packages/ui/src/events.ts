import type { EngineEvent } from "@aria/protocol";

const ENGINE_EVENT_SUMMARIES: Record<EngineEvent["type"], string> = {
  text_delta: "Message streaming",
  thinking_delta: "Reasoning update",
  tool_start: "Tool started",
  tool_end: "Tool completed",
  tool_approval_request: "Approval requested",
  security_escalation_request: "Security escalation requested",
  mode_change: "Mode changed",
  user_question: "User input requested",
  sub_agent_start: "Sub-agent started",
  sub_agent_end: "Sub-agent finished",
  reaction: "Reaction",
  done: "Run completed",
  error: "Error",
};

export type { EngineEvent } from "@aria/protocol";

export function describeUiEngineEvent(event: Pick<EngineEvent, "type">): string {
  return ENGINE_EVENT_SUMMARIES[event.type];
}
