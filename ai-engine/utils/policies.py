"""
Policy enforcement for DeployMate.

Every risky action passes through three gates before execution:

1. Permission check — does the user/agent have the right to act on THIS
   user's project / AWS account (isolation)?
2. Policy validation — is the tool+action allowed by the deployment policy?
3. Human approval — create/modify/delete actions require an explicit human
   approval (implemented as a LangGraph `interrupt` in the graphs).

The LLM never bypasses policy: it proposes structured actions, and tools +
policy perform the actual enforcement.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

# Actions that always require explicit human approval
RISKY_ACTIONS = {"create", "modify", "delete"}

# Actions allowed without approval during discovery/analysis
READ_ACTIONS = {"describe", "list", "read", "scan", "analyze"}


def require_approval(action: str) -> bool:
    """Whether a tool action requires a human approval gate."""
    return action.lower() in RISKY_ACTIONS or action.lower() == "deploy"


@dataclass
class PermissionDb:
    """In-memory permission store (replace with DynamoDB in production)."""

    owner_map: dict[str, str] = field(default_factory=dict)  # resource -> owner userId

    def owns(self, userId: str | None, resource: str | None) -> bool:
        """Isolation check: resource must belong to the requesting user."""
        if not resource:
            return True
        owner = self.owner_map.get(resource)
        return owner is None or owner == userId

    def register(self, resource: str, userId: str) -> None:
        self.owner_map[resource] = userId


DEPLOYMENT_POLICY = {
    "aws": {
        "sts.assume_role": ["list", "describe"],
        "ecr.push": ["create", "modify"],
        "ecr.describe": ["list", "read"],
        "apprunner.create": ["create", "modify"],
        "apprunner.describe": ["list", "read"],
        "ecs.create": ["create", "modify"],
        "ecs.describe": ["list", "read"],
        "lambda.create": ["create", "modify"],
        "lambda.describe": ["list", "read"],
        "amplify.create": ["create", "modify"],
        "amplify.describe": ["list", "read"],
        "rds.create": ["create", "modify"],
        "rds.describe": ["list", "read"],
        "elasticache.create": ["create", "modify"],
        "elasticache.describe": ["list", "read"],
        "dynamodb.create": ["create", "modify"],
        "dynamodb.describe": ["list", "read"],
        "s3.create": ["create", "modify"],
        "s3.describe": ["list", "read"],
        "secretsmanager.put": ["create", "modify"],
        "secretsmanager.describe": ["list", "read"],
        "cloudwatch.put_metric_alarm": ["create", "modify"],
        "cloudwatch.logs.read": ["read"],
    },
    "github": {"repos.content.read": ["read"], "repos.content.write": ["create", "modify"]},
    "filesystem": {"workspace.read": ["read"], "workspace.write": ["create", "modify"]},
    "docker": {"build": ["create"], "validate": ["read"]},
}


class DeploymentPolicy:
    """Policy that decides whether a proposed tool action is permitted."""

    def __init__(self, policy: dict[str, Any] | None = None) -> None:
        self._policy = policy or DEPLOYMENT_POLICY

    def check(self, tool: str, action: str) -> tuple[bool, str]:
        """
        Validate the tool+action against the policy.
        Returns (allowed, reason).
        """
        parts = tool.split(".")
        if len(parts) < 2:
            return False, f"Tool {tool!r} is not a structured, namespaced action."

        tool_group, op = parts[0], ".".join(parts[1:])
        allowed_ops = self._policy.get(tool_group, {})
        if not allowed_ops:
            return False, f"Tool group {tool_group!r} is not allowed by policy."

        if action not in allowed_ops.get(op, []):
            return False, f"Action {action!r} on {tool!r} is not allowed by policy."

        if require_approval(action):
            return True, "Action is allowed but requires explicit human approval."
        return True, "Action is allowed."

    def can_execute(self, tool: str, action: str) -> bool:
        allowed, _ = self.check(tool, action)
        return allowed


def can_perform(
    permission_db: PermissionDb,
    policy: DeploymentPolicy,
    userId: str | None,
    resource: str | None,
    tool: str,
    action: str,
) -> tuple[bool, str]:
    """Run the full three-gate check: ownership → policy → approval need."""
    if not permission_db.owns(userId, resource):
        return False, "Isolation violation: resource is not owned by this user."

    allowed, reason = policy.check(tool, action)
    if not allowed:
        return False, reason
    return True, reason