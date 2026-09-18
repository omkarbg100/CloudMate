"""
Centralized settings for the AI engine.

All runtime configuration is read once here so agents, tools, and graphs
share a consistent view of provider keys, feature flags, and timeouts.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Settings:
    llm_provider: str = field(default_factory=lambda: os.getenv("LLM_PROVIDER", "gemini"))
    gemini_model: str = field(default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-1.5-pro-latest"))
    groq_model: str = field(default_factory=lambda: os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"))
    llm_temperature: float = field(default_factory=lambda: float(os.getenv("LLM_TEMPERATURE", "0.3")))
    use_llm: bool = field(default_factory=lambda: os.getenv("USE_LLM", "false").lower() == "true")

    github_token: str = field(default_factory=lambda: os.getenv("GITHUB_TOKEN", ""))
    ai_engine_port: int = field(default_factory=lambda: int(os.getenv("AI_ENGINE_PORT", "8000")))
    node_backend_url: str = field(default_factory=lambda: os.getenv("NODE_BACKEND_URL", "http://localhost:4000"))

    graph_direction: str = field(default_factory=lambda: os.getenv("GRAPHDIR", "LR"))
    max_retries: int = field(default_factory=lambda: int(os.getenv("MAX_RETRIES", "3")))


_settings: Settings | None = None


def get_settings() -> Settings:
    return _settings or Settings()


def reload_settings() -> Settings:
    global _settings
    _settings = Settings()
    return _settings