# agent/tools.py
# File-system tools used by the RepoAgent.
# All async tool functions follow the signature:
#   async def tool_fn(state: GraphState, decision: dict) -> dict
# and return a *partial* state dict (delta) that LangGraph merges.

from __future__ import annotations

import os
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from agents.RepoAgent.state import GraphState


# ── Low-level helpers ─────────────────────────────────────────────────────────

def list_files(path: str, max_depth: int = 5) -> list[str]:
    """Return relative paths of all files under *path* up to *max_depth*."""
    collected: list[str] = []
    for root, dirs, files in os.walk(path):
        depth = root.replace(path, "").count(os.sep)
        if depth >= max_depth:
            dirs.clear()
            continue
        for f in files:
            relative = os.path.join(root, f).replace(path, "").replace("\\", "/").lstrip("/")
            collected.append(relative)
    return collected


def read_file_safe(path: str, max_lines: int = 300, max_chars: int = 8000) -> str | None:
    """Read a file with guards on size and encoding errors.

    Returns *None* if the file is unreadable, binary, or trivially small.
    """
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as fh:
            lines = fh.readlines()
        content = "".join(lines[:max_lines])
        content = content[:max_chars]
        if len(content.strip()) < 10:
            raise ValueError("File too small / useless")
        return content
    except Exception:
        return None


# ── Async tool functions ──────────────────────────────────────────────────────

_IMPORTANT_EXTS = (
    ".py", ".js", ".ts", ".md", ".rst", ".toml", ".txt",
    ".yml", ".yaml", ".json", ".ini", ".env",
)

_PRIORITY_DOCS = ("README", ".md", ".rst")
_PRIORITY_CONFIGS = (
    "pyproject.toml", "package.json", "requirements.txt",
    "setup.py", "Cargo.toml", "go.mod",
)
_PRIORITY_CODE = (".py", ".js", ".ts", ".rs", ".go", ".java", ".cs")


def _priority_key(f: str) -> int:
    if "architecture" in f.lower() or "arch" in f.lower():
        return -1
    if any(k in f for k in _PRIORITY_DOCS):
        return 0
    if any(k in f for k in _PRIORITY_CONFIGS):
        return 1
    if any(f.endswith(ext) for ext in _PRIORITY_CODE):
        return 2
    return 3


async def _tool_read_file(state: "GraphState", decision: dict) -> dict:
    """Read a single file and return a state delta."""
    read_files: dict = dict(state.get("read_files", {}))
    insights: list = list(state.get("insights", []))
    failed_reads: list = list(state.get("failed_reads", []))
    all_files: list = state.get("files", [])
    repo_path: str = state.get("repo_path", "")

    # Resolve path from index or explicit path
    if "index" in decision:
        unread = [
            f for f in all_files
            if f not in read_files
            and f not in failed_reads
            and any(f.endswith(ext) for ext in _IMPORTANT_EXTS)
        ]
        candidates = sorted(unread, key=_priority_key)[:10]
        idx = decision["index"]
        if not (0 <= idx < len(candidates)):
            insights.append(f"read_file: invalid index {idx}")
            return {"insights": insights}
        relative_path = candidates[idx]
    else:
        relative_path = decision.get("path", "")

    if not relative_path or relative_path not in all_files:
        insights.append(f"read_file: path not in repo: {relative_path!r}")
        return {"insights": insights}

    if relative_path in read_files or relative_path in failed_reads:
        return {}  # already handled

    full_path = os.path.join(repo_path, relative_path)
    content = read_file_safe(full_path)

    if content:
        read_files[relative_path] = content
        insights.append(f"Read file: {relative_path} ({len(content.splitlines())} lines)")
        return {"read_files": read_files, "insights": insights}
    else:
        failed_reads.append(relative_path)
        insights.append(f"Skipped file (unreadable): {relative_path}")
        return {"failed_reads": failed_reads, "insights": insights}


async def _tool_search_code(state: "GraphState", decision: dict) -> dict:
    """Grep for a pattern across repo source files. Returns matches as insights."""
    pattern: str = decision.get("pattern", "").strip().lower()
    insights: list = list(state.get("insights", []))
    read_files: dict = state.get("read_files", {})
    all_files: list = state.get("files", [])
    repo_path: str = state.get("repo_path", "")

    if not pattern:
        insights.append("search_code: no pattern provided")
        return {"insights": insights}

    matches: list[str] = []
    for rel_path in all_files:
        if not any(rel_path.endswith(ext) for ext in _IMPORTANT_EXTS):
            continue
        if rel_path in read_files:
            source = read_files[rel_path]
        else:
            full_path = os.path.join(repo_path, rel_path)
            source = read_file_safe(full_path) or ""

        for i, line in enumerate(source.splitlines(), 1):
            if pattern in line.lower():
                matches.append(f"{rel_path}:{i}: {line.strip()[:120]}")
                if len(matches) >= 15:
                    break
        if len(matches) >= 15:
            break

    if matches:
        insights.append(
            f"search_code '{pattern}' — {len(matches)} match(es):\n"
            + "\n".join(f"  {m}" for m in matches)
        )
    else:
        insights.append(f"search_code '{pattern}' — no matches found")

    return {"insights": insights}


async def _tool_finish(_state: "GraphState", _decision: dict) -> dict:
    """No-op tool — signals that the agent loop should end."""
    return {}


# ── Tool registry ─────────────────────────────────────────────────────────────
# Maps action names (returned by decide_action) to async tool functions.

TOOL_REGISTRY: dict[str, object] = {
    "read_file": _tool_read_file,
    "search_code": _tool_search_code,
    "finish": _tool_finish,
}
