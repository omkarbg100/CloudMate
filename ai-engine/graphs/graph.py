"""
DeployMate orchestrator — a single LangGraph StateGraph with conditional routing.

Routes each `action` to the matching node / embedded workflow subgraph:

- chat            -> chat → chat_summary
- analyze         -> analysis subgraph (repository → discovery → architecture → security → policy)
- architecture    -> architecture → architecture_summary
- security        -> security → security_summary
- code            -> code → code_summary
- validate        -> validation → validation_summary
- deployment_plan -> deployment subgraph (validation → plan → policy → infrastructure)
- monitoring/repair -> repair subgraph (monitoring → diagnosis → repair)
- pipeline        -> full end-to-end pipeline with human-approval interrupt

The orchestrator is compiled with an in-memory checkpointer so subgraph
interrupts (human approval) can pause and resume under a thread id.
"""

from __future__ import annotations

from typing import Any

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph

from graphs.nodes import (
    architecture_node,
    architecture_summary_node,
    chat_node,
    chat_summary_node,
    code_node,
    code_summary_node,
    security_node,
    security_summary_node,
    validation_node,
    validation_summary_node,
)
from graphs.workflows import (
    build_analysis_graph,
    build_deployment_graph,
    build_pipeline_graph,
    build_repair_graph,
)
from utils.state import DeploymateState

VALID_ACTIONS = {
    "chat",
    "analyze",
    "architecture",
    "security",
    "code",
    "validate",
    "deployment_plan",
    "monitoring",
    "repair",
    "pipeline",
}


def _route_action(state: dict[str, Any]) -> str:
    action = state.get("action", "chat")
    if action not in VALID_ACTIONS:
        return "chat"
    return action


def build_orchestrator_graph(**compile_kwargs):
    builder = StateGraph(DeploymateState)

    # ── single-purpose chains ──
    builder.add_node("chat", chat_node)
    builder.add_node("chat_summary", chat_summary_node)

    builder.add_node("architecture", architecture_node)
    builder.add_node("architecture_summary", architecture_summary_node)

    builder.add_node("security", security_node)
    builder.add_node("security_summary", security_summary_node)

    builder.add_node("code", code_node)
    builder.add_node("code_summary", code_summary_node)

    builder.add_node("validation", validation_node)
    builder.add_node("validation_summary", validation_summary_node)

    # ── embedded workflow subgraphs ──
    builder.add_node("analyze", build_analysis_graph())
    builder.add_node("deployment_plan", build_deployment_graph())
    builder.add_node("monitoring", build_repair_graph())
    builder.add_node("pipeline", build_pipeline_graph())

    # ── conditional entry routing ──
    builder.add_conditional_edges(
        START,
        _route_action,
        {
            "chat": "chat",
            "analyze": "analyze",
            "architecture": "architecture",
            "security": "security",
            "code": "code",
            "validate": "validation",
            "deployment_plan": "deployment_plan",
            "monitoring": "monitoring",
            "repair": "monitoring",
            "pipeline": "pipeline",
        },
    )

    # ── internal chain edges ──
    builder.add_edge("chat", "chat_summary")
    builder.add_edge("chat_summary", END)

    builder.add_edge("architecture", "architecture_summary")
    builder.add_edge("architecture_summary", END)

    builder.add_edge("security", "security_summary")
    builder.add_edge("security_summary", END)

    builder.add_edge("code", "code_summary")
    builder.add_edge("code_summary", END)

    builder.add_edge("validation", "validation_summary")
    builder.add_edge("validation_summary", END)

    builder.add_edge("analyze", END)
    builder.add_edge("deployment_plan", END)
    builder.add_edge("monitoring", END)
    builder.add_edge("pipeline", END)

    return builder.compile(**compile_kwargs)


CHECKPOINTER = InMemorySaver()
ORCHESTRATOR_GRAPH = build_orchestrator_graph(checkpointer=CHECKPOINTER)