# Development

## Rules For Future Sessions

1. Read `docs/PROJECT_CONTEXT.md` first.
2. Read the relevant file under `docs/` for the task.
3. Keep changes incremental.
4. Update `docs/PROJECT_CONTEXT.md` after meaningful work.
5. Update `work done/WORK_LOG.md` and `work done/NEXT_MODEL_HANDOFF.md` before ending a major session.
6. Do not apply significant generated changes without approval boundaries in the app design.
7. Do not expose secrets.

## Local Commands

Install dependencies:

```powershell
npm.cmd install
```

Run backend:

```powershell
npm.cmd --workspace backend run dev
```

Run frontend:

```powershell
npm.cmd --workspace frontend run dev
```

Run type checks:

```powershell
npm.cmd run typecheck
```

Run AI engine with `uv` and a project-local `.venv`:

```powershell
cd ai-engine
uv venv
uv sync
uv run uvicorn main:app --reload --port 8000
```
