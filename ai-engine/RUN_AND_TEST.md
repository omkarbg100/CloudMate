# DeployMate AI Engine — What to Run & How to Test

This file is the single source for running and testing the AI engine.
Everything below runs **from the `ai-engine/` folder** unless stated otherwise.

```powershell
cd ai-engine
```

---

## 1. Install & run

```powershell
# Python 3.11+ and uv are required
uv sync

# copy env once, then fill in GEMINI_API_KEY (or GROQ_API_KEY + LLM_PROVIDER=groq)
copy .env.example .env

# start the engine
uv run uvicorn main:app --reload --port 8000
```

Health check: <http://localhost:8000/health>

> `USE_LLM=false` (default) runs all agents with deterministic rule-based
> logic — no API key needed. Set `USE_LLM=true` to use the real LLM.

---

## 2. Test the single-action endpoints

Run these with any HTTP client (PowerShell example shown). All responses are
JSON.

```powershell
# 1. chat (keyword-routed)
Invoke-RestMethod -Method Post -Uri http://localhost:8000/process -ContentType 'application/json' -Body '{"action":"chat","message":"deploy my app","projectId":"proj_1"}'

# 2. analyze the repository (offline fallback analysis; add a real token to fetch GitHub)
Invoke-RestMethod -Method Post -Uri http://localhost:8000/process -ContentType 'application/json' -Body '{"action":"analyze","projectId":"proj_1","repoOwner":"octocat","repoName":"hello-world"}'

# 3. architecture (needs analysis in state -> send analysis along)
Invoke-RestMethod -Method Post -Uri http://localhost:8000/process -ContentType 'application/json' -Body '{"action":"architecture","projectId":"proj_1"}'

# 4. security scan
Invoke-RestMethod -Method Post -Uri http://localhost:8000/process -ContentType 'application/json' -Body '{"action":"security","projectId":"proj_1","repoOwner":"octocat","repoName":"hello-world"}'

# 5. code / fix generation
Invoke-RestMethod -Method Post -Uri http://localhost:8000/process -ContentType 'application/json' -Body '{"action":"code","projectId":"proj_1","findings":[{"type":"dockerfile_missing"}],"message":"add a dockerfile"}'

# 6. validation
Invoke-RestMethod -Method Post -Uri http://localhost:8000/process -ContentType 'application/json' -Body '{"action":"validate","projectId":"proj_1"}'

# 7. deployment plan (validation -> plan -> policy -> infrastructure)
Invoke-RestMethod -Method Post -Uri http://localhost:8000/process -ContentType 'application/json' -Body '{"action":"deployment_plan","projectId":"proj_1"}'

# 8. monitoring / diagnosis / repair
Invoke-RestMethod -Method Post -Uri http://localhost:8000/process -ContentType 'application/json' -Body '{"action":"monitoring","projectId":"proj_1"}'
```

**Expected:** every action returns a JSON `result` plus `history` (the audit
trail of LangGraph nodes that ran). With `USE_LLM=false`, results are
deterministic.

---

## 3. Test the full pipeline + human approval (most important)

1) Start the pipeline — it pauses at the human-approval gate:

```powershell
$r = Invoke-RestMethod -Method Post -Uri http://localhost:8000/process -ContentType 'application/json' -Body '{"action":"pipeline","projectId":"proj_1","repoOwner":"octocat","repoName":"hello-world"}'
$r | ConvertTo-Json -Depth 5
```

Expect the response to contain:

```json
{
  "status": "NEEDS_APPROVAL",
  "threadId": "thread_...",
  "interrupts": [ ... ],
  "history": [ ... ]
}
```

2) Approve with the `threadId` returned above:

```powershell
$t = $r.threadId
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/workflow/$t/approve" -ContentType 'application/json' -Body '{"approved":true,"note":"looks good"}'
```

Expected: the graph resumes → deployment executes via scoped tool actions →
monitoring → diagnosis → repair → final `result` with `status: "DEPLOYED"`
and a demo URL.

3) Rejection path (optional): rerun the pipeline and approve with
`{"approved":false}`. Expected final `result.status` = `"REJECTED"` and no
deployment steps execute.

> The checkpointer is in-memory (`InMemorySaver`), so workflows pause/resume
> only within the same running engine process. Restarting the engine loses
> pending threads — fine for development; production should use a durable
> checkpointer.

---

## 4. Verify the policies / guardrails

| Guardrail | Where | How to observe |
|---|---|---|
| No shell access | `tools/` (no shell tool exists) | the LLM/tools only have github, aws, docker, filesystem scopes |
| Isolation (user → project → account) | `utils/state.py`, `utils/policies.py` | malformed allowed-actions return denial reason |
| Policy validation before risky ops | `graphs/nodes.py` → `_guard()` | infra/deploy nodes refuse when not allowed |
| Human approval | `graphs/nodes.py` → `approval_node` | pipeline pauses (`NEEDS_APPROVAL`) until resume |
| Retries + failure recovery | `graphs/workflows.py` | risky nodes carry `RetryPolicy(max_attempts=MAX_RETRIES)` |

---

## 5. Optional: run the whole app (frontend + backend + engine)

From the repository root:

```powershell
npm.cmd install
npm.cmd --workspace backend run dev   # backend on :4000
npm.cmd --workspace frontend run dev  # frontend on :5173
# (ai-engine already running on :8000)
```

The Node backend calls the engine at `http://localhost:8000/process` and falls
back to mocks only if the engine is offline.

---

## Troubleshooting

- `ModuleNotFoundError` → you need `uv sync` first (do not use `pip`).
- No response from `/process` → engine not running; start uvicorn on port 8000.
- LLM actions return rule-based results even when `USE_LLM=true` → check the
  key/env (`GEMINI_API_KEY`/`GROQ_API_KEY`, `LLM_PROVIDER`) and the engine
  console for `[llm]` warnings.