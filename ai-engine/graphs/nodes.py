"""
LangGraph nodes — every node is a plain function `(state) -> partial state update`.

Nodes wrap the specialized agents, run policy gates, request human approval
via LangGraph `interrupt`, and delegate the actual external work to the
`tools/*` packages. The LangGraph runtime merges each node's returned dict
into the shared `DeploymateState`, producing an audit trail.
"""

from __future__ import annotations

from typing import Any

from langgraph.types import interrupt

from agents.architecture import ArchitectureAgent
from agents.aws_discovery import AwsDiscoveryAgent
from agents.code import CodeAgent
from agents.deployment import DeploymentAgent
from agents.infrastructure import InfrastructureAgent
from agents.monitoring import MonitoringAgent
from agents.repository import RepositoryAgent
from agents.security import SecurityAgent
from agents.validation import ValidationAgent
from tools.aws import create_deployment_actions, execute_deployment_actions
from tools.llm import call_llm_json
from utils.policies import DeploymentPolicy, PermissionDb, can_perform
from utils.prompts import REPAIR_SYSTEM_PROMPT
from utils.schemas import ChatResult
from utils.state import request_from_state

_ENGINE = "deploymate-langgraph-v1"
_PERMISSIONS = PermissionDb()
_POLICY = DeploymentPolicy()


def _log(state: dict[str, Any], node: str) -> dict[str, Any]:
    return {"history": [node]}


def _guard(
    state: dict[str, Any],
    tool: str,
    action: str,
    resource: str | None = None,
) -> tuple[bool, str]:
    """Run the isolated three-gate policy check (ownership → policy → approval need)."""
    resource = resource or state.get("projectId")
    _PERMISSIONS.register(resource or "", state.get("userId") or "")
    return can_perform(
        permission_db=_PERMISSIONS,
        policy=_POLICY,
        userId=state.get("userId"),
        resource=resource,
        tool=tool,
        action=action,
    )


# ─── Chat ─────────────────────────────────────────────────────────────────────

def chat_node(state: dict[str, Any]) -> dict[str, Any]:
    request = request_from_state(state)
    message = (request.message or "").lower()

    if any(kw in message for kw in ["deploy", "plan", "launch", "ship"]):
        response = ChatResult(
            message=(
                "I can prepare a dynamic AWS deployment plan after repository analysis and "
                "resource discovery. The plan includes policy validation and requires your "
                "explicit approval before any AWS resources are created or modified."
            ),
            nextActions=[
                "Analyze repository",
                "Generate AWS architecture",
                "Run security scan",
                "Validate policies",
                "Await your approval",
            ],
            approvalRequired=True,
        )
        return {"message_response": response.model_dump(), **_log(state, "chat_node")}

    if any(kw in message for kw in ["analyz", "repositor", "detect", "inspect"]):
        result = RepositoryAgent().analyze(request)
        analysis = result.get("analysis", {})
        backend = analysis.get("backend", {})
        langs = ", ".join(analysis.get("languages", ["Unknown"]))
        response = ChatResult(
            message=(
                f"Repository analysis complete. I detected: {langs}, "
                f"{backend.get('framework', 'unknown')} backend on port {backend.get('port', '?')}, "
                f"database: {analysis.get('database', 'none detected')}. "
                "Ready to generate AWS architecture."
            ),
            nextActions=["Generate AWS architecture", "Run security scan", "Connect AWS role"],
            approvalRequired=False,
        )
        return {"message_response": response.model_dump(), **_log(state, "chat_node")}

    if any(kw in message for kw in ["security", "secret", "vulnerability", "fix issue"]):
        result = SecurityAgent().scan(request)
        findings = result.get("findings", [])
        critical = sum(1 for f in findings if f.get("severity") == "critical")
        high = sum(1 for f in findings if f.get("severity") == "high")
        response = ChatResult(
            message=(
                f"Security scan complete. Found {len(findings)} issue(s): "
                f"{critical} critical, {high} high. "
                "I can generate code fixes — review and accept/reject each change."
            ),
            nextActions=["Generate fixes", "View findings", "Run validation"],
            approvalRequired=len(findings) > 0,
        )
        return {"message_response": response.model_dump(), **_log(state, "chat_node")}

    if any(kw in message for kw in ["architect", "aws service", "infrastructure"]):
        result = ArchitectureAgent().generate(request)
        response = ChatResult(
            message="AWS architecture generated. Review the service selection and rationale.",
            nextActions=["Run security scan", "Generate deployment plan"],
            approvalRequired=False,
        )
        return {
            "message_response": response.model_dump(),
            "architecture": result.get("architecture", {}),
            **_log(state, "chat_node"),
        }

    if any(kw in message for kw in ["monitor", "log", "metric", "health", "diagnos"]):
        response = ChatResult(
            message=(
                "I can read CloudWatch logs and metrics to diagnose failures. "
                "Connect an AWS role to enable monitoring."
            ),
            nextActions=["Connect AWS role", "View metrics", "View logs"],
            approvalRequired=False,
        )
        return {"message_response": response.model_dump(), **_log(state, "chat_node")}

    # LangChain-generated response when LLM enabled; deterministic default otherwise.
    reply = (
        "I'm DeployMate's LangGraph agent. I can:\n"
        "• Analyze your repository (detect stack, ports, configs)\n"
        "• Generate an AWS architecture tailored to your app\n"
        "• Scan for security issues and generate fixes\n"
        "• Create a deployment plan and deploy to AWS (with your approval)\n"
        "• Monitor deployed applications and diagnose failures\n\n"
        "What would you like me to do?"
    )
    response = ChatResult(
        message=reply,
        nextActions=[
            "Analyze repository",
            "Generate AWS architecture",
            "Run security scan",
            "Create deployment plan",
        ],
        approvalRequired=False,
    )
    return {"message_response": response.model_dump(), **_log(state, "chat_node")}


