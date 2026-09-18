# DeployMate AI Engine

The AI engine is built entirely on **Python + LangChain + LangGraph**:

- **LangChain** powers all LLM interaction: prompt templates
  (`utils/prompts.py`), chat models and runnable chains (`tools/llm.py`), and
  structured JSON output.
- **LangGraph** powers agent orchestration, state management, workflows,
  retries (`RetryPolicy`), human approval (`interrupt`/`Command` resume),
  and multi-agent coordination.

## Quick start

See [RUN_AND_TEST.md](RUN_AND_TEST.md) for exact commands and how to test
every action including the human-approval pause/resume.

```powershell
cd ai-engine
uv sync
copy .env.example .env   # fill GEMINI_API_KEY or GROQ_API_KEY
uv run uvicorn main:app --reload --port 8000
```

## Layout

```text
ai-engine/
├── main.py          # FastAPI app (/process, /workflow/{id}/approve, /health)
├── agents/          # 10 specialized agents (orchestrator, repository, aws discovery,
│                    #   architecture, security, code, validation, infrastructure,
│                    #   deployment, monitoring)
├── graphs/          # LangGraph orchestration
│                    #   graph.py      – orchestrator routing graph + checkpointer
│                    #   nodes.py      – all graph nodes (policy, guard, approval, deploy…)
│                    #   workflows.py  – analysis / deployment / repair / pipeline subgraphs
├── tools/           # executors: aws.py, github.py, docker.py, filesystem.py, llm.py
├── utils/           # shared support: settings.py, state.py, schemas.py, prompts.py, policies.py
├── pyproject.toml   # dependencies + tooling (uv)
└── (docs)           # README.md, RUN_AND_TEST.md
```

The package uses Python namespace packages (no `__init__.py` files). Run the
engine from this folder so imports resolve.

## Guardrails

- The LLM never executes shell commands or AWS operations directly.
- Agents produce structured outputs; the `tools/` modules perform the real
  GitHub/AWS/Docker/filesystem work.
- `utils/policies.py` enforces ownership isolation (userId → projectId →
  accountId) and an allow-list deployment policy.
- Human approval is enforced in the graph (`approval_node` in
  `graphs/nodes.py`), pausing the workflow via LangGraph `interrupt` until
  resumed.

## Providers

Set `LLM_PROVIDER=gemini` (default) or `groq`. Calls are fully disabled with
`USE_LLM=false`, so the engine runs offline with deterministic rule-based
agents — perfect for tests.