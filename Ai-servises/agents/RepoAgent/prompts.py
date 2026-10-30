# agent/prompts.py
# Prompts used by the RepoAgent for decision-making and summarization.

from __future__ import annotations


def think_prompt(state) -> str:
    """Build the THINK prompt for the current agent state.

    Works with both AgentState (dataclass) and GraphState (TypedDict).
    """
    # Support both dataclass and TypedDict access patterns
    def _get(key: str, default=None):
        if isinstance(state, dict):
            return state.get(key, default)
        return getattr(state, key, default)

    important_extensions = (
        ".py", ".js", ".ts", ".md", ".rst", ".toml", ".txt",
        ".yml", ".yaml", ".json", ".ini",
    )
    all_files: list = _get("files", [])
    read_files: dict = _get("read_files", {})
    failed_reads: list = _get("failed_reads", [])
    repo_path: str = _get("repo_path", "")
    project_type: str = _get("project_type") or "Unknown"
    step: int = _get("step", 0)
    max_steps: int = _get("max_steps", 15)

    unread = [
        f for f in all_files
        if f not in read_files
        and f not in failed_reads
        and any(f.endswith(ext) for ext in important_extensions)
    ]

    def priority_key(f: str) -> int:
        if "architecture" in f.lower() or "arch" in f.lower():
            return -1
        if "README" in f or f.endswith(".md") or f.endswith(".rst"):
            return 0
        if any(k in f for k in [
            "pyproject.toml", "package.json", "requirements.txt",
            "setup.py", "Cargo.toml", "go.mod",
        ]):
            return 1
        if any(f.endswith(ext) for ext in [
            ".py", ".js", ".ts", ".rs", ".go", ".java", ".cs"
        ]):
            return 2
        return 3

    candidates = sorted(unread, key=priority_key)[:10]
    unread_list = "\n".join(f"{i + 1}. {f}" for i, f in enumerate(candidates))
    already_read = list(read_files.keys())

    return f"""\
You are an AI agent analyzing a code repository to produce a comprehensive summary.
Goal: understand project purpose, tech stack, architecture, and how to run it.

Repository: {repo_path}
Detected type: {project_type}
Step: {step + 1} / {max_steps}

Files already read ({len(already_read)}):
{already_read if already_read else "  (none yet)"}

Unread priority files (pick by number):
{unread_list if unread_list else "  (all important files read)"}

Decision strategy
─────────────────
1. Read README.md / README.rst first — gives project overview.
2. Read the primary config (pyproject.toml, package.json, Cargo.toml, go.mod).
3. Read the main entry point (main.py, index.js, cmd/main.go, etc.).
4. Read 2-3 core source files that reveal architecture.
5. Use SEARCH_CODE if you need to find a specific pattern (e.g., "router", "model", "database").
6. FINISH once you have enough for all summary sections.

Respond with EXACTLY one of:
  READ_FILE: <number>         (read the Nth file above)
  SEARCH_CODE: <pattern>      (grep across all files for a keyword)
  FINISH
"""
