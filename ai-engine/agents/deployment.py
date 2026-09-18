"""Deployment Agent — generates a deployment plan from the selected architecture.

The plan is derived from the architecture the Architecture Agent chose (which
services, and whether each is `create`/`reuse`/`modify`). No single platform
(ECR/App Runner/etc.) is assumed.
"""

from __future__ import annotations

from typing import Any

from tools.llm import call_llm_json
from utils.prompts import DEPLOYMENT_SYSTEM_PROMPT
from utils.schemas import ProcessRequest


class DeploymentAgent:
    """Generates a deployment plan. Execution requires human approval."""

    def plan(self, request: ProcessRequest) -> dict[str, Any]:
        analysis = request.analysis or {}
        architecture = request.architecture or {}
        region = architecture.get("region") or analysis.get("region", "ap-south-1") or "ap-south-1"

        # Try LangChain-enhanced plan
        llm_result = call_llm_json(
            system_prompt=DEPLOYMENT_SYSTEM_PROMPT,
            user_prompt=f"Analysis: {analysis}\nArchitecture: {architecture}",
            fallback=None,
        )

        resources = self._resources(analysis, architecture)
        steps = self._steps(analysis, architecture, resources)
        estimated = 8

        if llm_result:
            steps = llm_result.get("steps", steps)
            resources = llm_result.get("resources", resources)
            estimated = llm_result.get("estimated_minutes", estimated)

        decisions = self._decisions(architecture, resources)

        return {
            "steps": steps,
            "resources": resources,
            "region": region,
            "estimatedMinutes": estimated,
            "requiresApproval": True,
            "resourceDecisions": decisions,
            "policyValidation": {
                "allowed": True,
                "requiresApproval": True,
                "violations": [
                    {
                        "id": "approval_gate",
                        "severity": "medium",
                        "message": "Creating or modifying AWS resources requires explicit human approval.",
                    }
                ],
            },
        }

    @staticmethod
    def _resources(analysis: dict[str, Any], architecture: dict[str, Any]) -> list[str]:
        """Collect the resource list from the architecture's chosen services."""
        resources: list[str] = []

        def add(name: str) -> None:
            if name and name not in resources:
                resources.append(name)

        if analysis.get("docker"):
            add("Amazon ECR")
        for node in architecture.get("nodes", []):
            add(node.get("service", ""))
        add("AWS Secrets Manager")
        add("Amazon CloudWatch")
        return resources

    @staticmethod
    def _compute_service(architecture: dict[str, Any]) -> str:
        for node in architecture.get("nodes", []):
            if node.get("id") == "api":
                return node.get("service", "AWS App Runner")
        return "AWS App Runner"

    def _steps(
        self, analysis: dict[str, Any], architecture: dict[str, Any], resources: list[str]
    ) -> list[str]:
        compute = self._compute_service(architecture)
        port = (analysis.get("backend") or {}).get("port", 3000)

        steps = ["Validate IAM permissions and policy compliance"]

        if analysis.get("docker"):
            steps += [
                "Build container image from repository",
                "Tag image with commit SHA",
                "Push image to Amazon ECR",
            ]

        steps += [
            f"Provision or reuse compute: {compute}",
            "Inject environment variables from .env.example",
            "Configure secrets from AWS Secrets Manager",
            f"Configure health check → /health (port {port})",
            f"Deploy application on {compute}",
            "Verify health check passes",
            "Update deployment record with live URL",
        ]

        if any(n.get("id") == "frontend" for n in architecture.get("nodes", [])):
            steps.insert(-2, "Trigger frontend build/hosting rollout")
        return steps

    @staticmethod
    def _decisions(architecture: dict[str, Any], resources: list[str]) -> list[dict[str, Any]]:
        """Carry the architecture's create/reuse/modify decisions into the plan."""
        decisions = architecture.get("resourceDecisions") or []
        if decisions:
            return decisions
        return [
            {
                "id": f"decision_{idx}",
                "service": resource,
                "action": "create",
                "targetName": resource,
                "existingResourceId": None,
                "reason": "Resource required for the approved deployment plan.",
                "riskLevel": "medium",
                "approvalRequired": True,
            }
            for idx, resource in enumerate(resources)
        ]