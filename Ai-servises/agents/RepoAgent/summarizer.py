# agent/summarizer.py
# Summary generator for analyzed repositories
# Uses LLM to create a concise summary based on insights and read files.

from utils.llm import call_llm

def generate_summary(state) -> str:
    files_summary = "\n".join(
        f"- {path}: {len(content.splitlines())} lines"
        for path, content in state.read_files.items()
    )
    
    # Include truncated excerpts from file contents to provide actual data for summarization
    file_contents = "\n".join(
        f"### {path}\n{content[:3000]}{'...' if len(content) > 3000 else ''}"
        for path, content in state.read_files.items()
    )
    
    # Include top-level directory structure to help infer architecture
    top_dirs = sorted(set(f.split('/')[0] for f in state.files if '/' in f))
    dir_structure = f"Top-level directories: {', '.join(top_dirs)}" if top_dirs else "No subdirectories found."

    prompt = f"""
You are an AI assistant tasked with summarizing a GitHub repository based on the analysis performed by another agent. Use ONLY the provided data below to generate an accurate, concise README-style summary. Do not invent details, use placeholders, or assume information not present in the data. If a section cannot be determined from the data, state that clearly (e.g., "Not specified in analyzed files").

Repository path: {state.repo_path}
Project type: {state.project_type}

Key observations from analysis:
{chr(10).join(state.insights)}

Files analyzed (with line counts):
{files_summary}

{dir_structure}

Excerpts from file contents (first 3000 characters each):
{file_contents}

Generate a summary with exactly these sections:
- What this project does: Describe the purpose and main functionality based on docs/code. If unclear, say "Purpose not clearly defined in analyzed files."
- Architecture: High-level overview of the system design (e.g., frontend/backend separation, key components, languages/frameworks in different parts). Use the directory structure and file contents to infer this. For example, if there are 'frontend' and 'backend' directories, describe the separation. If not evident, say "Architecture not fully clear from analyzed files."
- Tech stack: List languages, frameworks, libraries, and tools inferred from files/extensions. Be specific (e.g., "Python with FastAPI" not just "Python").
- How to run (best guess): Provide setup/installation and run commands based on configs/scripts. If no clear instructions, say "Run instructions not found; likely requires [language] runtime."
- Key files to read first: Recommend 3-5 most important files (e.g., README, main entry point, config files) with brief reasons.
"""

    return call_llm(prompt, state)
