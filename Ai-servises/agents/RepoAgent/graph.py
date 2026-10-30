# agent/graph.py
# LangGraph StateGraph for the RepoAgent.
#
# Flow:  scan ──► think ──► act ──► think  (loop)
#                      └──► summarize ──► END
#
# The routing from "think" is decided by conditions.should_continue().

from __future__ import annotations

from langgraph.graph import END, StateGraph

from agents.RepoAgent.conditions import should_continue
from agents.RepoAgent.nodes import act_node, scan_node, summarize_node, think_node
from agents.RepoAgent.state import GraphState


def build_repo_graph():
    """Build and compile the RepoAgent LangGraph.

    Returns a compiled graph that accepts a GraphState dict and
    returns the final GraphState with a populated 'summary' field.
    """
    graph: StateGraph = StateGraph(GraphState)

    # Register nodes
    graph.add_node("scan", scan_node)
    graph.add_node("think", think_node)
    graph.add_node("act", act_node)
    graph.add_node("summarize", summarize_node)

    # Static edges
    graph.set_entry_point("scan")
    graph.add_edge("scan", "think")
    graph.add_edge("act", "think")       # loop back after each action
    graph.add_edge("summarize", END)

    # Conditional edge: from "think" decide act vs summarize
    graph.add_conditional_edges(
        "think",
        should_continue,
        {
            "act": "act",
            "summarize": "summarize",
        },
    )

    return graph.compile()


# Module-level compiled graph (singleton) — avoids re-compilation on every call.
_COMPILED_GRAPH = None


def get_repo_graph():
    """Return the cached compiled graph, building it on first call."""
    global _COMPILED_GRAPH
    if _COMPILED_GRAPH is None:
        _COMPILED_GRAPH = build_repo_graph()
    return _COMPILED_GRAPH

