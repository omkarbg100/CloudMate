"""Docker tools — parse and validate Dockerfiles without running the Docker daemon."""

from __future__ import annotations

import re
from typing import Any


def parse_dockerfile(content: str) -> dict[str, Any]:
    """Extract key information from a Dockerfile."""
    expose_ports = re.findall(r"^EXPOSE\s+(\d+)", content, re.MULTILINE)
    from_images = re.findall(r"^FROM\s+(\S+)", content, re.MULTILINE)
    env_vars = re.findall(r"^ENV\s+([A-Z_]+)", content, re.MULTILINE)
    workdir = next(iter(re.findall(r"^WORKDIR\s+(\S+)", content, re.MULTILINE)), None)
    cmd = re.findall(r"^(?:CMD|ENTRYPOINT)\s+(.+)", content, re.MULTILINE)
    healthcheck = bool(re.search(r"^HEALTHCHECK", content, re.MULTILINE))
    user = next(iter(re.findall(r"^USER\s+(\S+)", content, re.MULTILINE)), None)

    return {
        "baseImages": from_images,
        "exposedPorts": [int(p) for p in expose_ports],
        "envVars": env_vars,
        "workdir": workdir,
        "commands": cmd,
        "hasHealthcheck": healthcheck,
        "user": user,
        "isRootUser": user is None or user == "root",
    }


def validate_dockerfile(content: str) -> list[dict[str, str]]:
    """Validate a Dockerfile and return a list of issues."""
    issues = []
    parsed = parse_dockerfile(content)

    if not parsed["exposedPorts"]:
        issues.append({"severity": "medium", "message": "No EXPOSE instruction found. Add EXPOSE <port>."})

    if parsed["isRootUser"]:
        issues.append({"severity": "medium", "message": "Container runs as root. Add USER nonroot for security."})

    if not parsed["hasHealthcheck"]:
        issues.append({"severity": "low", "message": "No HEALTHCHECK instruction. Add one for App Runner compatibility."})

    if not parsed["baseImages"]:
        issues.append({"severity": "high", "message": "No FROM instruction found. Invalid Dockerfile."})
    else:
        base = parsed["baseImages"][-1]
        if ":latest" in base or ":" not in base:
            issues.append({"severity": "low", "message": f"Base image '{base}' uses implicit latest tag. Pin to a version."})

    return issues


def generate_dockerfile(analysis: dict[str, Any]) -> str:
    """Generate a Dockerfile based on repository analysis."""
    backend = analysis.get("backend", {})
    runtime = backend.get("runtime", "Node.js")
    port = backend.get("port", 3000)
    start_cmd = backend.get("startCommand", "npm start")
    pkg_manager = analysis.get("packageManager", "npm")

    if "Python" in runtime:
        return f"""FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt* pyproject.toml* ./
RUN pip install --no-cache-dir -r requirements.txt || pip install --no-cache-dir .

COPY . .

EXPOSE {port}

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD curl -f http://localhost:{port}/health || exit 1

USER nonroot
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "{port}"]
"""

    install_cmd = f"{pkg_manager} ci --only=production" if pkg_manager == "npm" else f"{pkg_manager} install --prod"
    return f"""FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN {install_cmd}

COPY . .

EXPOSE {port}

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://localhost:{port}/health || exit 1

USER node
CMD {json_cmd(start_cmd)}
"""


def json_cmd(cmd: str) -> str:
    parts = cmd.split()
    return "[" + ", ".join(f'"{p}"' for p in parts) + "]"