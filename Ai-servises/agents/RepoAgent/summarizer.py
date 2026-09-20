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

Generate a clean, beautifully structured markdown summary with exactly these sections:
### What this project does
Describe the purpose and main functionality based on docs/code in a clear, concise paragraph. If unclear, say "Purpose not clearly defined in analyzed files."

### Architecture
High-level overview of the system design (e.g., frontend/backend separation, microservices, databases). List individual components as bullet points with their roles and ports (e.g., - **Client**: ..., - **Server**: ..., - **AI Service**: ...). If not evident, say "Architecture not fully clear from analyzed files."

### Tech stack
Categorized list of technologies:
- **Languages**: JavaScript, Python, etc.
- **Frontend**: React, Vite, etc.
- **Backend**: Node.js, Express, etc.
- **AI Service**: FastAPI, LangChain, etc.
- **Orchestration & DevOps**: Docker, Docker Compose, etc.

### How to run (best guess)
Provide setup/installation and execution commands in fenced code blocks (```bash). If environment variables or secrets are needed, list them clearly. If no clear instructions, say "Run instructions not found; likely requires [language] runtime."

### Key files to read first
Recommend 3-5 most important files formatted as:
- `path/to/file`: Brief explanation of its importance.
"""

    return call_llm(prompt, state)
