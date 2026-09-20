## DeployMate AI Services

This service contains only the repository analysis agent and the architecture agent. It does not connect to an AWS account and does not require AWS credentials. The architecture agent creates recommendations from repository data and user requirements.

```powershell
uv venv
uv sync
$env:LLM_PROVIDER="gemini"
$env:GEMINI_API_KEY="your-key"
uv run uvicorn api:app --host 0.0.0.0 --port 8000
```

Use `LLM_PROVIDER=groq` with `GROQ_API_KEY` and `GROQ_MODEL` to use Groq. The API exposes `GET /health` and `POST /process`.
