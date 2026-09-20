import logging
import time
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from agents.RepoAgent.core import RepoAgent
from agents.RepoAgent.repo_loader import clone_repo
from agents.architecture_agent import run as run_architecture

logging.basicConfig(level=logging.INFO, format="[ai-services] %(asctime)s %(levelname)s %(message)s")
app = FastAPI(title="DeployMate AI Services", version="1.0.0")


class ProcessRequest(BaseModel):
    action: Literal["analyze", "architecture"]
    repo_path: str | None = None
    repo_url: str | None = None
    analysis: Any | None = None
    requirements: str = ""
    region: str = "ap-south-1"


@app.get("/health")
def health() -> dict[str, object]:
    return {"status": "ok", "agents": ["repository", "architecture"]}


@app.post("/process")
def process(request: ProcessRequest) -> dict[str, object]:
    started = time.perf_counter()
    try:
        if request.action == "analyze":
            path = request.repo_path
            temporary = None
            if not path and request.repo_url:
                temporary = clone_repo(request.repo_url)
                path = temporary
            if not path or not Path(path).is_dir():
                raise HTTPException(status_code=400, detail="repo_path or repo_url is required")
            try:
                result = RepoAgent(path).run()
            finally:
                if temporary:
                    import shutil
                    shutil.rmtree(temporary, ignore_errors=True)
            payload = {"summary": result}
        else:
            if request.analysis is None:
                raise HTTPException(status_code=400, detail="analysis is required")
            payload = {"architecture": run_architecture(request.analysis, request.requirements, request.region)}
        logging.info("action=%s duration_ms=%.1f", request.action, (time.perf_counter() - started) * 1000)
        return {"action": request.action, "result": payload}
    except HTTPException:
        raise
    except Exception as exc:
        logging.exception("action=%s failed", request.action)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
