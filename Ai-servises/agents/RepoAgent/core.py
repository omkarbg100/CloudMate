# agent/core.py
# Public entry point for the RepoAgent.
#
# RepoAgent wraps the LangGraph pipeline and exposes:
#   - run()        → str   (synchronous, for backward compat)
#   - async_run()  → str   (async, preferred in FastAPI context)

from __future__ import annotations

import asyncio
import logging

from agents.RepoAgent.graph import get_repo_graph

logger = logging.getLogger(__name__)


class RepoAgent:
    """Orchestrates repository analysis via a LangGraph StateGraph.

    Parameters
    ----------
    repo_path:  Absolute path to the repository on disk.
    max_steps:  Maximum think/act cycles before forcing summarisation.
    """

    def __init__(self, repo_path: str, max_steps: int | None = None) -> None:
        import os

        self.repo_path = repo_path
        self.max_steps = max_steps or int(os.getenv("REPO_AGENT_MAX_STEPS", "15"))

    # ── Async interface (preferred) ────────────────────────────────────────────

    async def async_run(self) -> str:
        """Run the full analysis pipeline and return a markdown summary."""
        graph = get_repo_graph()

        initial_state = {
            "repo_path": self.repo_path,
            "max_steps": self.max_steps,
        }

        logger.info("RepoAgent starting repo=%s max_steps=%d", self.repo_path, self.max_steps)

        final_state: dict = await graph.ainvoke(initial_state)

        # Cost report
        logger.info(
            "RepoAgent done tokens_in=%d tokens_out=%d",
            final_state.get("total_prompt_tokens", 0),
            final_state.get("total_completion_tokens", 0),
        )

        return final_state.get("summary", "# No summary generated")

    # ── Sync interface (backward compat) ──────────────────────────────────────

    def run(self) -> str:
        """Synchronous wrapper — runs the async pipeline in a new event loop."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # Called from within an async context (e.g. FastAPI with run_in_executor)
                import concurrent.futures

                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                    future = pool.submit(asyncio.run, self.async_run())
                    return future.result()
            else:
                return loop.run_until_complete(self.async_run())
        except RuntimeError:
            return asyncio.run(self.async_run())
