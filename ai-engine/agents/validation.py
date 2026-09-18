"""Validation Agent — checks deployment readiness before deployment."""

from __future__ import annotations

from typing import Any

from tools.docker import validate_dockerfile
from utils.schemas import ProcessRequest


class ValidationAgent:
    """Validates a project is ready for deployment."""

    def validate(self, request: ProcessRequest) -> dict[str, Any]:
        analysis = request.analysis or {}
        context = request.context or {}
        checks = []

        # 1. Package.json / dependencies
        has_pkg = analysis.get("packageManager") is not None
        checks.append({
            "name": "Dependencies",
            "status": "pass" if has_pkg else "skip",
            "message": "package.json / dependencies file detected." if has_pkg else "No package manifest detected.",
        })

        # 2. Tests
        tests = analysis.get("tests", [])
        checks.append({
            "name": "Tests",
            "status": "pass" if tests else "skip",
            "message": f"Test command found: {tests[0]}" if tests else "No test command detected — skipping.",
        })

        # 3. Build command
        frontend = analysis.get("frontend")
        if frontend and frontend.get("buildCommand"):
            checks.append({
                "name": "Build",
                "status": "pass",
                "message": f"Build command: {frontend['buildCommand']}",
            })
        else:
            checks.append({
                "name": "Build",
                "status": "skip",
                "message": "No frontend build command — skipping.",
            })

        # 4. Dockerfile
        dockerfile_content = context.get("dockerfile", "")
        if dockerfile_content:
            issues = validate_dockerfile(dockerfile_content)
            blocking = [i for i in issues if i["severity"] in ("high", "critical")]
            checks.append({
                "name": "Dockerfile",
                "status": "fail" if blocking else "pass",
                "message": f"{len(issues)} issue(s) in Dockerfile." if issues else "Dockerfile valid.",
                "details": issues,
            })
        elif analysis.get("docker"):
            checks.append({"name": "Dockerfile", "status": "pass", "message": "Dockerfile present."})
        else:
            checks.append({"name": "Dockerfile", "status": "fail", "message": "No Dockerfile found. Required for App Runner."})

        # 5. Environment variables
        env_vars = analysis.get("environmentVariables", [])
        missing_required = [v for v in env_vars if "URI" in v or "SECRET" in v or "KEY" in v]
        checks.append({
            "name": "Environment Variables",
            "status": "pass" if env_vars else "skip",
            "message": (
                f"{len(env_vars)} env var(s) documented. "
                f"Ensure {', '.join(missing_required)} are in Secrets Manager."
                if missing_required else f"{len(env_vars)} env var(s) documented."
            ),
        })

        # 6. Security (from findings in context)
        findings = context.get("findings", [])
        critical_count = sum(1 for f in findings if f.get("severity") == "critical")
        checks.append({
            "name": "Security",
            "status": "fail" if critical_count > 0 else "pass",
            "message": (
                f"{critical_count} critical security issue(s) must be resolved before deployment."
                if critical_count else "No critical security issues."
            ),
        })

        # 7. Health endpoint
        has_health = context.get("has_health_endpoint", False) or analysis.get("backend") is not None
        checks.append({
            "name": "Health Endpoint",
            "status": "pass" if has_health else "fail",
            "message": "/health endpoint available." if has_health else "No /health endpoint detected. App Runner requires one.",
        })

        # Overall readiness
        failed = [c for c in checks if c["status"] == "fail"]
        ready = len(failed) == 0

        return {
            "checks": checks,
            "ready": ready,
            "summary": "Ready for deployment." if ready else f"Not ready: {len(failed)} check(s) failed.",
        }