def chat_summary_node(state: dict[str, Any]) -> dict[str, Any]:
    chat = state.get("message_response") or {}
    return {"result": chat, **_log(state, "chat_summary_node")}


# ─── Repository ───────────────────────────────────────────────────────────────

def repository_node(state: dict[str, Any]) -> dict[str, Any]:
    result = RepositoryAgent().analyze(request_from_state(state))
    return {"analysis": result.get("analysis", {}), **_log(state, "repository_node")}


# ─── AWS Discovery ────────────────────────────────────────────────────────────

def aws_discovery_node(state: dict[str, Any]) -> dict[str, Any]:
    agent = AwsDiscoveryAgent()
    discovery = agent.discover(
        connection_id=state.get("awsConnectionId") or "aws_conn_demo",
        role_arn="arn:aws:iam::123456789012:role/DeployMateDiscoveryRole",
        external_id="deploymate-demo-external-id",
        region=(state.get("analysis") or {}).get("region", "ap-south-1") or "ap-south-1",
    )
    return {"discovery": discovery, **_log(state, "aws_discovery_node")}


# ─── Architecture ─────────────────────────────────────────────────────────────

def architecture_node(state: dict[str, Any]) -> dict[str, Any]:
    result = ArchitectureAgent().generate(request_from_state(state))
    return {"architecture": result.get("architecture", {}), **_log(state, "architecture_node")}


def architecture_summary_node(state: dict[str, Any]) -> dict[str, Any]:
    architecture = state.get("architecture") or {
        "region": "ap-south-1",
        "nodes": [],
        "edges": [],
        "rationale": [],
        "resourceDecisions": [],
    }
    return {"result": {"architecture": architecture, "engine": _ENGINE}, **_log(state, "architecture_summary_node")}


# ─── Security ─────────────────────────────────────────────────────────────────

def security_node(state: dict[str, Any]) -> dict[str, Any]:
    result = SecurityAgent().scan(request_from_state(state))
    return {"security": result, "findings": result.get("findings", []), **_log(state, "security_node")}


def security_summary_node(state: dict[str, Any]) -> dict[str, Any]:
    security = state.get("security") or {
        "findings": [],
        "summary": {"critical": 0, "high": 0, "medium": 0, "low": 0},
    }
    return {"result": security, **_log(state, "security_summary_node")}


# ─── Code / Infrastructure generation ────────────────────────────────────────

def code_node(state: dict[str, Any]) -> dict[str, Any]:
    result = CodeAgent().generate(request_from_state(state))
    return {"code_changes": result, **_log(state, "code_node")}


def code_summary_node(state: dict[str, Any]) -> dict[str, Any]:
    changes = state.get("code_changes") or {"changes": [], "explanation": "No changes generated."}
    return {"result": changes, **_log(state, "code_summary_node")}


def infrastructure_node(state: dict[str, Any]) -> dict[str, Any]:
    plan = state.get("plan") or {}
    architecture = state.get("architecture") or {}
    decisions = plan.get("resourceDecisions") or architecture.get("resourceDecisions") or []

    allowed, reason = _guard(state, "filesystem.workspace.write", "create", resource="infrastructure")
    if not allowed:
        return {"error": reason, "errors": [{"node": "infrastructure_node", "message": reason}], **_log(state, "infrastructure_node")}

    agent = InfrastructureAgent()
    spec = agent.generate(
        project_id=state.get("projectId") or "",
        region=str(plan.get("region") or architecture.get("region", "ap-south-1")),
        decisions=decisions,
    )
    return {"infrastructure": spec, **_log(state, "infrastructure_node")}


# ─── Validation ───────────────────────────────────────────────────────────────

def validation_node(state: dict[str, Any]) -> dict[str, Any]:
    result = ValidationAgent().validate(request_from_state(state))
    return {"validation": result, **_log(state, "validation_node")}


