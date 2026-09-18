"""
AWS tool module — scoped, structured actions only.

These tools return structured *action specs* (never free-form shell). The
LLM never touches AWS directly: agents emit tool calls, and these functions
perform (or stub for now) the actual operations using STS temporary
credentials from an assumed IAM role. No permanent access keys are accepted.
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


def create_assume_role_action(role_arn: str, external_id: str, region: str = "ap-south-1") -> dict[str, Any]:
    """
    Build the STS AssumeRole action spec used to obtain scoped temporary
    credentials for a discovery/deployment operation.
    """
    return {
        "tool": "aws.sts.assume_role",
        "parameters": {
            "roleArn": role_arn,
            "roleSessionName": "deploymate-agent",
            "externalId": external_id,
            "durationSeconds": 3600,
        },
        "region": region,
        "policyValidationRequired": True,
    }


def create_discovery_actions(services: list[str] | None = None) -> list[dict[str, Any]]:
    """Build structured discovery action specs for the requested AWS services."""
    services = services or sorted(VALID_SERVICES)
    actions = []
    for service in services:
        normalized = service.lower().replace(" ", "")
        if normalized not in VALID_SERVICES:
            continue
        actions.append(
            {
                "tool": f"aws.{normalized}.describe",
                "service": normalized,
                "permission": f"{normalized}:Describe*",
                "approvalRequired": False,
            }
        )
    return actions


def get_resources(service: str, region: str = "ap-south-1") -> list[dict[str, Any]]:
    """
    List discovered AWS resources of a given service type.
    Stub — replace with boto3 calls scoped to STS temporary credentials.
    """
    service = service.lower()
    if service in {"ecr", "apprunner", "ecs", "lambda", "amplify", "cloudwatch", "rds", "s3"}:
        return [
            {
                "id": f"{service}_deploymate_existing",
                "service": service.upper(),
                "name": "deploymate",
                "region": region,
                "reusable": True,
                "riskLevel": "low",
            }
        ]
    return []


def describe_service(service: str, resource_id: str, region: str = "ap-south-1") -> dict[str, Any]:
    """Describe an AWS resource. Stub."""
    return {"service": service, "id": resource_id, "region": region, "status": "unknown"}


def get_cloudwatch_logs(log_group: str, region: str = "ap-south-1", limit: int = 50) -> list[dict[str, Any]]:
    """Get CloudWatch log events. Stub — replace with boto3 when AWS is configured."""
    return [
        {"timestamp": "2026-09-17T15:00:00Z", "message": "Application started"},
        {"timestamp": "2026-09-17T15:01:00Z", "message": "GET /health 200 4ms"},
        {"timestamp": "2026-09-17T15:02:00Z", "message": "MongoServerSelectionError: connect ECONNREFUSED"},
    ][:limit]


def get_app_runner_metrics(service_arn: str, region: str = "ap-south-1") -> dict[str, Any]:
    """Get App Runner service metrics. Stub."""
    import random

    return {
        "serviceArn": service_arn,
        "requestCount": random.randint(100, 500),
        "errorRate": round(random.uniform(0, 3), 2),
        "cpuUtilization": round(random.uniform(10, 50), 1),
        "memoryUtilization": round(random.uniform(20, 60), 1),
        "p99Latency": random.randint(50, 300),
    }


def create_deployment_actions(plan: dict[str, Any], region: str = "ap-south-1") -> list[dict[str, Any]]:
    """
    Convert an approved deployment plan into structured, permission-checkable
    AWS tool actions. The LLM never calls these directly — the Deployment
    Agent emits the plan, the policy node gates it, the approval node gates
    it again, then this tool executes each action spec.

    Actions follow the plan's create/reuse/modify decisions for each resource.
    """
    resources = plan.get("resources") or [d.get("service") for d in plan.get("resourceDecisions", [])]
    if not resources:
        resources = ["ECR", "App Runner", "Secrets Manager", "CloudWatch"]

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
    """Execute approved action specs. Hard reject when not approved (defense in depth)."""
    if not approved:
        return {
            "status": "BLOCKED",
            "message": "Execution blocked: deployment was not approved by a human.",
            "results": [],
        }

    results = []
    for idx, action in enumerate(actions):
        results.append(
            {
                "step": idx + 1,
                "tool": action["tool"],
                "action": action["action"],
                "status": "OK",
                "message": f"Executed {action['tool']} via scoped STS credentials.",
            }
        )
    return {
        "status": "DEPLOYED",
        "deploymentId": "deploy_demo_001",
        "url": "https://deploymate-demo.ap-south-1.amazonaws.com",
        "results": results,
        "message": "Deployment completed using per-step scoped tool actions.",
    }