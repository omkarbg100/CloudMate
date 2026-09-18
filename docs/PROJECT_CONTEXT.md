# DeployMate Studio Project Context

Last updated: 2026-09-18

## Project Objective

Build DeployMate Studio: an agentic cloud deployment workspace where a developer
connects a GitHub repository, inspects and edits files, asks AI agents to analyze
deployment readiness, generates AWS architecture, reviews security findings and
diffs, validates changes, approves deployment, observes progress, and diagnoses
runtime failures.

DeployMate is not a generic chatbot. It is a controlled tool-using deployment
workspace with human approval boundaries.

## Current Architecture

Monorepo:

- `frontend/`: React + JavaScript (JS/JSX, no TypeScript), Vite, Tailwind CSS,
  Monaco Editor, Zustand, TanStack Query.
- `backend/`: Node.js + Express in **plain JavaScript**, MongoDB + Mongoose,
  JWT auth, WebSocket (`ws`), Zod validation.
- `ai-engine/`: Python FastAPI agent engine built on **LangChain + LangGraph**
  (managed with `uv`).
- `infrastructure/`: AWS CDK and deployment notes placeholder.
- `docker-compose.yml`: frontend + backend + ai-engine + mongodb.
- `docs/`: persistent architecture and handoff docs.
- `work done/`: session notes for future AI/model continuity.

Runtime path: React frontend -> Node backend -> Python AI engine -> Node backend
-> React frontend.

**Hard rule:** the backend never performs AI reasoning. It calls the Python engine
over HTTP (`POST /process`) and relays structured results.

## Technology Choices

- Frontend: React, JavaScript (JSX), Vite, Tailwind CSS, Monaco Editor, Zustand,
  TanStack Query.
- Backend: Node.js, Express (ES modules), MongoDB + Mongoose, JWT (`jsonwebtoken`),
  `ws` WebSocket, Zod, `cookie-parser`, `cors`.
- Auth: manual GitHub OAuth via `fetch` (no Passport / no session store). JWT is
  stored in an httpOnly cookie (`dm_token`); OAuth `state` in `dm_oauth_state`.
- AI engine: Python 3.11+, FastAPI, Pydantic, **LangChain + LangGraph** (`uv`).
- AWS target: DynamoDB, S3, ECR, App Runner / ECS (Fargate) / Lambda, Secrets
  Manager, CloudWatch, EventBridge, IAM Role + STS.
- Infrastructure: Docker Compose now; CDK later.

## Foundation Decision

The AI services layer uses **LangChain + LangGraph** as the primary agentic
framework (adopted 2026-09-18). LangChain handles LLM interaction, prompts,
structured outputs, and model integrations; LangGraph handles orchestration,
state, workflows, retries, human approval (interrupt/resume), and checkpoints.
Strands Agents / AgentCore SDK / Amazon Bedrock are intentionally **not** used.

See `docs/architecture.md`, `docs/agents.md`, `docs/workflows.md`,
`docs/decisions.md`, and `ai-engine/README.md` for details.

## AI Engine Layout

`ai-engine/` uses Python namespace packages (no `__init__.py`) and must be run
from its own folder. Only `main.py` lives at the root:

```text
ai-engine/
├── main.py          # FastAPI app (/process, /workflow/{id}/approve, /health)
├── agents/          # 10 specialized agents
├── graphs/          # graph.py (routing + checkpointer), nodes.py, workflows.py (subgraphs)
├── tools/           # executors: aws.py, github.py, docker.py, filesystem.py, llm.py
├── utils/           # shared support: settings.py, state.py, schemas.py, prompts.py, policies.py
└── pyproject.toml   # dependencies + tooling (uv)
```

Separation of concerns: `agents/` think/decide, `graphs/` orchestrate, `tools/`
execute, `utils/` provide shared support.

## Backend Layout (JavaScript)

```text
backend/
├── server.js        # HTTP + WebSocket entry; CORS, cookies, /api router
├── routes/          # index.js + per-domain routers (auth, projects, deployments, ...)
├── controllers/     # request handlers — call services/AI engine, never reason
├── services/        # authService, projectService, githubService, aiEngineClient
├── models/          # User, Project, Analysis, Architecture, SecurityScan,
│                    # Deployment, AgentExecution, AwsConnection
├── middleware/      # auth (JWT), validate (Zod), errorHandler
├── websocket/       # projectSocket.js — /ws/projects/:projectId event stream
├── utils/           # db.js, ids.js, events.js
├── Dockerfile
└── package.json
```

Project isolation is enforced through `services/projectService.js`
(`getOwnedProject` / `requireOwnedProject`), used by every project-scoped route.

## Frontend Layout (JavaScript)

