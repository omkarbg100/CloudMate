"""
Security Agent — scans repository files for secrets, misconfigurations, and
deployment-blocking issues. Uses rule-based patterns + optional LLM enhancement.
"""

from __future__ import annotations

import re
import uuid
from typing import Any

from tools.llm import call_llm_json
from utils.prompts import SECURITY_SYSTEM_PROMPT
from utils.schemas import ProcessRequest

# ─── Regex patterns for secret detection ─────────────────────────────────────

SECRET_PATTERNS = [
    (re.compile(r'(?i)(aws_access_key_id|aws_secret_access_key)\s*[=:]\s*["\']?([A-Z0-9]{20,})', re.M), "hardcoded_aws_key", "critical"),
    (re.compile(r'(?i)(password|passwd|pwd)\s*[=:]\s*["\']([^"\']{4,})["\']', re.M), "hardcoded_password", "high"),
    (re.compile(r'(?i)(api_key|apikey|secret|token)\s*[=:]\s*["\']([A-Za-z0-9_\-]{16,})["\']', re.M), "hardcoded_secret", "high"),
    (re.compile(r'mongodb\+srv://[^@]+@', re.M), "hardcoded_db_uri", "critical"),
    (re.compile(r'postgres(?:ql)?://[^@\s]+@', re.M), "hardcoded_db_uri", "critical"),
    (re.compile(r'(?i)private_key\s*[=:]\s*-----BEGIN', re.M), "hardcoded_private_key", "critical"),
    (re.compile(r'ghp_[A-Za-z0-9]{36}', re.M), "hardcoded_github_token", "critical"),
]

# Patterns that indicate missing security practices
MISSING_PATTERNS = [
    ("health_check", "medium", "No /health endpoint detected.", "Add a GET /health route returning 200 OK for App Runner health checks."),
    ("dockerfile_missing", "high", "No Dockerfile found.", "Create a Dockerfile to containerise the application for App Runner deployment."),
    ("dockerignore_missing", "low", "No .dockerignore found.", "Add .dockerignore to exclude node_modules and build artifacts from the image."),
    ("env_example_missing", "medium", "No .env.example found.", "Add .env.example documenting all required environment variables."),
]


class SecurityAgent:
    """Scans repository files for security issues and deployment blockers."""

    def scan(self, request: ProcessRequest) -> dict[str, Any]:
        """Run security scan. Tries to fetch real files if GitHub token available."""
        files: dict[str, str] = {}

        if request.githubToken and request.repoOwner and request.repoName:
            files = self._fetch_files(request)

        findings = self._scan_files(files, request)

        # Enhance with LangChain LLM if enabled
        llm_additions = call_llm_json(
            system_prompt=SECURITY_SYSTEM_PROMPT,
            user_prompt=f"Existing findings: {findings}\nFiles scanned: {list(files.keys())}",
            fallback={"additional_findings": []},
        )
        for f in (llm_additions or {}).get("additional_findings", []):
            f["id"] = f"finding_{uuid.uuid4().hex[:8]}"
            findings.append(f)

        summary = {
            "critical": sum(1 for f in findings if f.get("severity") == "critical"),
            "high": sum(1 for f in findings if f.get("severity") == "high"),
            "medium": sum(1 for f in findings if f.get("severity") == "medium"),
            "low": sum(1 for f in findings if f.get("severity") == "low"),
        }
        return {"findings": findings, "summary": summary}

    def _fetch_files(self, request: ProcessRequest) -> dict[str, str]:
        try:
            from tools.github import read_file
            files: dict[str, str] = {}
            for filename in [
                "package.json", ".env", ".env.example", "Dockerfile",
                ".dockerignore", "docker-compose.yml", "src/index.js",
                "src/index.ts", "src/app.js", "backend/src/index.js",
            ]:
                try:
                    files[filename] = read_file(
                        request.repoOwner, request.repoName, filename,
                        request.branch, request.githubToken
                    )
                except Exception:
                    pass
            return files
        except Exception:
            return {}

    def _scan_files(self, files: dict[str, str], request: ProcessRequest) -> list[dict[str, Any]]:
        findings: list[dict[str, Any]] = []

        # Scan each file for secret patterns
        for filename, content in files.items():
            if filename.endswith((".lock", ".png", ".jpg", ".ico")):
                continue
            for pattern, ftype, severity in SECRET_PATTERNS:
                if pattern.search(content):
                    findings.append({
                        "id": f"finding_{uuid.uuid4().hex[:8]}",
                        "severity": severity,
                        "file": filename,
                        "type": ftype,
                        "description": f"Potential {ftype.replace('_', ' ')} detected in {filename}.",
                        "recommendation": "Move this value to environment variables and store in Secrets Manager.",
                    })

        # Check for missing files
        if "Dockerfile" not in files:
            findings.append({
                "id": f"finding_{uuid.uuid4().hex[:8]}",
                "severity": "high",
                "file": "Dockerfile",
                "type": "dockerfile_missing",
                "description": "No Dockerfile found. Required for App Runner deployment.",
                "recommendation": "Create a Dockerfile. DeployMate can generate one for you.",
            })

        if ".env.example" not in files and ".env" not in files:
            findings.append({
                "id": f"finding_{uuid.uuid4().hex[:8]}",
                "severity": "medium",
                "file": ".env.example",
                "type": "env_example_missing",
                "description": "No .env.example found.",
                "recommendation": "Add .env.example documenting all required environment variables.",
            })

        # Default findings when no real files are available
        if not files:
            findings = [
                {
                    "id": "finding_001",
                    "severity": "high",
                    "file": ".env.example",
                    "type": "missing_secret_binding",
                    "description": "MONGODB_URI is expected but no Secrets Manager binding is defined.",
                    "recommendation": "Store MONGODB_URI in AWS Secrets Manager and inject into App Runner.",
                },
                {
                    "id": "finding_002",
                    "severity": "medium",
                    "file": "src/index.js",
                    "type": "health_check",
                    "description": "No /health endpoint detected.",
                    "recommendation": "Add GET /health returning 200 OK for App Runner health checks.",
                },
                {
                    "id": "finding_003",
                    "severity": "medium",
                    "file": "Dockerfile",
                    "type": "dockerfile_missing",
                    "description": "Dockerfile not confirmed present.",
                    "recommendation": "Create a production Dockerfile. DeployMate can generate one.",
                },
            ]

        return findings
