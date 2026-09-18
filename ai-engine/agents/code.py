"""
Code Agent — generates code fixes, patches, and new files.
Uses Gemini/Groq when available; falls back to rule-based generation.
"""

from __future__ import annotations

from typing import Any

from tools.docker import generate_dockerfile
from tools.filesystem import diff
from tools.llm import call_llm_json
from utils.prompts import CODE_SYSTEM_PROMPT
from utils.schemas import ProcessRequest


class CodeAgent:
    """Generates code changes in response to security findings or user requests."""

    def generate(self, request: ProcessRequest) -> dict[str, Any]:
        findings = request.findings or []
        analysis = request.analysis or {}
        changes: list[dict[str, Any]] = []

        for finding in findings:
            change = self._fix_finding(finding, analysis, request)
            if change:
                changes.append(change)

        # Try LangChain for additional changes if enabled
        if request.message:
            llm_changes = call_llm_json(
                system_prompt=CODE_SYSTEM_PROMPT,
                user_prompt=(
                    f"User request: {request.message}\n"
                    f"Analysis: {analysis}\n"
                    f"Findings: {findings}"
                ),
                fallback={"changes": []},
            )
            for c in (llm_changes or {}).get("changes", []):
                c["diff"] = diff("", c.get("proposed", ""), c.get("file", "file"))
                c["original"] = None
                changes.append(c)

        return {
            "changes": changes,
            "explanation": f"Generated {len(changes)} change(s) to fix detected issues.",
        }

    def _fix_finding(self, finding: dict[str, Any], analysis: dict[str, Any], request: ProcessRequest) -> dict[str, Any] | None:
        ftype = finding.get("type", "")

        if ftype == "dockerfile_missing":
            content = generate_dockerfile(analysis)
            return {
                "file": "Dockerfile",
                "action": "create",
                "original": None,
                "proposed": content,
                "diff": diff("", content, "Dockerfile"),
                "description": "Generated Dockerfile for containerised deployment to App Runner.",
            }

        if ftype == "health_check":
            health_route = self._generate_health_route(analysis)
            return {
                "file": "src/health.js",
                "action": "create",
                "original": None,
                "proposed": health_route,
                "diff": diff("", health_route, "src/health.js"),
                "description": "Added /health route required for App Runner health checks.",
            }

        if ftype == "missing_secret_binding":
            env_vars = analysis.get("environmentVariables", [])
            example_content = "\n".join(f"{v}=" for v in env_vars)
            return {
                "file": ".env.example",
                "action": "create",
                "original": None,
                "proposed": example_content,
                "diff": diff("", example_content, ".env.example"),
                "description": "Created .env.example documenting all required environment variables.",
            }

        if ftype == "dockerignore_missing":
            content = "node_modules\n.env\n.env.*\n*.log\ndist\n.git\n"
            return {
                "file": ".dockerignore",
                "action": "create",
                "original": None,
                "proposed": content,
                "diff": diff("", content, ".dockerignore"),
                "description": "Added .dockerignore to exclude node_modules and secrets from Docker image.",
            }

        return None

    def _generate_health_route(self, analysis: dict[str, Any]) -> str:
        runtime = analysis.get("backend", {}).get("runtime", "Node.js")
        if "Python" in runtime:
            return '''from fastapi import APIRouter\n\nrouter = APIRouter()\n\n@router.get("/health")\ndef health():\n    return {"status": "ok"}\n'''
        return '''import { Router } from "express";\n\nconst router = Router();\n\nrouter.get("/health", (_req, res) => {\n  res.json({ status: "ok", timestamp: new Date().toISOString() });\n});\n\nexport default router;\n'''
