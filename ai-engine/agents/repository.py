"""
Repository Agent — analyzes a GitHub repository to detect stack, ports,
package managers, environment variables, and deployment requirements.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any

from utils.schemas import ProcessRequest

# File patterns to detect frameworks
FRAMEWORK_PATTERNS = {
    "React": ["react", "@vitejs/plugin-react"],
    "Vue": ["vue", "@vitejs/plugin-vue"],
    "Angular": ["@angular/core"],
    "Next.js": ["next"],
    "Express": ["express"],
    "Fastify": ["fastify"],
    "NestJS": ["@nestjs/core"],
    "Django": ["django"],
    "Flask": ["flask"],
    "FastAPI": ["fastapi"],
}

RUNTIME_MAP = {
    "package.json": "Node.js",
    "requirements.txt": "Python",
    "pyproject.toml": "Python",
    "pom.xml": "Java",
    "go.mod": "Go",
    "Cargo.toml": "Rust",
}

DATABASE_PATTERNS = {
    "MongoDB": ["mongoose", "mongodb", "pymongo", "motor"],
    "PostgreSQL": ["pg", "postgresql", "psycopg2", "asyncpg"],
    "MySQL": ["mysql", "mysql2", "pymysql"],
    "Redis": ["redis", "ioredis"],
    "SQLite": ["sqlite", "sqlite3", "better-sqlite3"],
    "DynamoDB": ["dynamodb", "boto3"],
}


class RepositoryAgent:
    """Analyzes a repository and returns a structured AnalysisResult."""

    def analyze(self, request: ProcessRequest) -> dict[str, Any]:
        """
        Analyze the repository. If a GitHub token is available, fetches real
        file contents. Otherwise returns a structured mock based on project name.
        """
        github_token = request.githubToken or os.getenv("GITHUB_TOKEN")

        if github_token and request.repoOwner and request.repoName:
            return self._analyze_real(request, github_token)

        return self._analyze_fallback(request)

    def _analyze_real(self, request: ProcessRequest, token: str) -> dict[str, Any]:
        """Fetch files from GitHub API and analyze them."""
        try:
            from github import Github

            g = Github(token)
            repo = g.get_repo(f"{request.repoOwner}/{request.repoName}")

            raw_files: dict[str, str] = {}
            for filename in [
                "package.json", "requirements.txt", "pyproject.toml",
                "Dockerfile", "docker-compose.yml", ".env.example",
                "README.md", "pom.xml", "go.mod",
            ]:
                try:
                    content = repo.get_contents(filename, ref=request.branch)
                    raw_files[filename] = content.decoded_content.decode("utf-8", errors="ignore")
                except Exception:
                    pass

            return self._parse_files(request.projectId or "", raw_files)
        except Exception as e:
            return self._analyze_fallback(request, notes=f"GitHub API error: {e}")

    def _parse_files(self, project_id: str, files: dict[str, str]) -> dict[str, Any]:
        """Parse fetched file contents into structured analysis."""
        languages: list[str] = []
        frontend = None
        backend = None
        database = None
        docker = "Dockerfile" in files
        package_manager = "npm"
        ports: list[int] = []
        env_vars: list[str] = []

        # Parse package.json
        pkg = {}
        if "package.json" in files:
            languages.append("JavaScript")
            try:
                pkg = json.loads(files["package.json"])
            except json.JSONDecodeError:
                pass

            all_deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}

            # Detect package manager
            if "pnpm" in pkg.get("scripts", {}).get("install", ""):
                package_manager = "pnpm"

            # Detect frontend
            for fw, patterns in FRAMEWORK_PATTERNS.items():
                if any(p in all_deps for p in patterns):
                    if fw in ("React", "Vue", "Angular", "Next.js"):
                        build_cmd = pkg.get("scripts", {}).get("build", "npm run build")
                        frontend = {"framework": fw, "buildCommand": build_cmd}

            # Detect backend
            for fw, patterns in FRAMEWORK_PATTERNS.items():
                if any(p in all_deps for p in patterns):
                    if fw in ("Express", "Fastify", "NestJS"):
                        start_cmd = pkg.get("scripts", {}).get("start", "npm start")
                        backend = {"framework": fw, "runtime": "Node.js", "port": 3000, "startCommand": start_cmd}

            # Detect database
            for db, patterns in DATABASE_PATTERNS.items():
                if any(p in all_deps for p in patterns):
                    database = db
                    break

        # Parse Python requirements
        if "requirements.txt" in files or "pyproject.toml" in files:
            languages.append("Python")
            content = files.get("requirements.txt", "") + files.get("pyproject.toml", "")
            for fw, patterns in FRAMEWORK_PATTERNS.items():
                if any(p.lower() in content.lower() for p in patterns):
                    if fw in ("Django", "Flask", "FastAPI"):
                        backend = {"framework": fw, "runtime": "Python", "port": 8000, "startCommand": "uvicorn main:app"}
            for db, patterns in DATABASE_PATTERNS.items():
                if any(p.lower() in content.lower() for p in patterns):
                    database = db
                    break

        # Parse Dockerfile for ports
        if "Dockerfile" in files:
            expose_matches = re.findall(r"EXPOSE\s+(\d+)", files["Dockerfile"])
            ports = [int(p) for p in expose_matches]

        if not ports and backend:
            ports = [backend.get("port", 3000)]

        # Parse .env.example for env vars
        if ".env.example" in files:
            for line in files[".env.example"].splitlines():
                if "=" in line and not line.startswith("#"):
                    key = line.split("=")[0].strip()
                    if key:
                        env_vars.append(key)

        if not languages:
            languages = ["JavaScript"]

        analysis = {
            "languages": languages,
            "frontend": frontend,
            "backend": backend or {"framework": "Express", "runtime": "Node.js", "port": 3000, "startCommand": "npm start"},
            "database": database,
            "docker": docker,
            "packageManager": package_manager,
            "ports": ports or [3000],
            "environmentVariables": env_vars,
            "tests": [f"{package_manager} test"] if "test" in pkg.get("scripts", {}) else [],
            "agentNotes": f"Analyzed {len(files)} files from repository.",
        }
        return {"analysis": analysis}

    def _analyze_fallback(self, request: ProcessRequest, notes: str = "") -> dict[str, Any]:
        """Return a realistic fallback when GitHub API is unavailable."""
        analysis = {
            "languages": ["JavaScript", "TypeScript"],
            "frontend": {"framework": "React", "buildCommand": "npm run build"},
            "backend": {"framework": "Express", "runtime": "Node.js", "port": 5000, "startCommand": "npm start"},
            "database": "MongoDB",
            "docker": True,
            "packageManager": "npm",
            "ports": [5000],
            "environmentVariables": ["PORT", "MONGODB_URI", "AWS_REGION", "NODE_ENV"],
            "tests": ["npm test"],
            "agentNotes": notes or "GitHub token not configured — using representative fallback analysis.",
        }
        return {"analysis": analysis}
