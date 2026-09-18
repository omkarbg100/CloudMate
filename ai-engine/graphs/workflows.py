"""
LangGraph workflow subgraphs.

Each builder returns a compiled `StateGraph` that the orchestrator graph
(`graphs.graph.py`) embeds under a single node name:

- `build_analysis_graph`    repository → aws_discovery → architecture → security → policy → finalize
- `build_deployment_graph`  validation → deployment_plan → policy → infrastructure → finalize
- `build_repair_graph`      monitoring → diagnosis → repair → finalize
- `build_pipeline_graph`    full end-to-end pipeline with the human-approval gate

Risky pipeline nodes carry a `RetryPolicy` so transient tool failures are
retried with backoff. The human-approval gate uses LangGraph `interrupt`, so
the pipeline pauses and can be resumed with `Command(resume=...)` under the
same thread id.
"""

from __future__ import annotations

from langgraph.graph import END, START, StateGraph
from langgraph.types import RetryPolicy

from graphs.nodes import (
    approval_node,
    architecture_node,
    aws_discovery_node,
    code_node,
    deployment_node,
    deployment_plan_node,
    diagnosis_node,
    finalize_analysis,
    finalize_deployment,
    infrastructure_node,
    monitoring_node,
    pipeline_summary_node,
    policy_node,
    rejected_node,
    repair_node,
    repair_summary_node,
    repository_node,
    route_after_approval,
    security_node,
    validation_node,
)
from utils.settings import get_settings
from utils.state import DeploymateState

# ─── Analysis ──────────────────────────────────────────────────────────────────

def build_analysis_graph(**compile_kwargs):
    builder = StateGraph(DeploymateState)
    builder.add_node("repository", repository_node)
    builder.add_node("aws_discovery", aws_discovery_node)
    builder.add_node("architecture", architecture_node)
    builder.add_node("security", security_node)
    builder.add_node("policy", policy_node)
    builder.add_node("finalize", finalize_analysis)

    builder.add_edge(START, "repository")
    builder.add_edge("repository", "aws_discovery")
    builder.add_edge("aws_discovery", "architecture")
    builder.add_edge("architecture", "security")
    builder.add_edge("security", "policy")
    builder.add_edge("policy", "finalize")
    builder.add_edge("finalize", END)

    return builder.compile(**compile_kwargs)


def run_analysis_workflow(state: dict) -> dict:
    """Run the full analysis workflow and return the final result."""
    return build_analysis_graph().invoke(state)


# ─── Deployment plan ───────────────────────────────────────────────────────────

def build_deployment_graph(**compile_kwargs):
    builder = StateGraph(DeploymateState)
    builder.add_node("validation", validation_node)
    builder.add_node("deployment_plan", deployment_plan_node)
    builder.add_node("policy", policy_node)
    builder.add_node("infrastructure", infrastructure_node)
    builder.add_node("finalize", finalize_deployment)

    builder.add_edge(START, "validation")
    builder.add_edge("validation", "deployment_plan")
    builder.add_edge("deployment_plan", "policy")
    builder.add_edge("policy", "infrastructure")
    builder.add_edge("infrastructure", "finalize")
    builder.add_edge("finalize", END)

    return builder.compile(**compile_kwargs)


def prepare_deployment(state: dict) -> dict:
    """Run the full deployment-plan workflow and return the final result."""
    return build_deployment_graph().invoke(state)


# ─── Monitoring / repair ───────────────────────────────────────────────────────

def build_repair_graph(**compile_kwargs):
    builder = StateGraph(DeploymateState)
    builder.add_node("monitoring", monitoring_node)
    builder.add_node("diagnosis", diagnosis_node)
    builder.add_node("repair", repair_node)
    builder.add_node("finalize", repair_summary_node)

    builder.add_edge(START, "monitoring")
    builder.add_edge("monitoring", "diagnosis")
    builder.add_edge("diagnosis", "repair")
    builder.add_edge("repair", "finalize")
    builder.add_edge("finalize", END)

    return builder.compile(**compile_kwargs)


def prepare_repair(state: dict) -> dict:
    """Run the monitoring/repair workflow and return the final result."""
    return build_repair_graph().invoke(state)


# ─── Full end-to-end pipeline ──────────────────────────────────────────────────

def _retry() -> RetryPolicy:
    settings = get_settings()
    return RetryPolicy(
        max_attempts=settings.max_retries,
        initial_interval=1.0,
        backoff_factor=2.0,
        jitter=True,
    )


def build_pipeline_graph(**compile_kwargs):
    builder = StateGraph(DeploymateState)

    # analysis / planning phase
    builder.add_node("repository", repository_node, retry=_retry())
    builder.add_node("aws_discovery", aws_discovery_node, retry=_retry())
    builder.add_node("architecture", architecture_node, retry=_retry())
    builder.add_node("security", security_node, retry=_retry())
    builder.add_node("code", code_node, retry=_retry())
    builder.add_node("infrastructure", infrastructure_node, retry=_retry())
    builder.add_node("validation", validation_node)

    # plan + policy + human approval
    builder.add_node("deployment_plan", deployment_plan_node, retry=_retry())
    builder.add_node("policy", policy_node)
    builder.add_node("approval", approval_node)
    builder.add_node("rejected", rejected_node)

    # execution + monitoring + repair
    builder.add_node("deployment", deployment_node, retry=_retry())
    builder.add_node("monitoring", monitoring_node, retry=_retry())
    builder.add_node("diagnosis", diagnosis_node)
    builder.add_node("repair", repair_node)
    builder.add_node("summary", pipeline_summary_node)

    # forward path
    builder.add_edge(START, "repository")
    builder.add_edge("repository", "aws_discovery")
    builder.add_edge("aws_discovery", "architecture")
    builder.add_edge("architecture", "security")
    builder.add_edge("security", "code")
    builder.add_edge("code", "infrastructure")
    builder.add_edge("infrastructure", "validation")
    builder.add_edge("validation", "deployment_plan")
    builder.add_edge("deployment_plan", "policy")
    builder.add_edge("policy", "approval")

    # approval gate: resume decides the branch
    builder.add_conditional_edges(
        "approval",
        route_after_approval,
        {"deployment": "deployment", "rejected": "rejected"},
    )
    builder.add_edge("rejected", "summary")

    # execution, monitoring, failure recovery
    builder.add_edge("deployment", "monitoring")
    builder.add_edge("monitoring", "diagnosis")
    builder.add_edge("diagnosis", "repair")
    builder.add_edge("repair", "summary")
    builder.add_edge("summary", END)

    return builder.compile(**compile_kwargs)


def run_pipeline(state: dict, config: dict | None = None) -> dict:
    """Run the full pipeline. Interrupts at the approval gate if not resumed."""
    return build_pipeline_graph().invoke(state, config=config)