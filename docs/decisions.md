# Decisions

## ADR-001: Foundation Strategy (superseded by ADR-003)

Date: 2026-09-17

Decision:

Use Strands Agents and Amazon Bedrock AgentCore patterns as the foundation, while building DeployMate Studio's product layer ourselves.

Reason:

DeployMate needs agent runtime, memory, observability, tool boundaries, and AWS alignment. AgentCore and Strands cover those concerns without forcing us to copy a generic chatbot app.

Consequences:

- Python AI engine will own agent reasoning.
- Node backend will own auth, APIs, jobs, WebSocket updates, approval gates, and persistence.
- Frontend remains a custom React workspace.
- Infrastructure can evolve from local development to AgentCore Runtime once the local workflows are stable.

## ADR-002: Human Approval Boundaries

Date: 2026-09-17

Decision:

Require explicit approval before applying generated code changes, deploying AWS resources, rolling back, deleting, or changing permissions.

Reason:

DeployMate touches source code and cloud resources. The product must demonstrate controlled agency rather than unrestricted automation.

Consequences:

- Code Agent generates patches and diffs before apply.
- Deployment Agent generates plans before execution.
- Audit logging is required for every agent action.

## ADR-003: AI Framework Revision (LangChain + LangGraph)

Date: 2026-09-18

Decision:

Supersedes ADR-001. Build the Python AI engine on **LangChain + LangGraph**
instead of Strands Agents and Amazon Bedrock AgentCore. LangChain owns LLM
interaction (prompts, chat models, structured JSON output); LangGraph owns
orchestration, shared state, workflow subgraphs, retries, human approval
(`interrupt`/`Command` resume), and checkpoints. No Strands/AgentCore/Bedrock
dependency is used.

Reason:

LangChain + LangGraph provide the needed agentic primitives in a single,
provider-agnostic stack that runs fully locally without AWS model access, while
still supporting Gemini/Groq providers. This removes the early dependency on
Bedrock model access and AgentCore runtime, and keeps the engine testable
offline with deterministic rule-based fallbacks (`USE_LLM=false`).

Consequences:

- `ai-engine/` is structured as `agents/` (think/decide), `graphs/`
  (orchestrate), `tools/` (execute), `utils/` (shared support), plus `main.py`.
- Human approval is implemented with LangGraph `interrupt` + in-memory
  `InMemorySaver` checkpointing (durable checkpointer planned for production).
- AWS deployment execution remains typed, dry-run tool actions and does not
  require Bedrock/AgentCore.

## ADR-004: Plain JavaScript + Docker Compose

Date: 2026-09-18

Decision:

Implement both the frontend and backend in **plain JavaScript** — React (JSX) for
the frontend and Node + Express (ES modules) for the backend — with no TypeScript
anywhere. Persist application data in **MongoDB** via Mongoose and run the whole
stack with **Docker Compose** (`frontend`, `backend`, `ai-engine`, `mongodb`).
Authenticate with GitHub OAuth (manual code exchange) and a JWT stored in an
httpOnly cookie, rather than Passport/session middleware.

Reason:

The team wants a lower-friction, dependency-light stack that is easy to run and
review. A single `docker compose up --build` gives a reproducible environment with
no local toolchain requirements, and plain JavaScript removes the TypeScript build
step from both apps. Service-name networking avoids hardcoded `localhost` URLs.

Consequences:

- `frontend/` is JS/JSX only; `backend/` is JS only (ES modules, `"type": "module"`).
- Backend is organized as `routes/` → `controllers/` → `services/` + `models/`,
  with `middleware/`, `websocket/`, and `utils/`. The backend never performs AI
  reasoning; it calls the Python engine over HTTP.
- The frontend nginx container serves the SPA and proxies `/api` and `/ws` to the
  `backend` service; the browser only ever talks to one origin.
- Per-user project isolation is enforced by `requireOwnedProject`.
- Component `.env` files are required: false in Compose, so the stack starts with
  safe defaults (demo login, `USE_LLM=false`). Only `.env.example` is committed.
- Deployment and monitoring progression are simulated until AWS execution is built.
