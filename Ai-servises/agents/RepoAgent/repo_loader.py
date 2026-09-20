# agent/repo_loader.py
# Utility functions to load and clone repositories

import tempfile
import shutil
import os
import zipfile
import httpx
from urllib.parse import urlparse


def is_git_url(value: str) -> bool:
    return value.startswith("http://") or value.startswith("https://")


def clone_repo(url: str) -> str:
    temp_dir = tempfile.mkdtemp(prefix="repo-agent-")
    parsed = urlparse(url)
    parts = [part for part in parsed.path.strip("/").split("/") if part]
    if parsed.netloc.lower() == "github.com" and len(parts) >= 2:
        owner, repo = parts[0], parts[1].removesuffix(".git")
        response = httpx.get(f"https://api.github.com/repos/{owner}/{repo}/zipball", timeout=60, follow_redirects=True)
        response.raise_for_status()
        archive = os.path.join(temp_dir, "repo.zip")
        with open(archive, "wb") as handle:
            handle.write(response.content)
        with zipfile.ZipFile(archive) as bundle:
            bundle.extractall(temp_dir)
        os.remove(archive)
        extracted = [entry for entry in os.listdir(temp_dir) if os.path.isdir(os.path.join(temp_dir, entry))]
        if extracted:
            return os.path.join(temp_dir, extracted[0])
    try:
        raise RuntimeError("Repository URL is not a supported GitHub archive URL")
    except Exception as e:
        shutil.rmtree(temp_dir)
        raise RuntimeError(f"Failed to clone repository: {url}") from e

    return temp_dir
