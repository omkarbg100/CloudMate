"""
LLM helper — LangChain model factory + chains used across all agents.

Every call goes through LangChain: the chat model is created by `create_llm()`
(Gemini or Groq, selected via `LLM_PROVIDER`), prompts run through
`ChatPromptTemplate`, and structured JSON responses are parsed with
`JsonOutputParser`. Set `USE_LLM=false` to skip model calls and use rule-based
logic.
"""

from __future__ import annotations

from typing import Any

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.output_parsers import JsonOutputParser, StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq

from utils.settings import get_settings


def use_llm() -> bool:
    """Whether real LangChain model calls are enabled."""
    return get_settings().use_llm


def create_llm() -> BaseChatModel:
    """Create the configured LangChain chat model."""
    settings = get_settings()

    if settings.llm_provider == "groq":
        return ChatGroq(
            model=settings.groq_model,
            temperature=settings.llm_temperature,
            timeout=60,
        )

    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        temperature=settings.llm_temperature,
        timeout=60,
    )


def _escape_braces(text: str) -> str:
    """Escape literal JSON braces so LangChain does not treat them as template vars."""
    return text.replace("{", "{{").replace("}", "}}")


def build_chain(system_prompt: str, **kwargs: Any) -> Runnable:
    """Build a LangChain prompt -> model -> parser chain for JSON output."""
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                _escape_braces(system_prompt)
                + "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation.",
            ),
            ("human", "{input}"),
        ]
    )
    extra = {k: v for k, v in kwargs.items() if k != "input"}
    partial = prompt.partial(**extra) if extra else prompt
    model = create_llm()
    return partial | model | JsonOutputParser()


def build_text_chain(system_prompt: str) -> Runnable:
    """Build a LangChain prompt -> model -> text chain."""
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", _escape_braces(system_prompt)),
            ("human", "{input}"),
        ]
    )
    return prompt | create_llm() | StrOutputParser()


def call_llm(system_prompt: str, user_prompt: str) -> str:
    """Call the configured LangChain LLM and return raw text. Raises if disabled."""
    if not use_llm():
        raise RuntimeError("LLM calls disabled (USE_LLM=false)")

    return build_text_chain(system_prompt).with_config({"tags": ["deploymate"]}).invoke(
        {"input": user_prompt}
    )


def call_llm_json(system_prompt: str, user_prompt: str, fallback: Any = None) -> Any:
    """Call the LangChain LLM and parse the response as JSON. Returns fallback on any failure."""
    if not use_llm():
        return fallback
    try:
        return build_chain(system_prompt).with_config({"tags": ["deploymate"]}).invoke(
            {"input": user_prompt}
        )
    except Exception as exc:
        print(f"[llm] LangChain call failed or disabled: {exc}")
        return fallback