```text
frontend/src/
├── App.jsx               # auth gate, query hub, view switcher
├── main.jsx
├── components/           # ActivityBar, Sidebar, AgentPanel, StatusRail, LoginPage
├── views/                # Dashboard, Projects, Repository, Chat, CodeExplorer,
│                         # Architecture, Security, Validation, Deployment,
│                         # Logs, Monitoring, AwsConnection
├── services/api.js       # REST client (same-origin /api)
├── services/ws.js        # WebSocket client (auto-reconnect)
├── store/useDeployMateStore.js
├── data/sampleFiles.js
└── utils/format.js
```

The UI is VS Code-style: an activity bar (view switcher), a project/file sidebar,
and a main view area.

## API Design

Node backend (all project routes require auth unless noted):

- `GET  /api/health`
- `GET  /api/auth/github`, `GET /api/auth/callback`, `POST /api/auth/demo`
- `GET  /api/auth/me`, `POST /api/auth/logout`
- `GET  /api/github/repos`
- `GET/POST /api/projects`, `GET/DELETE /api/projects/:projectId`
- `POST /api/projects/:projectId/analyze`, `GET .../analysis`
- `POST/GET /api/projects/:projectId/architecture`
- `POST /api/projects/:projectId/security/scan`, `GET .../security`
- `POST /api/projects/:projectId/validate`
- `POST /api/projects/:projectId/code`
- `POST /api/deployments/plan`
- `GET  /api/deployments/:deploymentId`
- `GET  /api/deployments/:deploymentId/logs`
- `POST /api/deployments/:deploymentId/approve|reject|rollback`
- `GET  /api/monitoring/:projectId/health|metrics|logs|alerts`
- `POST /api/chat`
- `GET/POST /api/aws/connections`
- `WS   /ws/projects/:projectId`

Python AI engine (consumed only by the backend):

- `GET /health`
- `POST /process` — action router (`chat`, `analyze`, `architecture`, `security`,
  `code`, `validate`, `deployment_plan`, `monitoring`, `repair`, `pipeline`)
- `POST /workflow/{thread_id}/approve` — resume a paused pipeline (`{"approved": bool}`)

### WebSocket events

`ANALYSIS_STARTED|COMPLETED|FAILED`, `ARCHITECTURE_STARTED|COMPLETED|FAILED`,
`SECURITY_SCAN|SECURITY_SCAN_COMPLETED|SECURITY_SCAN_FAILED`,
`CODE_GENERATION|CODE_GENERATION_COMPLETED`,
`VALIDATION_STARTED|VALIDATION_COMPLETED`,
`DEPLOYMENT_STARTED`, `BUILD_STARTED`, `BUILD_COMPLETED`, `DEPLOYMENT_PROGRESS`,
`HEALTH_CHECK`, `DEPLOYMENT_COMPLETED`, `DEPLOYMENT_FAILED`, `MONITORING_ALERT`,
`ROLLBACK_COMPLETED`, `CONNECTED`.

## Database Schema (MongoDB)

Collections: `users`, `projects`, `analyses`, `architectures`, `securityscans`,
`deployments`, `agentexecutions`, `awsconnections`. Raw secrets are never stored;
only references/identifiers. AWS connections store IAM Role ARN + External ID +
region (no permanent keys).

## Docker / Deployment

`docker-compose.yml` defines `frontend`, `backend`, `ai-engine`, `mongodb`.
`docker compose up --build` starts everything. The frontend nginx config serves
the built SPA and proxies `/api` and `/ws` to `backend`; the backend reaches
`ai-engine` and `mongodb` by service name. Component `.env` files are optional
(`required: false`) and examples ship as `.env.example`.

## Completed Phases

Phase 0:

- Reviewed relevant AWS/Strands/Bedrock/AgentCore open-source samples.
- Selected foundation strategy.
- Created `docs/FOUNDATION_ANALYSIS.md` and this project context file.

Phase 1 scaffold:

- Created monorepo folder structure.
- Added React frontend scaffold.
- Added Express backend scaffold.
- Added the Python AI engine scaffold.
- Added docs and work-log continuity files.

AI engine refactor (complete):

- Replaced the Strands/Bedrock direction with **LangChain + LangGraph**.
- Restructured `ai-engine/` to the final layout (`agents/`, `graphs/`, `tools/`,
  `utils/`, `main.py`) with namespace packages.
- Removed dead code (shell tool, memory module, unused pipeline module, empty root `src/`).
- Verified the engine: `uv sync`, import check, all actions HTTP 200, and the
  pipeline `NEEDS_APPROVAL` → approve `DEPLOYED` / reject `REJECTED` flow.

Backend + frontend JavaScript conversion (complete):

- Backend restructured to `server.js`, `routes/`, `controllers/`, `services/`,
  `models/`, `middleware/`, `websocket/`, `utils/` in plain JavaScript.
- Replaced Passport/session auth with manual GitHub OAuth + JWT httpOnly cookie
  and a `DEV_DEMO_MODE` demo login.
- Split the old 565-line inline router into per-domain routes/controllers.
- Frontend converted from TypeScript to JavaScript/JSX, added the 12-view
  VS Code-style workspace and a WebSocket client.
