# api.py
# DeployMate AI Services — FastAPI application.
#
# Endpoints:
#   GET  /health   — service + provider health check
#   POST /process  — run RepoAgent (analyze) or ArchitectureAgent (architecture)
#   GET  /metrics  — Prometheus metrics

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Literal

import httpx
import structlog
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from agents.RepoAgent.core import RepoAgent
from agents.RepoAgent.repo_loader import clone_repo
from agents.architecture_agent import run_async as run_architecture_async
from utils.logging_config import configure_logging

# ── Prometheus metrics ────────────────────────────────────────────────────────

REQUEST_COUNT = Counter(
    "api_requests_total",
    "Total API requests",
    ["method", "endpoint", "status"],
)
REQUEST_LATENCY = Histogram(
    "api_request_duration_seconds",
    "API request latency",
    ["endpoint"],
)

# ── Lifespan ──────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown logic."""
    configure_logging()
    log = structlog.get_logger("lifespan")

    # Warm-up: probe Ollama
    ollama_url = __import__("os").getenv("OLLAMA_BASE_URL", "http://ollama:11434")
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{ollama_url}/api/tags")
            resp.raise_for_status()
        log.info("ollama_health", status="ok", url=ollama_url)
    except Exception as exc:
        log.warning(
            "ollama_health",
            status="unavailable",
            url=ollama_url,
            detail=str(exc),
            fallback="Gemini API will be used",
        )

    yield  # application runs

    log.info("shutdown")


# ── App factory ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="DeployMate AI Services",
    version="2.0.0",
    description=(
        "Industrial-grade AI service with LiteLLM (Ollama primary / Gemini fallback) "
        "and LangGraph multi-agent orchestration."
    ),
    lifespan=lifespan,
)

# CORS — allow all origins (frontend and backend are separate services)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request-ID middleware ─────────────────────────────────────────────────────


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Attach a UUID request-id to every request / response."""

    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        structlog.contextvars.bind_contextvars(request_id=request_id)
        try:
            response = await call_next(request)
        finally:
            structlog.contextvars.unbind_contextvars("request_id")
        response.headers["X-Request-ID"] = request_id
        return response


app.add_middleware(RequestIDMiddleware)

# ── Pydantic models ───────────────────────────────────────────────────────────


class ProcessRequest(BaseModel):
    action: Literal["analyze", "architecture"]
    repo_path: str | None = None
    repo_url: str | None = None
    analysis: Any | None = None
    requirements: str = ""
    region: str = "ap-south-1"


# ── Routes ────────────────────────────────────────────────────────────────────

log = structlog.get_logger("api")


@app.get("/health")
async def health() -> dict[str, object]:
    """Return service health including upstream provider availability."""
    import os

    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
    ollama_model = os.getenv("OLLAMA_MODEL", "qwen2.5-coder:7b")
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    # Check Ollama availability
    ollama_status = "unavailable"
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            r = await client.get(f"{ollama_url}/api/tags")
            r.raise_for_status()
        ollama_status = "ok"
    except Exception:
        pass

    return {
        "status": "ok",
        "version": "2.0.0",
        "agents": ["repository", "architecture"],
        "providers": {
            "ollama": {
                "status": ollama_status,
                "model": ollama_model,
                "url": ollama_url,
            },
            "gemini": {
                "status": "configured" if gemini_key else "not_configured",
                "model": os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
            },
        },
    }


@app.post("/process")
async def process(request: ProcessRequest) -> dict[str, object]:
    """Run the requested AI action asynchronously."""
    started = time.perf_counter()
    endpoint = f"/process/{request.action}"

    try:
        if request.action == "analyze":
            payload = await _handle_analyze(request)
        else:
            payload = await _handle_architecture(request)

        duration = time.perf_counter() - started
        REQUEST_LATENCY.labels(endpoint=endpoint).observe(duration)
        REQUEST_COUNT.labels(method="POST", endpoint=endpoint, status="2xx").inc()

        log.info(
            "process_ok",
            action=request.action,
            duration_ms=round(duration * 1000, 1),
        )
        return {"action": request.action, "result": payload}

    except HTTPException:
        REQUEST_COUNT.labels(method="POST", endpoint=endpoint, status="4xx").inc()
        raise
    except Exception as exc:
        duration = time.perf_counter() - started
        REQUEST_COUNT.labels(method="POST", endpoint=endpoint, status="5xx").inc()
        log.error("process_failed", action=request.action, error=str(exc), duration_ms=round(duration * 1000, 1))
        raise HTTPException(status_code=500, detail=str(exc)) from exc


async def _handle_analyze(request: ProcessRequest) -> dict:
    path = request.repo_path
    temporary: str | None = None

    if not path and request.repo_url:
        # Clone runs blocking I/O — offload to a thread
        temporary = await asyncio.get_event_loop().run_in_executor(
            None, clone_repo, request.repo_url
        )
        path = temporary

    if not path or not Path(path).is_dir():
        raise HTTPException(status_code=400, detail="repo_path or repo_url is required")

    try:
        agent = RepoAgent(path)
        summary = await agent.async_run()
    finally:
        if temporary:
            import shutil
            await asyncio.get_event_loop().run_in_executor(
                None, lambda: shutil.rmtree(temporary, ignore_errors=True)
            )

    return {"summary": summary}


async def _handle_architecture(request: ProcessRequest) -> dict:
    if request.analysis is None:
        raise HTTPException(status_code=400, detail="analysis is required for action=architecture")

    plan = await run_architecture_async(
        request.analysis,
        request.requirements,
        request.region,
    )
    return {"architecture": plan}


@app.get("/metrics")
async def metrics() -> Response:
    """Expose Prometheus metrics."""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
