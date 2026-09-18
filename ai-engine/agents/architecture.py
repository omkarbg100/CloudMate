"""Architecture Agent — maps repository analysis + AWS discovery to an AWS architecture.

The agent selects services from AWS *capabilities* based on the repository
shape and the resources already discovered in the user's AWS account. Every
resource carries an explicit decision: `create`, `reuse`, or `modify` — a
discovered matching resource becomes a `reuse` decision instead of being
re-provisioned. App Runner/ECR/etc. are selectable options, not a fixed plan.
"""

from __future__ import annotations

from typing import Any

from tools.llm import call_llm_json
from utils.prompts import ARCHITECTURE_SYSTEM_PROMPT
from utils.schemas import ProcessRequest

# ─── Available AWS capabilities (selection, not a fixed architecture) ─────────

FRONTEND_CANDIDATES = ["AWS Amplify", "Amazon S3 + CloudFront", "AWS App Runner"]

BACKEND_CANDIDATES = ["AWS App Runner", "Amazon ECS (Fargate)", "AWS Lambda + API Gateway"]

DATABASE_SERVICE_MAP = {
    "MongoDB": "MongoDB Atlas",
    "PostgreSQL": "Amazon RDS (PostgreSQL)",
    "MySQL": "Amazon RDS (MySQL)",
    "Redis": "Amazon ElastiCache (Redis)",
    "SQLite": "Amazon RDS (SQLite → migrate to PostgreSQL)",
    "DynamoDB": "Amazon DynamoDB",
    "default": "Amazon RDS",
}


def _select_compute(analysis: dict[str, Any], backend: dict[str, Any]) -> tuple[str, str]:
    """Pick a compute capability for the backend based on the repository shape."""
    docker = bool(analysis.get("docker"))
    framework = (backend or {}).get("framework", "")

    if docker:
        reason = (
            "Containerised deploy with no VPC management; Amazon ECS (Fargate) is the "
            "alternative when finer network/scale control is required."
        )
        return "AWS App Runner", reason
    if framework in {"Flask", "FastAPI", "Django"}:
        reason = (
            "No container detected; serverless functions scale to zero and avoid idle cost."
        )
        return "AWS Lambda + API Gateway", reason
    reason = "Managed build-and-run platform for source deployments with auto-scaling."
    return "AWS App Runner", reason


def _norm(service: str) -> str:
    return "".join(ch for ch in str(service).lower() if ch.isalnum())


def _matches(service: str, resource_service: str) -> bool:
    a, b = _norm(service), _norm(resource_service)
    return bool(a and b and (a in b or b in a))


def _resource_decisions_from_nodes(nodes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "id": f"decision_{n.get('id', idx)}",
            "service": n.get("service", "unspecified"),
            "action": n.get("decision", "create"),
            "targetName": n.get("label", n.get("service", "resource")),
            "existingResourceId": n.get("existingResourceId"),
            "reason": n.get("reason") or "Required for deployment.",
            "riskLevel": "low" if n.get("decision") == "reuse" else "medium",
            "approvalRequired": n.get("decision") != "reuse",
        }
        for idx, n in enumerate(nodes)
    ]


