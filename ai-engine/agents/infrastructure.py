"""Infrastructure Agent — converts approved deployment decisions into generator-ready specs."""

from __future__ import annotations

from typing import Any


class InfrastructureAgent:
    """Builds an infrastructure spec from approved resource decisions."""

    def generate(
        self,
        project_id: str,
        region: str,
        decisions: list[dict[str, Any]],
        generator: str = "cdk-typescript",
    ) -> dict[str, Any]:
        return {
            "projectId": project_id,
            "region": region,
            "generator": generator,
            "status": "SPEC_READY",
            "spec": {
                "version": "0.1",
                "projectId": project_id,
                "region": region,
                "decisions": decisions,
            },
            "outputs": [
                "infrastructure/specs/deployment-plan.schema.json",
                "infrastructure/generators/cdk-typescript/README.md",
                "infrastructure/policies/aws-action-policy.json",
            ],
        }