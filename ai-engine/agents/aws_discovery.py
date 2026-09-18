"""AWS Discovery Agent — relay for backend-run discovery results (safe only).

Real AWS discovery is executed by the DeployMate Node backend using STS
validated, project-scoped IAM user credentials. This agent never receives AWS
credentials; it only consumes the *safe* discovery payload the backend produced
and normalizes it for the graph. When no payload is provided it returns an
explicit NOT_IMPLEMENTED result instead of fabricating resources.
"""

from __future__ import annotations

from typing import Any


class AwsDiscoveryAgent:
    """Normalizes backend discovery results; never invokes AWS itself."""

    def summarize(self, discovery: dict[str, Any] | None) -> dict[str, Any]:
        if not discovery:
            return {
                "status": "not_implemented",
                "reason": (
                    "Real AWS discovery runs in the DeployMate backend (STS-validated, "
                    "project-scoped credentials). Provide the safe discovery payload that "
                    "the backend produced; the AI engine never receives AWS credentials."
                ),
                "region": None,
                "resources": [],
                "errors": [],
            }

        resources = discovery.get("resources", [])
        errors = discovery.get("errors", [])
        return {
            "status": "ok" if resources or not errors else "empty",
            "scannedAt": discovery.get("scannedAt"),
            "region": discovery.get("region"),
            "resourceCount": len(resources),
            "resources": resources,
            "errors": errors,
            "note": "Discovery results are authoritative from the DeployMate backend.",
        }