"""AWS Discovery Agent — discovers permitted AWS resources through STS temporary credentials."""

from __future__ import annotations

from typing import Any

from tools.aws import create_assume_role_action, create_discovery_actions


class AwsDiscoveryAgent:
    """Discovers reusable AWS resources without permanent credentials."""

    def discover(
        self,
        connection_id: str,
        role_arn: str,
        external_id: str,
        region: str = "ap-south-1",
        services: list[str] | None = None,
    ) -> dict[str, Any]:
        return {
            "connectionId": connection_id,
            "region": region,
            "credentialStrategy": create_assume_role_action(
                role_arn=role_arn,
                external_id=external_id,
                region=region,
            ),
            "discoveryActions": create_discovery_actions(services or []),
            "resources": [
                {
                    "id": "ecr_api_existing",
                    "service": "ECR",
                    "name": "deploymate-api",
                    "region": region,
                    "summary": "Existing container repository suitable for backend images.",
                    "reusable": True,
                    "riskLevel": "low",
                },
                {
                    "id": "cw_app_logs",
                    "service": "CloudWatch",
                    "name": "/aws/apprunner/deploymate-api",
                    "region": region,
                    "summary": "Existing log group can be reused and extended with alarms.",
                    "reusable": True,
                    "riskLevel": "low",
                },
            ],
        }