- Added Dockerfiles (frontend nginx proxy) and `docker-compose.yml`.

## Current Phase

Phase 1: Basic application loop (React -> Node -> Python -> response -> React),
with the AI engine on LangChain + LangGraph, the backend on MongoDB, and the whole
stack runnable via Docker Compose.

## Environment Setup

Docker (recommended):

```bash
cp backend/.env.example backend/.env
cp ai-engine/.env.example ai-engine/.env
docker compose up --build      # frontend http://localhost:5173
```

Local development:

```bash
# AI engine
cd ai-engine && uv sync && uv run uvicorn main:app --reload --port 8000

# Backend
cd backend && npm install && npm run dev     # :4000

# Frontend
cd frontend && npm install && npm run dev    # :5173 (proxies /api + /ws)
```

`USE_LLM=false` (default) runs all agents with deterministic rule-based logic —
no API key required.

## Current Status

What works (verified):

- AI engine dependencies install via `uv sync` (Python 3.11); imports and routes
  every action; the full pipeline pauses for human approval and resumes to
  `DEPLOYED` (and `REJECTED` on refusal).
- Backend modules import cleanly; `GET /api/health` returns 200; unauthenticated
  project routes return 401.
- Frontend dependencies install and `npm run build` succeeds (Vite production build).

What is not yet proven:

- `docker compose up --build` (Docker is not installed on the current machine).
- Full end-to-end runtime call through the backend to the live AI engine with a
  real MongoDB instance.
- Real LLM calls (`USE_LLM=true` requires a valid provider key).
- Real AWS execution (deployment actions are scaffolded/simulated).

## Known Bugs / Limitations

- Docker is not installed in the current environment, so Compose was only
  YAML-validated, not run.
- Deployment progression is simulated in `deployment.controller.js`; real AWS
  execution is not implemented.
- Monitoring metrics/logs are simulated until CloudWatch is wired up.
- The pipeline checkpointer is in-memory (`InMemorySaver`); pending approvals are
  lost when the engine restarts. Production needs a durable checkpointer.
- `asyncHandler` exists in middleware but controllers currently use explicit
  `try/catch(next)`.

## Important Decisions

- Use LangChain + LangGraph as the agentic foundation (not AgentCore/Strands).
- Backend/frontend are **plain JavaScript** — no TypeScript anywhere.
- Keep Node as the API/job/WebSocket layer; keep AI reasoning in Python.
- Manual GitHub OAuth + JWT httpOnly cookie (no Passport, no session store).
- Per-user project isolation via a single `requireOwnedProject` choke point.
- Same-origin `/api` and `ws(s)://<host>/ws` (Vite proxy in dev, nginx in Docker)
  to avoid hardcoded `localhost` URLs.
- Require approval for code modifications and deployments.
- Keep all agent outputs structured and schema validated.

## Next Steps

1. Run `docker compose up --build` on a machine with Docker to validate the stack.
2. Add persistent (durable) LangGraph checkpointer for approvals.
3. Replace simulated deployment/monitoring with real AWS execution (IAM Role + STS).
4. Add automated tests for backend routes and AI engine schemas/flows.
5. Implement full GitHub repository import/scan path in the UI.

## Important Files

- `docker-compose.yml`, `README.md`, `backend/.env.example`, `frontend/.env.example`,
  `ai-engine/.env.example`
- `backend/server.js`, `backend/routes/index.js`, `backend/services/aiEngineClient.js`,
  `backend/services/authService.js`, `backend/websocket/projectSocket.js`
- `frontend/src/App.jsx`, `frontend/src/services/api.js`, `frontend/src/services/ws.js`,
  `frontend/src/store/useDeployMateStore.js`
- `ai-engine/main.py`, `ai-engine/README.md`, `ai-engine/RUN_AND_TEST.md`
- `docs/PROJECT_CONTEXT.md`, `docs/architecture.md`, `docs/agents.md`,
  `docs/workflows.md`, `docs/decisions.md`
- `work done/NEXT_MODEL_HANDOFF.md`

## Test Status

- AI engine (verified 2026-09-18): `uv sync` OK; import OK; ruff import/unused
  checks pass; `/health` OK; all actions HTTP 200; pipeline approval flow works.
- Backend (verified 2026-09-18): route tree imports without error; `/api/health`
  200; `/api/projects` 401 without auth.
- Frontend (verified 2026-09-18): `npm install` and `npm run build` succeed.
- Not run: `docker compose up --build` (Docker absent); no `pytest` suite exists yet.

## Deployment Status

No AWS resources have been created.

AWS resources still required later: DynamoDB tables, S3 artifacts bucket, ECR
repository, App Runner / ECS / Lambda services (selected dynamically), Secrets
Manager entries, CloudWatch logs/metrics, EventBridge rules, and an IAM Role + STS
trust for cross-account access.
