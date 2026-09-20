# agent/prompts.py
# Prompts used by the RepoAgent for decision making and summarization

def think_prompt(state) -> str:
    important_extensions = [".py", ".js", ".ts", ".md", ".rst", ".toml", ".txt", ".yml", ".yaml", ".json", ".ini"]
    unread_files = [
        f for f in state.files
        if f not in state.read_files
        and any(f.endswith(ext) for ext in important_extensions)
    ]

    # Sort unread files by priority: docs first, then configs, then code
    def priority_key(f):
        if "architecture" in f.lower() or "arch" in f.lower():
            return -1  # Highest priority
        if "README" in f or f.endswith(".md") or f.endswith(".rst"):
            return 0
        if any(k in f for k in ["pyproject.toml", "package.json", "requirements.txt", "setup.py", "Cargo.toml", "go.mod"]):
            return 1
        if any(f.endswith(ext) for ext in [".py", ".js", ".ts", ".rs", ".go", ".java", ".cs"]):
            return 2
        return 3
    
    unread_files_sorted = sorted(unread_files, key=priority_key)[:10]  # Limit to 10 for manageability

    # Format as numbered list
    unread_list = "\n".join(f"{i+1}. {f}" for i, f in enumerate(unread_files_sorted))

    return f"""
You are an AI agent analyzing a GitHub repository to derive information for a summary including: project purpose, tech stack, how to run, and key files.

Repository path: {state.repo_path}
Project type: {state.project_type or "Unknown"}

Files discovered: {len(state.files)}
Files already read: {list(state.read_files.keys())}

Unread important files (sorted by priority: docs > configs > code):
{unread_list}

Decision Strategy:
- Always read README.md or README.rst first if available, as it contains purpose and overview.
- Then read main config files based on project type: For Python projects, read setup.py, requirements.txt, pyproject.toml; for Node.js, package.json; for Rust, Cargo.toml; etc.
- Then read core entry points (e.g., __main__.py for Python, index.js for Node.js) to understand functionality and architecture.
- Focus on files that reveal architecture (e.g., directory structure, main modules).
- Skip lock files (e.g., package-lock.json, poetry.lock) unless needed.
- Read next if: Missing key info for summary sections like architecture.
- Finish if: Have read README, main config, entry point, and 2-3 core files, or repo is small.

Your task: Decide the next file to read for better summary derivation, or FINISH if sufficient. Choose from the numbered list above.

Respond with EXACTLY one of:
- READ_FILE: [number] (e.g., READ_FILE: 1)
- FINISH
"""
