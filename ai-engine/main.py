from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from agents.orchestrator import OrchestratorAgent
from graphs.graph import VALID_ACTIONS
from utils.schemas import ProcessRequest

load_dotenv()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    print("[deploymate] AI Engine (LangChain + LangGraph) starting up")
    yield
    print("[deploymate] AI Engine shutting down")


app = FastAPI(title="DeployMate AI Engine", version="0.3.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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