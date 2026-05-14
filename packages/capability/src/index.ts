import {
  SandboxManager,
  type SandboxExecutionRequest,
  type SandboxExecutionResult,
} from "@aria/sandbox";

export type CapabilityPolicyDecision = "allow" | "ask" | "deny";
export type ApprovalDecision = "approve_once" | "deny";

export interface ToolIntentIdentity {
  nodeId?: string;
  principalId?: string;
  sessionId?: string;
  threadId?: string;
  runId?: string;
  jobId?: string;
  projectId?: string;
  workspaceId?: string;
  toolIntentId: string;
}

export interface ToolIntentRecord {
  identity: ToolIntentIdentity;
  toolName: string;
  action: SandboxExecutionRequest["action"];
  sideEffects: string[];
  createdAt: string;
  input?: Record<string, unknown>;
}

export interface CapabilityBrokerOptions {
  sandbox: SandboxManager;
  decidePolicy(
    intent: ToolIntentRecord,
  ): Promise<CapabilityPolicyDecision> | CapabilityPolicyDecision;
  requestApproval?(intent: ToolIntentRecord): Promise<ApprovalDecision> | ApprovalDecision;
  audit?(event: CapabilityAuditEvent): Promise<void> | void;
}

export type CapabilityAuditEvent =
  | { type: "tool_intent"; intent: ToolIntentRecord }
  | { type: "policy_decision"; intent: ToolIntentRecord; decision: CapabilityPolicyDecision }
  | { type: "approval_decision"; intent: ToolIntentRecord; decision: ApprovalDecision }
  | { type: "tool_execution"; intent: ToolIntentRecord; result: SandboxExecutionResult };

export interface CapabilityExecutionRequest {
  intent: ToolIntentRecord;
  sandbox: Omit<SandboxExecutionRequest, "action" | "toolName">;
  executeToolRuntime?(): Promise<unknown>;
}

export interface CapabilityExecutionResult {
  status: "executed" | "denied" | "approval_required";
  policyDecision: CapabilityPolicyDecision;
  approvalDecision?: ApprovalDecision;
  sandboxResult?: SandboxExecutionResult;
  toolRuntimeResult?: unknown;
  reason?: string;
}

export class CapabilityBroker {
  constructor(private readonly options: CapabilityBrokerOptions) {}

  async execute(request: CapabilityExecutionRequest): Promise<CapabilityExecutionResult> {
    await this.options.audit?.({ type: "tool_intent", intent: request.intent });

    const policyDecision = await this.options.decidePolicy(request.intent);
    await this.options.audit?.({
      type: "policy_decision",
      intent: request.intent,
      decision: policyDecision,
    });

    if (policyDecision === "deny") {
      return { status: "denied", policyDecision, reason: "Denied by policy" };
    }

    let approvalDecision: ApprovalDecision | undefined;
    if (policyDecision === "ask") {
      if (!this.options.requestApproval) {
        return {
          status: "approval_required",
          policyDecision,
          reason: "Approval required",
        };
      }
      approvalDecision = await this.options.requestApproval(request.intent);
      await this.options.audit?.({
        type: "approval_decision",
        intent: request.intent,
        decision: approvalDecision,
      });
      if (approvalDecision === "deny") {
        return {
          status: "denied",
          policyDecision,
          approvalDecision,
          reason: "Denied by approval",
        };
      }
    }

    const sandboxResult = request.executeToolRuntime
      ? await this.executeToolRuntime(request)
      : await this.options.sandbox.execute({
          ...request.sandbox,
          action: request.intent.action,
          toolName: request.intent.toolName,
        });
    await this.options.audit?.({
      type: "tool_execution",
      intent: request.intent,
      result: sandboxResult,
    });

    return {
      status: "executed",
      policyDecision,
      approvalDecision,
      sandboxResult,
      toolRuntimeResult: sandboxResult.result,
    };
  }

  private async executeToolRuntime(
    request: CapabilityExecutionRequest,
  ): Promise<SandboxExecutionResult> {
    const provider = this.options.sandbox.getConfiguredProviderName(request.sandbox.provider);
    const result = await request.executeToolRuntime!();
    const isError =
      result &&
      typeof result === "object" &&
      "isError" in result &&
      Boolean((result as { isError?: unknown }).isError);
    return {
      provider,
      status: isError ? "failed" : "completed",
      result,
    };
  }
}