def validation_summary_node(state: dict[str, Any]) -> dict[str, Any]:
    validation = state.get("validation") or {"checks": [], "ready": False, "summary": "Nothing validated."}
    return {"result": validation, **_log(state, "validation_summary_node")}


# ─── Deployment Plan ──────────────────────────────────────────────────────────

def deployment_plan_node(state: dict[str, Any]) -> dict[str, Any]:
    result = DeploymentAgent().plan(request_from_state(state))
    return {"plan": result, **_log(state, "deployment_plan_node")}


# ─── Policy validation ────────────────────────────────────────────────────────

def _policy_validation(project_id: str, region: str, decisions: list[dict[str, Any]]) -> dict[str, Any]:
    """Validate resource decisions, flagging anything that needs human approval."""
    violations: list[dict[str, Any]] = []

    for decision in decisions:
        action = decision.get("action", decision.get("decision", "create"))
        approval_required = decision.get("approvalRequired", action in {"modify", "delete"})
        if action in {"modify", "delete"} or approval_required:
            violations.append(
                {
                    "id": f"approval_{decision.get('id', 'unknown')}",
                    "severity": "medium",
                    "message": (
                        f"{action} action for {decision.get('service', 'resource')} requires "
                        "explicit human approval."
                    ),
                    "actionId": decision.get("id"),
                }
            )

    return {
        "projectId": project_id,
        "region": region,
        "allowed": True,
        "requiresApproval": bool(violations),
        "violations": violations,
    }


def policy_node(state: dict[str, Any]) -> dict[str, Any]:
    architecture = state.get("architecture") or {}
    plan = state.get("plan") or {}

    decisions = plan.get("resourceDecisions") or architecture.get("resourceDecisions") or []
    region = plan.get("region") or architecture.get("region", "ap-south-1") or "ap-south-1"

    validation = _policy_validation(
        project_id=state.get("projectId") or "",
        region=str(region),
        decisions=decisions,
    )
    return {"policyValidation": validation, **_log(state, "policy_node")}


# ─── Human approval (interrupt/resume) ────────────────────────────────────────

def approval_node(state: dict[str, Any]) -> dict[str, Any]:
    """Pause the workflow and wait for a human decision. Resume via Command(resume=...)."""
    plan = state.get("plan") or {}
    if state.get("approved"):
        update = {"approvalRequired": False, **_log(state, "approval_node")}
        return update

    decision = interrupt(
        {
            "name": "deployment_approval",
            "question": "Approve and execute this deployment plan?",
            "userId": state.get("userId"),
            "projectId": state.get("projectId"),
            "plan": plan,
            "policyValidation": state.get("policyValidation", {}),
        }
    )
    approved = bool(decision and decision.get("approved", False))
    return {
        "approval": decision or {},
        "approved": approved,
        "approvalRequired": not approved,
        **_log(state, "approval_node"),
    }


def route_after_approval(state: dict[str, Any]) -> str:
    return "deployment" if state.get("approved") else "rejected"


def rejected_node(state: dict[str, Any]) -> dict[str, Any]:
    return {
        "result": {
            "status": "REJECTED",
            "message": "Deployment plan was rejected by the user. No AWS resources were created or modified.",
            "plan": state.get("plan", {}),
            "engine": _ENGINE,
        },
        **_log(state, "rejected_node"),
    }


# ─── Deployment execution (structured tools only) ─────────────────────────────

# Selectable compute capabilities → permission-checked guard tool, in priority order.
_COMPUTE_GUARDS = (
    ("ecs", "aws.ecs.create"),
    ("lambda", "aws.lambda.create"),
    ("apprunner", "aws.apprunner.create"),
    ("amplify", "aws.amplify.create"),
)


def _compute_guard(plan: dict[str, Any]) -> tuple[str, str]:
    """Choose the compute guard tool from the plan's selected services."""
    tokens = " ".join(
        [str(r) for r in plan.get("resources", [])]
        + [str(d.get("service", "")) for d in plan.get("resourceDecisions", [])]
    ).lower().replace(" ", "")
    for key, tool in _COMPUTE_GUARDS:
        if key in tokens:
            return tool, f"{key}-service"
    return "aws.apprunner.create", "compute-service"


def deployment_node(state: dict[str, Any]) -> dict[str, Any]:
    """Execute the approved plan through scoped AWS tool actions (stub executor)."""
    plan = state.get("plan") or {}
    actions = create_deployment_actions(plan, region=str(plan.get("region", "ap-south-1")))

    tool, resource = _compute_guard(plan)
    allowed, reason = _guard(state, tool, "create", resource=resource)
    if not allowed:
        return {"error": reason, "errors": [{"node": "deployment_node", "message": reason}], **_log(state, "deployment_node")}

    execution = execute_deployment_actions(actions, approved=bool(state.get("approved")))
    return {"deployment_spec": plan, "execution": execution, **_log(state, "deployment_node")}


