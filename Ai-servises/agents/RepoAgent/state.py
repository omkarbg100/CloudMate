# agent/state.py
# Data class to hold the state of the RepoAgent during analysis.
# Tracks files, read contents, insights, cost metrics, and agent control fields.

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass
class AgentState:
    repo_path: str

    # Discovery
    files: List[str] = field(default_factory=list)
    read_files: Dict[str, str] = field(default_factory=dict)
    insights: List[str] = field(default_factory=list)
    failed_reads: List[str] = field(default_factory=list)

    # Project metadata
    project_type: str | None = None

    # Agent control
    step: int = 0
    max_steps: int = 15
    last_decision: Dict[str, Any] = field(default_factory=dict)
    summary: str = ""

    # Token / cost tracking
    total_prompt_tokens: int = 0
    total_completion_tokens: int = 0
    total_cost_eur: float = 0.0


# ── LangGraph TypedDict mirror ────────────────────────────────────────────────
# LangGraph requires TypedDict (or Pydantic) as its state type.
# GraphState mirrors AgentState fields so both representations coexist.

from typing import TypedDict, Optional  # noqa: E402


class GraphState(TypedDict, total=False):
    repo_path: str
    files: List[str]
    read_files: Dict[str, str]
    insights: List[str]
    failed_reads: List[str]
    project_type: Optional[str]
    step: int
    max_steps: int
    last_decision: Dict[str, Any]
    summary: str
    total_prompt_tokens: int
    total_completion_tokens: int
    total_cost_eur: float
