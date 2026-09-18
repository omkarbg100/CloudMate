"""
Orchestrator Agent — drives the LangGraph orchestration graph.

Converts a `ProcessRequest` into graph state, runs the compiled LangGraph
StateGraph (bound to a thread id so workflows can pause/resume), enforces the
approval gate, and returns the graph's `result` payload. `resume()` continues
an interrupted workflow (human approval) with the user's decision.
"""

from __future__ import annotations

import uuid

from langgraph.types import Command

from graphs.graph import ORCHESTRATOR_GRAPH, VALID_ACTIONS
from utils.schemas import ProcessRequest
from utils.state import state_from_request


def _new_thread_id() -> str:
    return f"thread_{uuid.uuid4().hex[:12]}"


def _interrupt_payloads(state: dict) -> list[dict]:
    """Collect pending LangGraph interrupts from the returned invoke state."""
    interrupts = state.get("__interrupt__")
    if interrupts:
        return [
            {
                "name": getattr(i, "name", None) or list(i.keys())[0] if isinstance(i, dict) else getattr(i, "name", None),
                "value": i.get("value") if isinstance(i, dict) else getattr(i, "value", None) or i,
            }
            for i in interrupts
        ]

    nested = (state.get("configurable") or {}).get("__interrupt__") or (state.get("configurable") or {}).get("__interrupts__")
    if nested:
        return [{"name": "human_approval", "value": nested}]
    return []


class OrchestratorAgent:
    """Runs the DeployMate LangGraph workflows and returns structured results."""

    def __init__(self) -> None:
        self.graph = ORCHESTRATOR_GRAPH

    @staticmethod
    def _config(thread_id: str) -> dict:
        return {"configurable": {"thread_id": thread_id}}

    def dispatch(
        self,
        request: ProcessRequest,
        userId: str | None = None,
        thread_id: str | None = None,
    ) -> dict[str, object]:
        """Start (or resume) a workflow for the given request."""
        if request.action not in VALID_ACTIONS:
            action = request.action or ""
            return {
                "message": f"Unknown action: {action}",
                "nextActions": sorted(VALID_ACTIONS),
                "approvalRequired": False,
                "engine": "deploymate-langgraph-v1",
            }

        tid = thread_id or _new_thread_id()
        config = self._config(tid)
        result_state = self.graph.invoke(state_from_request(request, userId=userId), config=config)
        return self._finalize(result_state, config) | {"threadId": tid}

    def resume(self, thread_id: str, decision: dict, userId: str | None = None) -> dict[str, object]:
        """Resume an interrupted pipeline with a human decision."""
        config = self._config(thread_id)
        result_state = self.graph.invoke(Command(resume=decision), config=config)
        return self._finalize(result_state, config) | {"threadId": thread_id}

    def _finalize(self, result_state: dict, config: dict) -> dict:
        """Extract the workflow result, detecting pending human-approval interrupts."""
        payload = dict(result_state.get("result") or {})
        payload["history"] = result_state.get("history", [])

        interrupts = _interrupt_payloads(result_state)

        # Authoritative check: does the graph have pending nodes to run?
        try:
            snapshot = self.graph.get_state(config)
            still_pending = bool(snapshot and snapshot.next)
        except Exception:
            still_pending = bool(interrupts)

        if still_pending or interrupts:
            if not interrupts:
                try:
                    for task in snapshot.tasks:
                        for inter in getattr(task, "interrupts", None) or []:
                            interrupts.append(
                                {"name": getattr(inter, "name", None) or "human_approval", "value": getattr(inter, "value", inter)}
                            )
                except Exception:
                    interrupts = [{"name": "human_approval", "value": result_state}]

            payload["status"] = "NEEDS_APPROVAL"
            payload["interrupts"] = interrupts if interrupts else [{"name": "human_approval", "value": result_state}]

        if not payload:
            payload.update({
                "message": "The workflow completed but produced no result.",
                "approvalRequired": False,
            })
        return payload