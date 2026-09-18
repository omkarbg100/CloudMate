# Agents

All agents live in `ai-engine/agents/` and are invoked as LangGraph nodes
(`graphs/nodes.py`). Each agent takes the shared `DeploymateState`, reads what
it needs, reasons through LangChain (when `USE_LLM=true`), and returns a
structured partial state update. Agents never reach the shell/AWS directly —
`tools/*` performs all external operations under `utils/policies.py`.

## Orchestrator Agent

Drives the LangGraph orchestration graph (`graphs/graph.py`). Routes
each action to the correct node/workflow subgraph, manages the shared
`DeploymateState`, and enforces approval gates (pause/resume via
`interrupt`/`Command`).

## Repository Analyzer Agent

Detects:

- language
- framework
- frontend/backend shape
- package manager
- build/start/test commands
- ports
- environment variables
- Docker support

## AWS Discovery Agent

Discovers permitted, reusable AWS resources through an IAM Role + STS
temporary-credential strategy. Emits structured discovery actions and never
touches permanent keys.

## Architecture Agent

Maps repository analysis to AWS services and emits structured JSON for
frontend rendering (nodes, edges, rationale, resource decisions).

## Security Agent

Finds deployment/security risks:

- hardcoded secrets
- insecure Docker config
- missing health checks
- exposed ports
- missing auth
- vulnerable dependencies
- unsafe deployment settings

Secret values must be redacted.

## Code Agent

Generates patches and explanations (Dockerfile, `.env.example`, health routes,
etc.), then waits for approval before apply.

## Validation Agent

Runs controlled validation steps:

- install dependencies
- test
- lint
- build
- Docker build
- health check
- security checks

## Deployment Agent

Creates deployment plans and (after policy + human approval) executes approved
AWS actions through scoped `tools/aws` actions.

## Monitoring/Diagnosis Agent

Reads CloudWatch logs/metrics, detects failures (rule patterns + LangChain
diagnosis), explains likely causes, and proposes fixes (repair node).