def deployment_summary_node(state: dict[str, Any]) -> dict[str, Any]:
    execution = state.get("execution") or {}
    plan = state.get("plan") or {}
    return {
        "result": {
            "status": execution.get("status", "PENDING"),
            "url": execution.get("url"),
            "steps": execution.get("results", []),
            "deploymentId": execution.get("deploymentId"),
            "plan": plan,
            "engine": _ENGINE,
        },
        **_log(state, "deployment_summary_node"),
    }


# ─── Monitoring + Diagnosis + Repair ─────────────────────────────────────────

def monitoring_node(state: dict[str, Any]) -> dict[str, Any]:
    result = MonitoringAgent().analyze(request_from_state(state))
    return {"diagnosis": result, **_log(state, "monitoring_node")}


def diagnosis_node(state: dict[str, Any]) -> dict[str, Any]:
    diagnosis = state.get("diagnosis") or {}
    return {"result": {"diagnosis": diagnosis, "status": diagnosis.get("status", "healthy")}, **_log(state, "diagnosis_node")}


def repair_node(state: dict[str, Any]) -> dict[str, Any]:
    diagnosis = state.get("diagnosis") or {}
    d = diagnosis.get("diagnosis", {}) or {}

    proposal = {
        "status": diagnosis.get("status", "healthy"),
        "rootCause": d.get("rootCause"),
        "severity": d.get("severity", "low"),
        "explanation": d.get("explanation", "No failure detected."),
        "suggestedFix": d.get("suggestedFix"),
        "preventionAdvice": d.get("preventionAdvice"),
        "detectedPatterns": diagnosis.get("detectedPatterns", []),
        "approvalRequired": diagnosis.get("status") != "healthy",
    }

    llm_repair = call_llm_json(REPAIR_SYSTEM_PROMPT, f"Diagnosis: {d}", fallback=None)
    if llm_repair:
        proposal["steps"] = llm_repair.get("steps", [])
        proposal["prevention"] = llm_repair.get("prevention", d.get("preventionAdvice"))

    return {"repair": proposal, **_log(state, "repair_node")}


def repair_summary_node(state: dict[str, Any]) -> dict[str, Any]:
    diagnosis = state.get("diagnosis") or {}
    repair = state.get("repair") or {}
    return {
        "result": {"diagnosis": diagnosis, "repair": repair, "engine": _ENGINE},
        **_log(state, "repair_summary_node"),
    }


def pipeline_summary_node(state: dict[str, Any]) -> dict[str, Any]:
    """Aggregate the full pipeline into the final result payload."""
    execution = state.get("execution") or {}
    diagnosis = state.get("diagnosis") or {}
    repair = state.get("repair") or {}

    approved = state.get("approved")
    if approved is False:
        summary = state.get("result") or {
            "status": "REJECTED",
            "message": "Deployment plan was rejected by the user. No AWS resources were created or modified.",
        }
    else:
        summary = {
            "status": execution.get("status", "PENDING"),
            "analysis": state.get("analysis", {}),
            "architecture": state.get("architecture", {}),
            "security": state.get("security", {}),
            "validation": state.get("validation", {}),
            "plan": state.get("plan", {}),
            "policyValidation": state.get("policyValidation", {}),
            "infrastructure": state.get("infrastructure", {}),
            "execution": execution,
            "url": execution.get("url"),
            "diagnosis": diagnosis,
            "repair": repair,
            "engine": _ENGINE,
        }
    return {"result": summary, **_log(state, "pipeline_summary_node")}


# ─── Terminal summary nodes for single-agent workflows ───────────────────────

def finalize_analysis(state: dict[str, Any]) -> dict[str, Any]:
    return {
        "result": {
            "analysis": state.get("analysis", {}),
            "awsDiscovery": state.get("discovery", {}),
            "architecture": state.get("architecture", {}),
            "security": state.get("security", {}),
            "policyValidation": state.get("policyValidation", {}),
            "engine": _ENGINE,
        },
        **_log(state, "finalize_analysis"),
    }


def finalize_deployment(state: dict[str, Any]) -> dict[str, Any]:
    plan = state.get("plan", {})
    return {
        "result": {
            "steps": plan.get("steps", []),
            "resources": plan.get("resources", []),
            "region": plan.get("region", "ap-south-1"),
            "estimatedMinutes": plan.get("estimatedMinutes", 8),
            "requiresApproval": True,
            "policyValidation": state.get("policyValidation") or plan.get("policyValidation", {}),
            "validation": state.get("validation", {}),
            "infrastructure": state.get("infrastructure", {}),
            "engine": _ENGINE,
        },
        **_log(state, "finalize_deployment"),
    }