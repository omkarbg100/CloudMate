# agent/conditions.py
# Edge-routing conditions for the RepoAgent LangGraph.
# Each function receives the current GraphState and returns the name
# of the next node to transition to.

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from agents.RepoAgent.state import GraphState


def should_continue(state: "GraphState") -> str:
    """Decide whether to run an action tool or produce the final summary.

    Returns
    -------
    "act"       — a file read or code-search action is pending.
    "summarize" — enough information has been collected (or max steps reached).
    """
    step: int = state.get("step", 0)
    max_steps: int = state.get("max_steps", 15)
    decision: dict = state.get("last_decision", {})
    action: str = decision.get("action", "noop")

    if step >= max_steps:
        return "summarize"

    if action in ("read_file", "search_code"):
        return "act"

    # "finish", "noop", or any unknown action → wrap up
    return "summarize"

