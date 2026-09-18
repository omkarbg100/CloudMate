"""
Shared typed graph state for the DeployMate LangGraph workflows.

Every node takes a `DeploymateState` dict, reads the fields it needs, and
returns a partial dict update that LangGraph merges back. State flows between
agents so repository info, AWS resources, architecture decisions, deployment
specs, validation results, approvals, errors, and execution results are all
shared across every node.

Isolation: every run carries `userId` + `projectId` (+ optional `accountId`)
so multiple users, repositories, and AWS accounts never share state.
"""

from __future__ import annotations

from operator import add
from typing import Annotated, Any, TypedDict

from utils.schemas import ProcessRequest


class DeploymateState(TypedDict, total=False):
    """Canonical graph state shared by all nodes."""

    # ── identity / isolation ──────────────────────────────────────────────────
    userId: str | None
    projectId: str | None
    accountId: str | None  # AWS account id (isolated per user)

    # ── request fields (mirror ProcessRequest) ────────────────────────────────
    action: str
    message: str | None
    repoOwner: str | None
    repoName: str | None
    branch: str
    githubToken: str | None
    awsConnectionId: str | None
    filePath: str | None
    fileContent: str | None
    context: dict[str, Any]

    # ── agent outputs passed between nodes ─────────────────────────────────────
    analysis: dict[str, Any] | None
    discovery: dict[str, Any] | None
    architecture: dict[str, Any] | None
    security: dict[str, Any] | None
    findings: list[dict[str, Any]] | None
    code_changes: dict[str, Any] | None
    infrastructure: dict[str, Any] | None
    validation: dict[str, Any] | None
    plan: dict[str, Any] | None
    policyValidation: dict[str, Any] | None
    diagnosis: dict[str, Any] | None
    repair: dict[str, Any] | None
    deployment_spec: dict[str, Any] | None
    execution: dict[str, Any] | None

    # ── approval / gate control ───────────────────────────────────────────────
    approval: dict[str, Any] | None
    approvalRequired: bool
    approved: bool | None

    # ── multi-agent coordination ──────────────────────────────────────────────
    next_agent: str | None  # hint set by a router node

    # ── final payload returned to the caller ──────────────────────────────────
    result: dict[str, Any] | None

    # ── audit trail / failure recovery ────────────────────────────────────────
    history: Annotated[list[str], add]
    errors: Annotated[list[dict[str, Any]], add]
    error: str | None


class DeploymateConfig(TypedDict, total=False):
    """Per-run runtime config (thread_id enables checkpoints/resume)."""
    thread_id: str
    recursion_limit: int


def state_from_request(request: ProcessRequest, userId: str | None = None) -> dict[str, Any]:
    """Convert a ProcessRequest into initial graph state."""
    return {
        "action": request.action,
        "userId": userId,
        "projectId": request.projectId,
        "message": request.message,
        "repoOwner": request.repoOwner,
        "repoName": request.repoName,
        "branch": request.branch or "main",
        "githubToken": request.githubToken,
        "awsConnectionId": request.awsConnectionId,
        "filePath": request.filePath,
        "fileContent": request.fileContent,
        "context": request.context or {},
        "analysis": request.analysis,
        "awsDiscovery": request.awsDiscovery,
        "architecture": request.architecture,
        "findings": request.findings,
        "history": [],
        "errors": [],
        "approvalRequired": False,
        "approved": None,
    }


def request_from_state(state: dict[str, Any]) -> ProcessRequest:
    """Rebuild a ProcessRequest from the current graph state."""
    return ProcessRequest(
        action=state.get("action", ""),
        projectId=state.get("projectId"),
        message=state.get("message"),
        repoOwner=state.get("repoOwner"),
        repoName=state.get("repoName"),
        branch=state.get("branch", "main"),
        githubToken=state.get("githubToken"),
        awsConnectionId=state.get("awsConnectionId"),
        filePath=state.get("filePath"),
        fileContent=state.get("fileContent"),
        context=state.get("context") or {},
        analysis=state.get("analysis"),
        awsDiscovery=state.get("discovery") or state.get("awsDiscovery"),
        architecture=state.get("architecture"),
        findings=state.get("findings"),
    )