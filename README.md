# DeployMate Studio

DeployMate Studio is an agentic deployment workspace for developers. It takes a
GitHub repository to an approved, validated, deployed, and monitored application
while keeping every agent action visible and auditable.

The deployment path:

```text
GitHub -> Repository Analysis -> AWS Account Connection -> AWS Resource Discovery
-> Architecture Agent -> Deployment Plan -> Infrastructure Generation
-> Security/Policy Validation -> Human Approval -> AWS Deployment
-> CloudWatch Monitoring -> AI Diagnosis/Repair
```

AWS access uses IAM Role + STS temporary credentials only. DeployMate never
requests or stores permanent AWS access keys.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React (JavaScript), Vite, Tailwind CSS, Monaco Editor, Zustand, TanStack Query |
| Backend | Node.js, Express (JavaScript), MongoDB + Mongoose, JWT auth, WebSocket (`ws`), Zod |
| AI engine | Python 3.11+, FastAPI, LangChain + LangGraph (managed with `uv`) |
| Infrastructure | Docker & Docker Compose (AWS CDK under `infrastructure/` for later) |

The Node backend is the API/job/WebSocket layer. **All AI reasoning lives in the
Python engine**, which the backend calls over HTTP (`/process`).

## Repository Layout

```text
.
├── frontend/            # React (JS/JSX) + Vite + Tailwind studio UI
│   ├── src/
│   │   ├── components/  # ActivityBar, Sidebar, AgentPanel, StatusRail, LoginPage
│   │   ├── views/       # Dashboard, Projects, Repository, Chat, Code, Architecture,
│   │   │                # Security, Validation, Deployment, Logs, Monitoring, AWS
│   │   ├── services/    # api.js (REST), ws.js (WebSocket)
│   │   ├── store/       # Zustand store
│   │   └── data/        # sample workspace files
│   ├── nginx.conf       # serves the SPA + proxies /api and /ws to the backend
│   └── Dockerfile
├── backend/             # Node + Express (JavaScript)
│   ├── server.js        # HTTP + WebSocket entry point
│   ├── routes/          # per-domain routers
│   ├── controllers/     # request handlers (no AI reasoning)
│   ├── services/        # authService, githubService, projectService, aiEngineClient
│   ├── models/          # Mongoose models
│   ├── middleware/      # auth, validation, error handling
│   ├── websocket/       # project event socket
│   ├── utils/           # db, ids, events
│   └── Dockerfile
├── ai-engine/           # Python FastAPI agent engine
│   ├── main.py          # FastAPI app (/health, /process, /workflow/{id}/approve)
│   ├── agents/          # 10 specialized agents
│   ├── graphs/          # graph.py, nodes.py, workflows.py
│   ├── tools/           # aws, github, docker, filesystem, llm
│   ├── utils/           # settings, state, schemas, prompts, policies
│   ├── pyproject.toml   # dependencies (uv)
│   └── Dockerfile
├── infrastructure/      # AWS CDK notes/placeholder
├── docs/                # architecture, agents, workflows, security, decisions
├── work done/           # session continuity notes
└── docker-compose.yml   # frontend + backend + ai-engine + mongodb
```

## Quick Start (Docker)

Prerequisite: Docker Desktop (or Docker Engine + Compose).

```bash
cp backend/.env.example backend/.env
cp ai-engine/.env.example ai-engine/.env
docker compose up --build
```

Then open **http://localhost:5173** and click **Continue in demo mode**
(or configure GitHub OAuth in `backend/.env`).

Services started by Compose:

| Service | URL | Notes |
| --- | --- | --- |
| frontend | http://localhost:5173 | nginx serves the SPA, proxies `/api` and `/ws` to `backend` |
| backend | http://localhost:4000 | Express API + WebSocket |
| ai-engine | http://localhost:8000 | FastAPI agent engine (`USE_LLM=false` by default) |
| mongodb | internal only | `mongodb://mongodb:27017/deploymate` |

Containers address each other by service name (`http://ai-engine:8000`,
`mongodb://mongodb:27017`) — there are no hardcoded `localhost` URLs inside the
network.

## Local Development (without Docker)

Prerequisites: Node.js 20+ and npm, Python 3.11+ and `uv`.

AI engine:

```bash
cd ai-engine
uv sync
cp .env.example .env        # optional: add GEMINI_API_KEY / GROQ_API_KEY, set USE_LLM=true
uv run uvicorn main:app --reload --port 8000
```

Backend:

```bash
cd backend
npm install
cp .env.example .env        # set MONGODB_URI, JWT_SECRET, etc.
npm run dev                 # http://localhost:4000
```

Frontend:

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

In local dev, Vite proxies `/api` and `/ws` to `http://localhost:4000`, so the
frontend uses same-origin URLs by default. `frontend/.env` is optional.

`USE_LLM=false` (the default) runs every agent with deterministic rule-based
logic — no LLM API key required. Set `USE_LLM=true` for real LangChain calls.

## Configuration

Each component has its own `.env` (git-ignored) and `.env.example`. Never commit
`.env` files, GitHub tokens, AWS credentials, JWT secrets, or API keys.

- `backend/.env` — `BACKEND_PORT`, `FRONTEND_ORIGIN`, `AI_ENGINE_URL`,
  `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `GITHUB_CLIENT_ID/SECRET`,
  `GITHUB_CALLBACK_URL`, `DEV_DEMO_MODE`.
- `frontend/.env` — `VITE_API_URL`, `VITE_WS_URL` (optional; defaults to
  same-origin `/api` and `ws(s)://<host>/ws`).
- `ai-engine/.env` — `GEMINI_API_KEY`, `GROQ_API_KEY`, `LLM_PROVIDER`,
  `GITHUB_TOKEN`, `USE_LLM`.

## Documentation

- [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) — read before starting work.
- [docs/architecture.md](docs/architecture.md)
- [docs/agents.md](docs/agents.md)
- [docs/workflows.md](docs/workflows.md)
- [docs/decisions.md](docs/decisions.md)
- [docs/deployment.md](docs/deployment.md)
- [docs/security.md](docs/security.md)
