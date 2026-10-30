# agent/nodes.py
# Async node functions for the RepoAgent LangGraph.
#
# Each node:
#   • Receives the full GraphState dict.
#   • Returns a *partial* dict (delta) — LangGraph merges it with the state.
#
# Node graph:  scan → think → [act → think]* → summarize

from __future__ import annotations

import logging

from agents.RepoAgent.conditions import should_continue  # noqa: F401 (used in graph)
from agents.RepoAgent.decide import decide_action
from agents.RepoAgent.detector import detect_project_type
from agents.RepoAgent.prompts import think_prompt
from agents.RepoAgent.summarizer import generate_summary_async
from agents.RepoAgent.tools import TOOL_REGISTRY, list_files
from utils.llm import BudgetExceeded, call_llm_async

logger = logging.getLogger(__name__)


# ── Node: scan ────────────────────────────────────────────────────────────────

async def scan_node(state: dict) -> dict:
    """Discover all files and detect the project type."""
    repo_path: str = state.get("repo_path", "")
    max_steps: int = state.get("max_steps", 15)

    files = list_files(repo_path)
    project_type = detect_project_type(files)

    logger.info("scan repo_path=%s files=%d type=%s", repo_path, len(files), project_type)

    return {
        "files": files,
        "project_type": project_type,
        "insights": [f"Detected project type: {project_type}"],
        "step": 0,
        "max_steps": max_steps,
        "read_files": {},
        "failed_reads": [],
        "last_decision": {},
    }


# ── Node: think ───────────────────────────────────────────────────────────────

async def think_node(state: dict) -> dict:
    """Ask the LLM what to do next and parse the decision."""
    prompt = think_prompt(state)

    try:
        thought = await call_llm_async(
            prompt,
            system_prompt=(
                "You are a repository analysis agent. "
                "Follow the instructions exactly. Respond with a single command."
            ),
        )
    except BudgetExceeded:
        logger.warning("think_node: token budget exceeded — forcing finish")
        return {"last_decision": {"action": "finish"}, "step": state.get("step", 0) + 1}
    except Exception as exc:
        logger.error("think_node: LLM error — %s", exc)
        return {"last_decision": {"action": "finish"}, "step": state.get("step", 0) + 1}

    decision = decide_action(thought)
    logger.info(
        "think step=%d thought=%r decision=%s",
        state.get("step", 0),
        thought[:80],
        decision,
    )

    return {
        "last_decision": decision,
        "step": state.get("step", 0) + 1,
    }


# ── Node: act ─────────────────────────────────────────────────────────────────

async def act_node(state: dict) -> dict:
    """Dispatch to the appropriate tool from TOOL_REGISTRY."""
    decision: dict = state.get("last_decision", {})
    action: str = decision.get("action", "noop")

    tool_fn = TOOL_REGISTRY.get(action)
    if tool_fn is None:
        logger.warning("act_node: unknown action %r — skipping", action)
        return {}

    try:
        delta = await tool_fn(state, decision)  # type: ignore[arg-type]
        return delta
    except Exception as exc:
        logger.error("act_node: tool %r raised %s", action, exc)
        return {}


# ── Node: summarize ───────────────────────────────────────────────────────────

async def summarize_node(state: dict) -> dict:
    """Generate the final README-style summary from all collected state."""
    try:
        summary = await generate_summary_async(state)
    except BudgetExceeded:
        summary = (
            "# Summary not generated\n\n"
            "Token budget was exceeded before the final summary could be created."
        )
    except Exception as exc:
        summary = f"# Summary generation failed\n\nError: {exc}"

    logger.info(
        "summarize done tokens_in=%d tokens_out=%d",
        state.get("total_prompt_tokens", 0),
        state.get("total_completion_tokens", 0),
    )
    return {"summary": summary}

