# agent/state.py
# Data class to hold the state of the RepoAgent during analysis
# Tracks files, read contents, insights, and cost metrics.

from dataclasses import dataclass, field
from typing import List, Dict

@dataclass
class AgentState:
    repo_path: str
    files: List[str] = field(default_factory=list)
    read_files: Dict[str, str] = field(default_factory=dict)
    insights: List[str] = field(default_factory=list)

    project_type: str | None = None

    # Cost tracking
    total_prompt_tokens: int = 0
    total_completion_tokens: int = 0
    total_cost_eur: float = 0.0

    # Fallback tracking
    failed_reads: List[str] = field(default_factory=list)
