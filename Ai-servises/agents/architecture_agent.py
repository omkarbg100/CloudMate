# agents/architecture_agent.py
# AWS Architecture design agent with Pydantic-validated structured output.
#
# Uses LiteLLM to call the primary (Ollama) model, with automatic Gemini
# fallback if Ollama is unavailable.  The response is validated against
# ArchitecturePlan — preventing silent JSON parse failures.

from __future__ import annotations

import json
import logging
import os
from typing import Literal

import litellm
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# ── Pydantic models ───────────────────────────────────────────────────────────


class AWSService(BaseModel):
    name: str = Field(description="AWS service name, e.g. 'EC2', 'S3', 'RDS'")
    purpose: str = Field(description="What this service does in the architecture")
    decision: Literal["create", "reuse", "modify"] = Field(
        description="Whether to create a new resource, reuse existing, or modify"
    )
    estimated_cost_usd: float | None = Field(
        default=None, description="Estimated monthly cost in USD (optional)"
    )


class ServiceConnection(BaseModel):
    from_service: str = Field(description="Source service name")
    to_service: str = Field(description="Destination service name")
    protocol: str = Field(description="Protocol or method, e.g. 'HTTPS', 'TCP', 'SQS'")


class ArchitecturePlan(BaseModel):
    region: str = Field(description="AWS region code, e.g. 'ap-south-1'")
    services: list[AWSService] = Field(description="List of AWS services in the architecture")
    connections: list[ServiceConnection] = Field(
        default_factory=list, description="Data flow connections between services"
    )
    rationale: str = Field(description="Why this architecture was chosen")
    warnings: list[str] = Field(
        default_factory=list, description="Potential issues or caveats"
    )
    security_notes: list[str] = Field(
        default_factory=list, description="Security recommendations"
    )
    estimated_monthly_cost_usd: float | None = Field(
        default=None, description="Total estimated monthly cost in USD"
    )


# ── Constants ─────────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = (
    "You are DeployMate's AWS Solutions Architect. "
    "Design practical, cost-effective AWS architectures. "
    "Always respond with valid JSON matching the exact schema provided. "
    "No markdown fences, no explanations outside the JSON object."
)

_OLLAMA_MODEL = f"ollama/{os.getenv('OLLAMA_MODEL', 'qwen2.5-coder:7b')}"
_OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
_GEMINI_MODEL = f"gemini/{os.getenv('GEMINI_MODEL', 'gemini-2.0-flash')}"
_GEMINI_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
_TIMEOUT = float(os.getenv("LLM_TIMEOUT_SECONDS", "120"))
_TEMP = float(os.getenv("LLM_TEMPERATURE", "0.2"))


# ── Helpers ───────────────────────────────────────────────────────────────────


def _extract_json(text: str) -> str:
    """Strip markdown code fences if the model wrapped its JSON."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        # Drop opening fence (may be ```json or just ```)
        text = "\n".join(lines[1:])
        # Drop closing fence
        if text.rstrip().endswith("```"):
            text = text.rstrip()[:-3]
    return text.strip()


def _build_prompt(analysis: object, requirements: str, region: str) -> str:
    schema = json.dumps(ArchitecturePlan.model_json_schema(), indent=2)
    analysis_json = json.dumps(analysis, ensure_ascii=False, indent=2)
    return f"""\
Design an AWS architecture for the following repository analysis.

Target region : {region}
Requirements  : {requirements or "None specified"}

Repository analysis:
{analysis_json}

Return ONLY a JSON object that strictly matches this JSON Schema:
{schema}

Rules:
- Include 3-8 AWS services appropriate for the stack.
- For each service provide a realistic decision (create/reuse/modify).
- Connections must reference service names used in the services array.
- Add at least 2 security_notes.
- If cost is unknown set estimated_cost_usd / estimated_monthly_cost_usd to null.
"""


async def _call_with_fallback(messages: list[dict]) -> str:
    """Try Ollama; fall back to Gemini on any error."""
    # Primary: Ollama
    try:
        response = await litellm.acompletion(
            model=_OLLAMA_MODEL,
            api_base=_OLLAMA_BASE_URL,
            messages=messages,
            timeout=_TIMEOUT,
            temperature=_TEMP,
        )
        return response.choices[0].message.content or ""
    except Exception as primary_err:
        logger.warning("ArchAgent: Ollama failed (%s) — trying Gemini fallback", primary_err)

    # Fallback: Gemini
    if not _GEMINI_KEY:
        raise RuntimeError(
            "Ollama unavailable and GEMINI_API_KEY not configured. "
            "Cannot generate architecture plan."
        )
    response = await litellm.acompletion(
        model=_GEMINI_MODEL,
        api_key=_GEMINI_KEY,
        messages=messages,
        timeout=60,
        temperature=_TEMP,
    )
    return response.choices[0].message.content or ""


def _parse_and_validate(raw: str) -> ArchitecturePlan:
    """Parse JSON and validate against ArchitecturePlan schema."""
    clean = _extract_json(raw)
    data = json.loads(clean)
    return ArchitecturePlan.model_validate(data)


# ── Public API ────────────────────────────────────────────────────────────────


async def run_async(
    analysis: object,
    requirements: str = "",
    region: str = "ap-south-1",
) -> dict:
    """Async architecture plan generation with structured output + retry.

    Returns
    -------
    dict  — ArchitecturePlan serialised as a plain dict (JSON-safe).
    """
    prompt = _build_prompt(analysis, requirements, region)
    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]

    raw = await _call_with_fallback(messages)

    try:
        plan = _parse_and_validate(raw)
        logger.info("ArchAgent: plan validated services=%d", len(plan.services))
        return plan.model_dump()
    except Exception as parse_err:
        logger.warning("ArchAgent: first parse failed (%s) — retrying with correction", parse_err)

    # Correction retry — ask the model to fix its own output
    correction_messages = messages + [
        {"role": "assistant", "content": raw},
        {
            "role": "user",
            "content": (
                f"Your response could not be parsed: {parse_err}. "
                "Return ONLY valid JSON matching the schema. No markdown, no prose."
            ),
        },
    ]
    raw2 = await _call_with_fallback(correction_messages)
    plan = _parse_and_validate(raw2)
    logger.info("ArchAgent: plan validated after correction services=%d", len(plan.services))
    return plan.model_dump()


def run(
    analysis: object,
    requirements: str = "",
    region: str = "ap-south-1",
) -> dict:
    """Synchronous wrapper (backward-compatible)."""
    import asyncio

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures

            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                future = pool.submit(asyncio.run, run_async(analysis, requirements, region))
                return future.result()
        return loop.run_until_complete(run_async(analysis, requirements, region))
    except RuntimeError:
        return asyncio.run(run_async(analysis, requirements, region))
