"""
Monitoring Agent — analyzes CloudWatch logs and metrics to diagnose failures.
Uses Gemini/Groq for intelligent root-cause analysis.
"""

from __future__ import annotations

import re
from typing import Any

from tools.aws import get_cloudwatch_logs
from tools.llm import call_llm_json
from utils.prompts import MONITORING_SYSTEM_PROMPT
from utils.schemas import ProcessRequest

# Known failure pattern rules
FAILURE_PATTERNS = [
    (re.compile(r"MongoServerSelectionError|ECONNREFUSED.*mongo|Cannot connect.*mongo", re.I),
     "Database Connection Failure",
     "critical",
     "MONGODB_URI may be missing or incorrect. Check Secrets Manager binding in App Runner.",
     "Verify MONGODB_URI in Secrets Manager and ensure App Runner has access."),

    (re.compile(r"Cannot find module|MODULE_NOT_FOUND", re.I),
     "Missing Module",
     "high",
     "A required Node.js module is missing. Dependencies may not be installed in the Docker image.",
     "Ensure Dockerfile runs npm ci --only=production before COPY."),

    (re.compile(r"EADDRINUSE|address already in use", re.I),
     "Port Already In Use",
     "medium",
     "The application port is already bound by another process.",
     "Check if multiple process instances are starting. Ensure only one server starts."),

    (re.compile(r"OOMKilled|out of memory|heap allocation failed", re.I),
     "Out of Memory",
     "critical",
     "The container ran out of memory.",
     "Increase App Runner memory configuration or optimize memory usage."),

    (re.compile(r"health check failed|HEALTH_CHECK_FAILED", re.I),
     "Health Check Failure",
     "high",
     "App Runner health check is failing on /health endpoint.",
     "Ensure /health returns 200 OK within 5 seconds. Check application startup logs."),

    (re.compile(r"UnauthorizedError|JsonWebTokenError|invalid signature", re.I),
     "Authentication Error",
     "medium",
     "JWT or authentication is failing.",
     "Verify JWT_SECRET is set correctly in Secrets Manager."),
]


class MonitoringAgent:
    """Analyzes logs and metrics to detect and explain application failures."""

    def analyze(self, request: ProcessRequest) -> dict[str, Any]:
        project_id = request.projectId or ""
        context = request.context or {}

        # Get logs (from context or stub)
        logs = context.get("logs") or get_cloudwatch_logs(f"/aws/apprunner/{project_id}")
        log_text = "\n".join(entry.get("message", "") for entry in logs)

        # Rule-based pattern matching
        detected = self._detect_patterns(log_text)

        # LangChain LLM diagnosis if enabled
        llm_diagnosis = call_llm_json(
            system_prompt=MONITORING_SYSTEM_PROMPT,
            user_prompt=f"Logs:\n{log_text}\n\nDetected patterns:\n{detected}",
            fallback=None,
        )

        if llm_diagnosis:
            return {
                "status": "analyzed",
                "detectedPatterns": detected,
                "diagnosis": llm_diagnosis,
                "logs": logs[-20:],
            }

        # Rule-based result
        if detected:
            top = detected[0]
            return {
                "status": "analyzed",
                "detectedPatterns": detected,
                "diagnosis": {
                    "rootCause": top["name"],
                    "severity": top["severity"],
                    "explanation": top["explanation"],
                    "suggestedFix": top["fix"],
                    "evidence": top["evidence"],
                },
                "logs": logs[-20:],
            }

        return {
            "status": "healthy",
            "detectedPatterns": [],
            "diagnosis": {
                "rootCause": None,
                "severity": "low",
                "explanation": "No known failure patterns detected in recent logs.",
                "suggestedFix": None,
            },
            "logs": logs[-20:],
        }

    def _detect_patterns(self, log_text: str) -> list[dict[str, Any]]:
        detected = []
        for pattern, name, severity, explanation, fix in FAILURE_PATTERNS:
            match = pattern.search(log_text)
            if match:
                detected.append({
                    "name": name,
                    "severity": severity,
                    "explanation": explanation,
                    "fix": fix,
                    "evidence": match.group(0)[:200],
                })
        return detected
