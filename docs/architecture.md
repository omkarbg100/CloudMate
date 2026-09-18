# Architecture

DeployMate Studio uses a three-layer product architecture with AWS discovery and deployment as a core flow:

1. React frontend for the studio workspace.
2. Node.js backend for auth, APIs, jobs, approvals, persistence, and WebSocket events.
3. Python AI engine for agent reasoning and controlled tools.

## Local Development Flow

```text
React UI
  -> REST/WebSocket
Node backend
  -> HTTP
Python AI engine
  -> structured agent/tool outputs
Node backend
  -> WebSocket progress + REST responses
React UI
```

The whole stack runs with `docker compose up --build` (`frontend`, `backend`,
`ai-engine`, `mongodb`). The frontend nginx container proxies `/api` and `/ws` to
the `backend` service; the backend reaches `ai-engine` and `mongodb` by Compose
service name. No hardcoded `localhost` URLs are used inside the network.

## AI Engine (LangChain + LangGraph)

The entire AI services layer (`ai-engine/`) is built on **Python + LangChain +
LangGraph** — no other agent framework (Strands Agents / AgentCore SDK) is used.

- **LangChain** provides every LLM integration: `ChatPromptTemplate`, chat
  models and runnable chains (`tools/llm.py`), structured JSON output, and the
  prompt templates (`utils/prompts.py`).
- **LangGraph** provides orchestration, the shared typed graph state
  (`utils/state.py`), workflow subgraphs (`graphs/workflows.py`), the routing
  graph (`graphs/graph.py`), node retries (`RetryPolicy`), human approval via
  `interrupt`/`Command(resume=...)`, and checkpoints (`InMemorySaver`).

Layout of `ai-engine/`:

```text
agents/    10 specialized agents (Orchestrator, Repository, AWS Discovery,
           Architecture, Security, Code, Validation, Infrastructure,
           Deployment, Monitoring)
graphs/    graph.py (orchestrator routing + checkpointer), nodes.py (all nodes),
           workflows.py (analysis / deployment / repair / pipeline subgraphs)
tools/     executors: aws.py, github.py, docker.py, filesystem.py, llm.py
utils/     shared support: settings.py, state.py, schemas.py, prompts.py, policies.py
main.py    FastAPI app
```

## Future AWS Flow

```text
GitHub repository
  -> Repository Analysis
  -> AWS Account Connection (IAM Role + STS)
  -> AWS Resource Discovery
  -> Architecture Agent
  -> Deployment Plan
  -> Infrastructure Generation
  -> Security/Policy Validation
  -> Human Approval
  -> AWS Deployment
  -> CloudWatch Monitoring
  -> AI Diagnosis/Repair
```

## Core Boundaries

- Frontend never calls AWS directly.
- Node does not perform complex AI reasoning.
- Python does not bypass approval gates.
- Tools expose typed actions, not arbitrary command execution.
- Long-running workflows emit job events through WebSocket.
- Permanent AWS access keys are not accepted.
- AWS execution uses IAM Role ARN, External ID, and STS temporary credentials.
- The Architecture Agent decides whether to create, reuse, or modify each AWS resource.
- `infrastructure/` contains schemas, generators, policies, and executors; it does not hard-code one architecture.

## AWS Services

- LLM providers via LangChain: Google Gemini (`langchain-google-genai`) or Groq (`langchain-groq`).
- MongoDB (Mongoose): current persistence for users, projects, analyses, architectures, security scans, deployments, agent executions, and AWS connections.
- S3: artifacts, logs, generated plans, and optional code bundles.
- Secrets Manager: secrets and environment references.
- ECR: container images.
- App Runner: containerized app deployment.
- CloudWatch: logs, metrics, health, alerts.
- EventBridge: workflow events.
- IAM Role + STS temporary credentials: AWS operations (no permanent access keys).

## Dynamic AWS Decisions

Architecture is generated from:

- GitHub repository analysis.
- Detected language/framework/database/build/runtime needs.
- AWS region.
- Security requirements.
- Cost/scaling requirements.
- Discovered existing AWS resources.

Every resource decision is one of:

- `create`: provision a new resource.
- `reuse`: reference an existing compatible resource.
- `modify`: update an existing resource after policy validation and approval.
