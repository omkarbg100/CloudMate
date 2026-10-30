"""
LiteLLM-based LLM gateway.

Primary  : Ollama  (local)  — qwen2.5-coder:7b
Fallback : Gemini API (cloud) — gemini-2.0-flash

Features
--------
* LiteLLM Router with latency-based routing + automatic fallback
* Tenacity retry: 3 attempts, exponential back-off (2 s → 10 s)
* Prometheus counters: llm_calls_total{provider, status}
* Prometheus histogram: llm_latency_seconds{provider}
* Token-budget guard (raises BudgetExceeded)
* Both async (call_llm_async) and sync (call_llm) interfaces
"""

from __future__ import annotations

import asyncio
import logging
import os
import time

import litellm
from litellm import Router
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

try:
    from prometheus_client import Counter, Histogram

    LLM_CALLS = Counter(
        "llm_calls_total",
        "Total LLM calls",
        ["provider", "status"],
    )
    LLM_LATENCY = Histogram(
        "llm_latency_seconds",
        "LLM call latency in seconds",
        ["provider"],
    )
    _PROMETHEUS_AVAILABLE = True
except ImportError:
    _PROMETHEUS_AVAILABLE = False

logger = logging.getLogger(__name__)

# ── Silence litellm's verbose output ──────────────────────────────────────────
litellm.set_verbose = False

# ── Config from environment ───────────────────────────────────────────────────
OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen2.5-coder:7b")
GEMINI_API_KEY: str | None = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
LLM_TEMPERATURE: float = float(os.getenv("LLM_TEMPERATURE", "0.2"))
LLM_TIMEOUT: float = float(os.getenv("LLM_TIMEOUT_SECONDS", "120"))
MAX_TOTAL_TOKENS: int = int(os.getenv("MAX_TOTAL_TOKENS", "50000"))

# ── LiteLLM Router ────────────────────────────────────────────────────────────
_model_list: list[dict] = [
    {
        "model_name": "primary",
        "litellm_params": {
            "model": f"ollama/{OLLAMA_MODEL}",
            "api_base": OLLAMA_BASE_URL,
            "timeout": LLM_TIMEOUT,
            "temperature": LLM_TEMPERATURE,
        },
    },
]

if GEMINI_API_KEY:
    _model_list.append(
        {
            "model_name": "fallback",
            "litellm_params": {
                "model": f"gemini/{GEMINI_MODEL}",
                "api_key": GEMINI_API_KEY,
                "timeout": 60,
                "temperature": LLM_TEMPERATURE,
            },
        }
    )

router = Router(
    model_list=_model_list,
    fallbacks=[{"primary": ["fallback"]}] if GEMINI_API_KEY else [],
    routing_strategy="latency-based-routing",
    set_verbose=False,
    num_retries=2,
)


# ── Custom exceptions ─────────────────────────────────────────────────────────
class BudgetExceeded(Exception):
    """Raised when the per-request token budget is exhausted."""


# ── Metrics helpers ───────────────────────────────────────────────────────────
def _inc(provider: str, status: str) -> None:
    if _PROMETHEUS_AVAILABLE:
        LLM_CALLS.labels(provider=provider, status=status).inc()


def _observe(provider: str, duration: float) -> None:
    if _PROMETHEUS_AVAILABLE:
        LLM_LATENCY.labels(provider=provider).observe(duration)


# ── Core async call (with retry) ──────────────────────────────────────────────
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
async def call_llm_async(
    prompt: str,
    system_prompt: str = "You are a careful software analysis agent.",
    state=None,
    model: str = "primary",
) -> str:
    """Async LLM call via the LiteLLM Router.

    Parameters
    ----------
    prompt:        User message.
    system_prompt: System/instruction message.
    state:         Optional AgentState for token-budget tracking.
    model:         Router model name ("primary" or "fallback").
    """
    if state is not None and getattr(state, "total_prompt_tokens", 0) > MAX_TOTAL_TOKENS:
        raise BudgetExceeded("Token budget exceeded")

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt},
    ]

    t0 = time.perf_counter()
    resolved_provider = model

    try:
        response = await router.acompletion(model=model, messages=messages)
        resolved_provider = getattr(response, "model", model) or model
        duration = time.perf_counter() - t0

        _inc(resolved_provider, "ok")
        _observe(resolved_provider, duration)

        content: str = response.choices[0].message.content or ""

        # Track token usage on state if provided
        if state is not None:
            usage = getattr(response, "usage", None)
            if usage:
                state.total_prompt_tokens += getattr(usage, "prompt_tokens", 0)
                state.total_completion_tokens += getattr(usage, "completion_tokens", 0)

        logger.debug(
            "llm_call provider=%s tokens_in=%s tokens_out=%s latency_ms=%.0f",
            resolved_provider,
            getattr(getattr(response, "usage", None), "prompt_tokens", "?"),
            getattr(getattr(response, "usage", None), "completion_tokens", "?"),
            duration * 1000,
        )
        return content.strip()

    except BudgetExceeded:
        raise
    except Exception as exc:
        _inc(resolved_provider, "error")
        logger.warning("llm_call failed provider=%s error=%s", resolved_provider, exc)
        raise


# ── Sync wrapper (backward-compatible) ───────────────────────────────────────
def call_llm(
    prompt: str,
    state=None,
    system_prompt: str = "You are a careful software analysis agent.",
) -> str:
    """Synchronous wrapper around call_llm_async.

    Kept for backward compatibility with existing synchronous callers.
    """
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Inside an existing event loop (e.g. FastAPI) — schedule as task
            import concurrent.futures

            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                future = pool.submit(
                    asyncio.run,
                    call_llm_async(prompt, system_prompt=system_prompt, state=state),
                )
                return future.result()
        else:
            return loop.run_until_complete(
                call_llm_async(prompt, system_prompt=system_prompt, state=state)
            )
    except RuntimeError:
        return asyncio.run(
            call_llm_async(prompt, system_prompt=system_prompt, state=state)
        )