class ArchitectureAgent:
    """Generates an AWS architecture from repository analysis and AWS discovery."""

    def generate(self, request: ProcessRequest) -> dict[str, Any]:
        analysis = request.analysis or {}
        discovered = (request.awsDiscovery or {}).get("resources", []) or []

        # Try LangChain LLM first
        llm_result = call_llm_json(
            system_prompt=ARCHITECTURE_SYSTEM_PROMPT,
            user_prompt=f"Repository analysis:\n{analysis}\nDiscovered AWS resources:\n{discovered}",
            fallback=None,
        )

        if llm_result:
            architecture = self._normalize_llm(llm_result)
        else:
            architecture = self._rule_based(analysis)

        architecture = self._apply_discovery(architecture, discovered)
        return {"architecture": architecture}

    def _normalize_llm(self, llm_result: dict[str, Any]) -> dict[str, Any]:
        nodes = llm_result.get("nodes", [])
        return {
            "region": llm_result.get("region", "ap-south-1"),
            "nodes": nodes,
            "edges": llm_result.get("edges", []),
            "rationale": llm_result.get("rationale", []),
            "resourceDecisions": _resource_decisions_from_nodes(nodes),
        }

    def _apply_discovery(
        self, architecture: dict[str, Any], discovered: list[dict[str, Any]]
    ) -> dict[str, Any]:
        """Flip matching nodes from `create` to `reuse` using discovered resources."""
        nodes = architecture.get("nodes", [])
        rationale = architecture.setdefault("rationale", [])

        for node in nodes:
            for resource in discovered:
                if resource.get("reusable") is False:
                    continue
                if _matches(node.get("service", ""), resource.get("service", "")):
                    node["decision"] = "reuse"
                    node["existingResourceId"] = resource.get("id")
                    message = (
                        f"Reusing discovered {resource.get('service')} "
                        f"'{resource.get('name', resource.get('id'))}' instead of creating a new resource."
                    )
                    if message not in rationale:
                        rationale.append(message)
                    break

        architecture["nodes"] = nodes
        architecture["resourceDecisions"] = _resource_decisions_from_nodes(nodes)
        return architecture

    def _rule_based(self, analysis: dict[str, Any]) -> dict[str, Any]:
        nodes: list[dict[str, Any]] = []
        edges: list[dict[str, Any]] = []
        rationale: list[str] = []
        region = analysis.get("region", "ap-south-1") or "ap-south-1"

        frontend = analysis.get("frontend")
        backend = analysis.get("backend", {})
        database = analysis.get("database")

        # Frontend node — selected from frontend capabilities
        if frontend:
            fw = frontend.get("framework", "React")
            svc = FRONTEND_CANDIDATES[0]
            nodes.append({
                "id": "frontend",
                "label": f"{fw} Frontend",
                "service": svc,
                "purpose": f"Hosts the {fw} frontend with CI/CD from GitHub.",
                "decision": "create",
            })
            rationale.append(
                f"Selected {svc} from {FRONTEND_CANDIDATES} for zero-config {fw} hosting."
            )

        # Backend node — dynamically selected compute capability
        if backend:
            fw = backend.get("framework", "Express")
            svc, why = _select_compute(analysis, backend)
            port = backend.get("port", 3000)
            nodes.append({
                "id": "api",
                "label": f"{fw} API",
                "service": svc,
                "purpose": f"Runs the {fw} backend on port {port} with auto-scaling.",
                "decision": "create",
            })
            rationale.append(why)

        # Database node
        if database:
            svc = DATABASE_SERVICE_MAP.get(database, DATABASE_SERVICE_MAP["default"])
            nodes.append({
                "id": "database",
                "label": f"{database} Database",
                "service": svc,
                "purpose": f"Managed {database} database with automated backups.",
                "decision": "create",
            })
            rationale.append(f"{svc} provides managed {database} with automated failover and backups.")

        # Registry (needed for container builds)
        if analysis.get("docker"):
            nodes.append({
                "id": "registry",
                "label": "Container Registry",
                "service": "Amazon ECR",
                "purpose": "Stores container images tagged by commit SHA.",
                "decision": "create",
            })

        # Secrets + monitoring are always required capabilities
        nodes.append({
            "id": "secrets",
            "label": "Secrets",
            "service": "AWS Secrets Manager",
            "purpose": "Stores database URIs, API keys, and other secrets, injected at runtime.",
            "decision": "create",
        })
        rationale.append("Secrets Manager prevents hardcoded credentials and is injectable at runtime.")

        nodes.append({
            "id": "monitoring",
            "label": "Monitoring",
            "service": "Amazon CloudWatch",
            "purpose": "Collects logs, metrics, and alarms for the Monitoring Agent.",
            "decision": "create",
        })
        rationale.append("CloudWatch is required for deployment monitoring and AI-driven diagnosis.")

        # Edges
        if frontend and backend:
            edges.append({"from": "frontend", "to": "api", "label": "REST + WebSocket"})
        if backend and database:
            edges.append({"from": "api", "to": "database", "label": "ORM / driver"})
        if backend:
            edges.append({"from": "api", "to": "secrets", "label": "secret injection"})
            edges.append({"from": "api", "to": "monitoring", "label": "structured logs"})
        if any(n["id"] == "registry" for n in nodes) and backend:
            edges.append({"from": "registry", "to": "api", "label": "image pull"})

        return {
            "region": region,
            "nodes": nodes,
            "edges": edges,
            "rationale": rationale,
            "resourceDecisions": _resource_decisions_from_nodes(nodes),
        }