# agent/tools.py
# This module provides utility functions for file operations within the repository.
import os

def list_files(path: str, max_depth: int = 3) -> list[str]:
    collected = []
    for root, dirs, files in os.walk(path):
        depth = root.replace(path, "").count(os.sep)
        if depth > max_depth:
            continue
        for f in files:
            collected.append(os.path.join(root, f))
    return collected

def read_file(path: str, max_lines: int = 200) -> str:
    with open(path, "r", errors="ignore") as f:
        return "".join(f.readlines()[:max_lines])

def read_file_safe(path: str, max_chars: int = 4000) -> str:
    try:
        with open(path, "r", errors="ignore") as f:
            content = f.read(max_chars)
            if len(content.strip()) < 50:
                raise ValueError("File too small / useless")
            return content
    except Exception:
        return ""
