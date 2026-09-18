"""Filesystem tool — isolated, project-scoped workspace for agent file operations."""

from __future__ import annotations

import difflib
import tempfile
from pathlib import Path

WORKSPACE_ROOT = Path(tempfile.gettempdir()) / "deploymate_workspace"


def _workspace_path(project_id: str, file_path: str) -> Path:
    safe = Path(file_path).name  # prevent path traversal outside workspace
    return WORKSPACE_ROOT / project_id / safe


def read(project_id: str, file_path: str) -> str:
    """Read a file from the project's isolated workspace."""
    path = _workspace_path(project_id, file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found in workspace: {file_path}")
    return path.read_text(encoding="utf-8")


def write(project_id: str, file_path: str, content: str) -> dict[str, str]:
    """Write a file to the project's isolated workspace."""
    path = _workspace_path(project_id, file_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return {"path": str(path), "status": "written"}


def diff(original: str, proposed: str, filename: str = "file") -> str:
    """Generate a unified diff between original and proposed content."""
    original_lines = original.splitlines(keepends=True)
    proposed_lines = proposed.splitlines(keepends=True)
    result = difflib.unified_diff(
        original_lines,
        proposed_lines,
        fromfile=f"a/{filename}",
        tofile=f"b/{filename}",
        lineterm="",
    )
    return "".join(result)


def list_workspace(project_id: str) -> list[str]:
    """List files in the project's workspace (isolation boundary)."""
    base = WORKSPACE_ROOT / project_id
    if not base.exists():
        return []
    return [str(p.relative_to(base)) for p in base.rglob("*") if p.is_file()]