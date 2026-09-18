import time
import traceback
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from agents.orchestrator import OrchestratorAgent
from graphs.graph import VALID_ACTIONS
from utils.schemas import ProcessRequest

load_dotenv()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    print("[ai-engine] AI Engine (LangChain + LangGraph) starting up")
    yield
    print("[ai-engine] AI Engine shutting down")


app = FastAPI(title="DeployMate AI Engine", version="0.3.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Print every API call with method, path, status and duration (no bodies)."""
    started = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - started) * 1000
    print(
        f"[ai-engine] {request.method} {request.url.path} -> {response.status_code} ({duration_ms:.1f}ms)"
    )
    return response


@app.exception_handler(HTTPException)
async def http_exception_logger(request: Request, exc: HTTPException):
    """Print handled HTTP errors (e.g. 400 unknown action)."""
    print(
        f"[ai-engine] HTTP {exc.status_code} on {request.method} {request.url.path}: {exc.detail}"
    )
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def unhandled_exception_logger(request: Request, exc: Exception):
    """Print any uncaught error with its traceback, then return 500."""
    print(f"[ai-engine] ERROR on {request.method} {request.url.path}: {exc}")
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


orchestrator = OrchestratorAgent()


class ApprovalDecision(BaseModel):
    approved: bool
    note: str | None = Field(default=None)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "deploymate-ai-engine", "engine": "langchain-langgraph", "version": "0.3.0"}


@app.post("/process")
def process(request: ProcessRequest) -> dict[str, object]:
    """
    Unified endpoint — runs the LangGraph orchestration graph.
    `action=="pipeline"` pauses at the human-approval gate and returns
    `status: "NEEDS_APPROVAL"` with a `threadId`; resume via /workflow/resume.
    """
    if request.action not in VALID_ACTIONS:
        raise HTTPException(status_code=400, detail=f"Unknown action: {request.action}")

    return orchestrator.dispatch(request, userId=request.userId)


@app.post("/workflow/{thread_id}/approve")
def approve_workflow(thread_id: str, decision: ApprovalDecision) -> dict[str, object]:
    """Approve/resume an interrupted pipeline. Decision: approved (bool)."""
    return orchestrator.resume(thread_id, {"approved": decision.approved, "note": decision.note})