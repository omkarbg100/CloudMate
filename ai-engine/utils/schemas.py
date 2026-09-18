"""Pydantic models for all AI engine requests and responses."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

# ─── Unified Process Request ──────────────────────────────────────────────────

class ProcessRequest(BaseModel):
    """Single unified request model for the /process endpoint."""
    action: str
    projectId: str | None = None
    userId: str | None = None
    message: str | None = None
    repoOwner: str | None = None
    repoName: str | None = None
    branch: str = "main"
    githubToken: str | None = None
    awsConnectionId: str | None = None
    analysis: dict[str, Any] | None = None
    awsDiscovery: dict[str, Any] | None = None
    architecture: dict[str, Any] | None = None
    findings: list[dict[str, Any]] | None = None
    filePath: str | None = None
    fileContent: str | None = None
    context: dict[str, Any] | None = Field(default_factory=dict)


# ─── Analysis ────────────────────────────────────────────────────────────────

class FrontendInfo(BaseModel):
    framework: str = ""
    buildCommand: str = ""
    outputDir: str = "dist"


class BackendInfo(BaseModel):
    framework: str = ""
    runtime: str = ""
    port: int = 3000
    startCommand: str = ""


class AnalysisResult(BaseModel):
    languages: list[str] = []
    frontend: FrontendInfo | None = None
    backend: BackendInfo | None = None
    database: str | None = None
    docker: bool = False
    packageManager: str = "npm"
    ports: list[int] = []
    environmentVariables: list[str] = []
    tests: list[str] = []
    agentNotes: str = ""


# ─── Architecture ────────────────────────────────────────────────────────────

class ArchitectureNode(BaseModel):
    id: str
    label: str
    service: str
    purpose: str
    decision: str = "create"  # create | reuse | modify
    existingResourceId: str | None = None


class ArchitectureEdge(BaseModel):
    from_: str = Field(..., alias="from")
    to: str
    label: str

    class Config:
        populate_by_name = True


class ResourceDecision(BaseModel):
    id: str
    service: str
    action: str  # create | reuse | modify
    targetName: str
    existingResourceId: str | None = None
    reason: str
    riskLevel: str = "low"
    approvalRequired: bool = True


class ArchitectureResult(BaseModel):
    region: str = "ap-south-1"
    nodes: list[ArchitectureNode] = []
    edges: list[dict[str, str]] = []
    rationale: list[str] = []
    resourceDecisions: list[ResourceDecision] = []


# ─── Security ────────────────────────────────────────────────────────────────

class SecurityFinding(BaseModel):
    id: str
    severity: str  # critical | high | medium | low
    file: str
    type: str
    description: str
    recommendation: str


class SecurityResult(BaseModel):
    findings: list[SecurityFinding] = []
    summary: dict[str, int] = Field(default_factory=lambda: {"critical": 0, "high": 0, "medium": 0, "low": 0})


# ─── Code Changes ─────────────────────────────────────────────────────────────

class CodeChange(BaseModel):
    file: str
    action: str  # create | modify | delete
    original: str | None = None
    proposed: str
    diff: str
    description: str


class CodeResult(BaseModel):
    changes: list[CodeChange] = []
    explanation: str = ""


# ─── Validation ──────────────────────────────────────────────────────────────

class ValidationCheck(BaseModel):
    name: str
    status: str  # pass | fail | skip
    message: str


class ValidationResult(BaseModel):
    checks: list[ValidationCheck] = []
    ready: bool = False
    summary: str = ""


# ─── Deployment Plan ─────────────────────────────────────────────────────────

class DeploymentPlanResult(BaseModel):
    steps: list[str] = []
    resources: list[str] = []
    region: str = "ap-south-1"
    requiresApproval: bool = True
    policyValidation: dict[str, Any] = Field(default_factory=dict)


# ─── Chat ─────────────────────────────────────────────────────────────────────

class ChatResult(BaseModel):
    message: str
    nextActions: list[str] = []
    approvalRequired: bool = False
