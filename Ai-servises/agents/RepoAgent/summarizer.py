# agent/summarizer.py
# Generates a README-style summary from collected agent state.
# Provides both sync and async interfaces.

from __future__ import annotations

from utils.llm import call_llm, call_llm_async

_SUMMARY_SYSTEM = (
    "You are a senior software engineer writing README documentation. "
    "Use ONLY the provided data. Never invent details. "
    "If a section cannot be determined, say so explicitly."
)

_SUMMARY_SECTIONS = """\
Generate a clean, beautifully structured markdown summary with exactly these sections:

### What this project does
Describe the purpose and main functionality in a clear, concise paragraph.

### Architecture
High-level overview: frontend/backend separation, key components, ports.
List each component as a bullet: - **Name**: role and port.

### Tech stack
Categorised list:
- **Languages**: ...
- **Frontend**: ...
- **Backend**: ...
- **AI / ML**: ...
- **DevOps**: Docker, Docker Compose, etc.

### How to run (best guess)
Setup and run commands in fenced code blocks. List required env vars.

### Key files to read first
3-5 most important files as:
- `path/to/file`: Why it matters.
"""


def _build_prompt(state) -> str:
    def _get(key, default=None):
        if isinstance(state, dict):
            return state.get(key, default)
        return getattr(state, key, default)

    read_files: dict = _get("read_files", {})
    all_files: list = _get("files", [])
    insights: list = _get("insights", [])
    repo_path: str = _get("repo_path", "")
    project_type: str = _get("project_type") or "Unknown"

    files_summary = "\n".join(
        f"- {path}: {len(content.splitlines())} lines"
        for path, content in read_files.items()
    )
    file_contents = "\n".join(
        f"### {path}\n{content[:3000]}{'...' if len(content) > 3000 else ''}"
        for path, content in read_files.items()
    )
    top_dirs = sorted({f.split("/")[0] for f in all_files if "/" in f})
    dir_structure = (
        f"Top-level directories: {', '.join(top_dirs)}"
        if top_dirs
        else "No subdirectories found."
    )

    return f"""\
Repository path: {repo_path}
Project type: {project_type}

Key observations from analysis:
{chr(10).join(insights) or "(none)"}

Files analysed (with line counts):
{files_summary or "(none)"}

{dir_structure}

Excerpts from file contents (first 3 000 chars each):
{file_contents or "(no files read)"}

{_SUMMARY_SECTIONS}
"""


def generate_summary(state) -> str:
    """Synchronous summary generation (backward-compatible)."""
    return call_llm(_build_prompt(state), system_prompt=_SUMMARY_SYSTEM)


async def generate_summary_async(state) -> str:
    """Async summary generation used by the LangGraph summarize node."""
    return await call_llm_async(
        _build_prompt(state), system_prompt=_SUMMARY_SYSTEM
    )
