"""GitHub API tools for the Repository, Code, and Validation agents."""

from __future__ import annotations

import os
from typing import Any


def _get_client(token: str | None = None):
    from github import Github

    return Github(token or os.getenv("GITHUB_TOKEN", ""))


def list_files(
    repo_owner: str, repo_name: str, path: str = "", branch: str = "main", token: str | None = None
) -> list[dict[str, Any]]:
    """List files and directories at the given path."""
    g = _get_client(token)
    repo = g.get_repo(f"{repo_owner}/{repo_name}")
    contents = repo.get_contents(path, ref=branch)
    if not isinstance(contents, list):
        contents = [contents]
    return [
        {"name": c.name, "path": c.path, "type": c.type, "size": c.size, "sha": c.sha}
        for c in contents
    ]


def read_file(
    repo_owner: str, repo_name: str, file_path: str, branch: str = "main", token: str | None = None
) -> str:
    """Read the text content of a file."""
    g = _get_client(token)
    repo = g.get_repo(f"{repo_owner}/{repo_name}")
    content = repo.get_contents(file_path, ref=branch)
    return content.decoded_content.decode("utf-8", errors="ignore")


def write_file(
    repo_owner: str,
    repo_name: str,
    file_path: str,
    content: str,
    commit_message: str,
    branch: str,
    token: str | None = None,
) -> dict[str, Any]:
    """Create or update a file in the repository."""
    g = _get_client(token)
    repo = g.get_repo(f"{repo_owner}/{repo_name}")
    try:
        existing = repo.get_contents(file_path, ref=branch)
        result = repo.update_file(file_path, commit_message, content, existing.sha, branch=branch)
        action = "updated"
    except Exception:
        result = repo.create_file(file_path, commit_message, content, branch=branch)
        action = "created"
    return {"action": action, "path": file_path, "commit": result["commit"].sha}


def create_branch(
    repo_owner: str,
    repo_name: str,
    branch_name: str,
    from_branch: str = "main",
    token: str | None = None,
) -> dict[str, Any]:
    """Create a new branch from an existing branch."""
    g = _get_client(token)
    repo = g.get_repo(f"{repo_owner}/{repo_name}")
    source = repo.get_branch(from_branch)
    repo.create_git_ref(ref=f"refs/heads/{branch_name}", sha=source.commit.sha)
    return {"branch": branch_name, "sha": source.commit.sha}


def create_pull_request(
    repo_owner: str,
    repo_name: str,
    title: str,
    body: str,
    head: str,
    base: str = "main",
    token: str | None = None,
) -> dict[str, Any]:
    """Create a pull request."""
    g = _get_client(token)
    repo = g.get_repo(f"{repo_owner}/{repo_name}")
    pr = repo.create_pull(title=title, body=body, head=head, base=base)
    return {"number": pr.number, "url": pr.html_url, "title": pr.title}