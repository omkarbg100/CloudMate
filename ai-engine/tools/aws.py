"""
AWS tool module — scoped, structured actions only.

These tools return structured *action specs* (never free-form shell), and
explicitly refuse to fabricate AWS state. Real AWS operations (STS validation,
ECR/ECS/CloudWatch discovery, and deployment execution) are performed ONLY by
the DeployMate Node backend, which holds encrypted, project-scoped IAM
credentials. The AI engine never receives AWS credentials and never
short-circuits to invented resources, metrics, or URLs.
"""

from __future__ import annotations

from typing import Any

VALID_SERVICES = {
    "ecr", "rds", "ec2", "lambda", "apprunner", "ecs", "amplify",
    "cloudwatch", "s3", "secretsmanager", "elasticache", "dynamodb",
}

# Resource name → (tool, canonical service). AWS capabilities are selectable;
# no single platform is assumed by default.
_SERVICE_TOOL_MAP: dict[str, tuple[str, str]] = {
    "ecr": ("aws.ecr.push", "ECR"),
    "apprunner": ("aws.apprunner.create", "App Runner"),
    "ecs": ("aws.ecs.create", "ECS"),
    "lambda": ("aws.lambda.create", "Lambda"),
    "amplify": ("aws.amplify.create", "Amplify"),
    "rds": ("aws.rds.create", "RDS"),
    "elasticache": ("aws.elasticache.create", "ElastiCache"),
    "dynamodb": ("aws.dynamodb.create", "DynamoDB"),
    "s3": ("aws.s3.create", "S3"),
    "secretsmanager": ("aws.secretsmanager.put", "Secrets Manager"),
    "cloudwatch": ("aws.cloudwatch.put_metric_alarm", "CloudWatch"),
}


def _norm(service: str) -> str:
    return "".join(ch for ch in str(service).lower() if ch.isalnum())


def _tool_for(resource: str) -> tuple[str | None, str | None]:
    key = _norm(resource)
    for token, spec in _SERVICE_TOOL_MAP.items():
        if token in key or key in token:
            return spec
    return None, None


def _not_implemented(what: str) -> NotImplementedError:
    return NotImplementedError(
        f"{what} is executed by the DeployMate Node backend, not by the AI engine. "
        "The AI engine never holds AWS credentials. Use the backend endpoints for real results."
    )


def create_deployment_actions(plan: dict[str, Any], region: str = "ap-south-1") -> list[dict[str, Any]]:
    """
    Convert an approved deployment plan into structured, permission-checkable
    AWS tool actions. The LLM never calls these directly — the Deployment
    Agent emits the plan, the policy node gates it, the approval node gates
    it again, then the Node backend executes the pipeline.
    """
    resources = plan.get("resources") or [d.get("service") for d in plan.get("resourceDecisions", [])]
    if not resources:
        resources = ["ECR", "ECS", "CloudWatch"]

    decisions = {
        _norm(d.get("service", "")): d.get("action", "create")
        for d in plan.get("resourceDecisions", [])
    }

    actions: list[dict[str, Any]] = []
    for resource in resources:
        tool, service = _tool_for(str(resource))
        if not tool:
            continue
        action = decisions.get(_norm(str(resource)), "create")
        actions.append(
            {
                "tool": tool,
                "action": action,
                "service": service,
                "parameters": {"resource": str(resource), "region": region},
            }
        )
    return actions


def execute_deployment_actions(actions: list[dict[str, Any]], approved: bool = False) -> dict[str, Any]:
    """Refuse to fabricate execution. Hard reject when not approved (defense in depth)."""
    if not approved:
        return {
            "status": "BLOCKED",
            "message": "Execution blocked: deployment was not approved by a human.",
            "results": [],
        }

    # Approved plans are executed by the Node backend (Docker build + ECR push +
    # ECS rollout streamed over WebSocket). This tool never pretends it ran them.
    return {
        "status": "NOT_IMPLEMENTED",
        "message": (
            "Real ECS deployment is executed by the DeployMate Node backend "
            "(Docker build, ECR push, task definition registration, ECS service "
            "rollout), with real progress streamed over WebSocket. The AI engine "
            "cannot perform or fake it."
        ),
        "pendingActions": [
            {"tool": a.get("tool"), "action": a.get("action"), "service": a.get("service")} for a in (actions or [])
        ],
        "results": [],
    }