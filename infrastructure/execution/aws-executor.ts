export type AwsResourceAction = "create" | "reuse" | "modify";

export interface AwsExecutionContext {
  connectionId: string;
  roleArn: string;
  externalId: string;
  region: string;
  credentialType: "sts_temporary";
  approvalId?: string;
}

export interface AwsResourceDecision {
  id: string;
  service: string;
  action: AwsResourceAction;
  targetName: string;
  existingResourceId?: string;
  reason: string;
  riskLevel: "low" | "medium" | "high";
  approvalRequired: boolean;
  inputs?: Record<string, unknown>;
}

export interface AwsExecutionResult {
  decisionId: string;
  status: "SKIPPED" | "PLANNED" | "EXECUTED" | "FAILED";
  message: string;
  resourceArn?: string;
}

export async function executeAwsDecision(
  context: AwsExecutionContext,
  decision: AwsResourceDecision
): Promise<AwsExecutionResult> {
  if (context.credentialType !== "sts_temporary") {
    return {
      decisionId: decision.id,
      status: "FAILED",
      message: "Permanent AWS credentials are not allowed."
    };
  }

  if (decision.approvalRequired && !context.approvalId) {
    return {
      decisionId: decision.id,
      status: "SKIPPED",
      message: "Human approval is required before this AWS action can execute."
    };
  }

  return {
    decisionId: decision.id,
    status: "PLANNED",
    message: "Executor scaffold validated the action contract; live AWS SDK execution is not wired yet."
  };
}
