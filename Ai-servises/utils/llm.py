"""The only LLM integration used by both active agents."""

import logging
import os
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq

load_dotenv()

# Ensure GOOGLE_API_KEY is available in environment for langchain/google SDKs
gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
if gemini_key:
    os.environ["GOOGLE_API_KEY"] = gemini_key
    os.environ["GEMINI_API_KEY"] = gemini_key

MAX_TOTAL_TOKENS = int(os.getenv("MAX_TOTAL_TOKENS", "15000"))
logger = logging.getLogger(__name__)


class BudgetExceeded(Exception):
    pass


def _build_model(provider: str):
    temperature = float(os.getenv("LLM_TEMPERATURE", "0.2"))
    timeout = float(os.getenv("LLM_TIMEOUT_SECONDS", "60"))

    if provider == "groq":
        groq_key = os.getenv("GROQ_API_KEY")
        return (
            ChatGroq(
                model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
                temperature=temperature,
                timeout=timeout,
                api_key=groq_key or None,
            ),
            "groq",
        )

    if provider == "gemini":
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        model_name = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
        # Handle deprecated or unavailable legacy models gracefully
        if model_name in ["gemini-1.5-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"] or not model_name:
            model_name = "gemini-3.5-flash-lite"

        return (
            ChatGoogleGenerativeAI(
                model=model_name,
                temperature=temperature,
                timeout=timeout,
                google_api_key=api_key or None,
                max_retries=6,
            ),
            "gemini",
        )

    raise RuntimeError(f"Unknown LLM provider: {provider}. Must be 'gemini' or 'groq'.")


def create_llm():
    primary_provider = os.getenv("LLM_PROVIDER", "gemini").lower()
    return _build_model(primary_provider)


def call_llm(prompt: str, state=None, system_prompt: str = "You are a careful software analysis agent.") -> str:
    if state is not None and state.total_prompt_tokens > MAX_TOTAL_TOKENS:
        raise BudgetExceeded("Token budget exceeded")

    primary_provider = os.getenv("LLM_PROVIDER", "gemini").lower()
    fallback_provider = os.getenv("LLM_FALLBACK_PROVIDER", "").lower()

    providers_to_try = [primary_provider]
    if fallback_provider and fallback_provider != primary_provider:
        providers_to_try.append(fallback_provider)

    last_error = None
    for provider in providers_to_try:
        try:
            model, _ = _build_model(provider)
            response = model.invoke([SystemMessage(content=system_prompt), HumanMessage(content=prompt)])
            content = response.content if isinstance(response.content, str) else str(response.content)
            usage = getattr(response, "usage_metadata", {}) or {}
            if state is not None:
                state.total_prompt_tokens += usage.get("input_tokens", 0)
                state.total_completion_tokens += usage.get("output_tokens", 0)
            return content.strip()
        except Exception as e:
            last_error = e
            logger.warning("Failed call with provider %s: %s", provider, e)
            if provider != providers_to_try[-1]:
                logger.info("Retrying with fallback provider %s...", providers_to_try[-1])
                continue

    raise last_error
