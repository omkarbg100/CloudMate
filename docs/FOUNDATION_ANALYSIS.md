# Foundation Analysis

Date: 2026-09-17

> **UPDATE (2026-09-18):** The engine foundation decision moved to
> **LangChain + LangGraph** (see `docs/PROJECT_CONTEXT.md` "Foundation
> Decision"). This analysis stands as the original evaluation record; the
> current `ai-engine/` no longer uses Strands Agents / AgentCore and instead
> uses LangChain for LLM interaction and LangGraph for orchestration, state,
> retries, human approval, and checkpoints.

## Task

Evaluate AWS open-source agentic repositories and decide what DeployMate Studio should reuse, adapt, and build itself before implementation.

## Sources Reviewed

- Amazon Bedrock AgentCore Samples: https://github.com/awslabs/agentcore-samples
- Strands Agents Samples: https://github.com/strands-agents/samples
- AWS docs, "Use any agent framework" for Bedrock AgentCore: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/using-any-agent-framework.html
- Strands Agents Chat sample: https://github.com/aws-samples/sample-strands-agents-chat
- AgentCore + Strands starter application: https://github.com/aws-samples/sample-strands-agentcore-starter
- Agent-Assisted SDLC sample: https://github.com/aws-samples/sample-agent-assisted-sdlc
- Amazon Bedrock Agent Samples: https://github.com/awslabs/amazon-bedrock-agent-samples
- Strands Agent Chatbot with AgentCore: https://github.com/aws-samples/sample-strands-agent-with-agentcore

## Recommendation

Use Amazon Bedrock AgentCore plus Strands Agents as the agent runtime and orchestration foundation, but do not fork a full sample as the DeployMate product.

DeployMate should build its own product shell:

- React + TypeScript + Vite + Tailwind frontend.
- Node.js + Express + TypeScript API gateway and WebSocket server.
- Python AI engine using Strands Agents and structured tools.
- AWS infrastructure that starts locally and evolves toward AgentCore Runtime, AgentCore Memory, AgentCore Gateway, DynamoDB, S3, ECR, App Runner, Secrets Manager, and CloudWatch.

## Why This Foundation

AgentCore directly maps to DeployMate's need for production-grade agent execution, identity, memory, tools, observability, and policy boundaries. The AgentCore samples are framework-agnostic and include Strands, LangGraph, ADK, and OpenAI Agents examples, so they reduce infrastructure risk without forcing DeployMate into a chatbot sample shape.

Strands is the best fit for the Python AI engine because it supports tool-driven agent loops and can run locally first, then move into AgentCore Runtime later.

## Repository Fit

| Repository | What it provides | Reuse | Avoid |
| --- | --- | --- | --- |
| `awslabs/agentcore-samples` | AgentCore CLI, runtime, memory, identity, gateway, observability, IaC examples | Use as infrastructure and deployment reference | Do not copy sample UX or unrelated use cases |
| `strands-agents/samples` | Python and TypeScript Strands examples, tools, deployment patterns | Use tool patterns, structured agent examples, deployment examples | Do not copy tutorial apps as product code |
| `aws-samples/sample-strands-agents-chat` | React + TypeScript + Tailwind UI, Python FastAPI, CDK | Reuse ideas for frontend/API separation and CDK structure | It lacks required Node backend and deployment workspace flows |
| `aws-samples/sample-strands-agentcore-starter` | FastAPI + AgentCore + Strands, telemetry, evals, cost analytics | Reuse telemetry/eval/cost ideas later | HTMX/FastAPI app shape conflicts with React + Node requirement |
| `aws-samples/sample-agent-assisted-sdlc` | Coding assistant workflow, issue-to-PR flow, isolation, audit trail | Reuse code-change approval, branch, plugin, and audit concepts | Too GitHub-issue-centric for DeployMate's interactive workspace |
| `awslabs/amazon-bedrock-agent-samples` | Bedrock Agents and multi-agent collaboration examples | Use for Bedrock-native multi-agent concepts | More notebook/sample oriented than product foundation |
| `aws-samples/sample-strands-agent-with-agentcore` | Multi-agent orchestration, memory, gateway, browser, observability, Terraform | Reuse architecture concepts and AgentCore capability mapping | Too broad for hackathon MVP |

## Foundation Decision

Primary foundation:

1. Strands Agents inside the Python AI engine.
2. AgentCore Runtime as the eventual managed runtime for the Python agent container.
3. AgentCore Memory for conversation/project memory after the local MVP.
4. AgentCore Gateway or controlled backend tool endpoints for AWS/GitHub/Docker operations.
5. CloudWatch and AgentCore Observability for traces, metrics, and diagnosis.

DeployMate-owned layers:

1. Studio UI and workflows.
2. Node API and WebSocket event model.
3. Repository analysis schema.
4. Architecture generation schema.
5. Security findings schema.
6. Human approval and diff review UX.
7. Deployment plan model.
8. Audit trail and deployment history.

## What We Build Ourselves

- VS Code-like project studio.
- GitHub OAuth and repository explorer.
- Monaco editor integration.
- DeployMate workflow orchestration API.
- Structured repository analyzer.
- AWS architecture graph for deployment recommendations.
- Security/readiness scanner focused on deployment risk.
- Code patch and diff review flow.
- Human approval workflow for code changes and deployments.
- Deployment plan and WebSocket progress.
- CloudWatch monitoring and diagnosis UI.

## What We Reuse

- Strands agent/tool patterns.
- AgentCore Runtime deployment model.
- AgentCore Memory and observability patterns.
- AgentCore Gateway/MCP patterns for controlled tools.
- CDK/Terraform patterns from AWS samples, translated into DeployMate infrastructure.
- Agent-assisted SDLC audit and branch workflow ideas.

## What We Remove Or Defer

- Generic chatbot UX.
- Browser automation unless needed for a demo.
- Voice/multimodal features.
- Complex RAG knowledge base features.
- Cost analytics and eval dashboards until after the MVP path works.
- Full multi-agent collaboration inside Bedrock Agents until local agent modules are stable.

## Architecture Mapping

DeployMate frontend maps to a custom React app, not a copied sample frontend.

DeployMate Node backend maps to:

- Auth and GitHub integration.
- Project/job persistence.
- WebSocket event fanout.
- Human approval gates.
- Calls into the Python engine.

DeployMate Python engine maps to:

- Strands-based orchestrator.
- Specialized repository, architecture, security, code, validation, deployment, and monitoring agents.
- Controlled tool wrappers for GitHub, AWS, Docker, filesystem, and shell operations.

AWS foundation maps to:

- Bedrock for reasoning.
- AgentCore Runtime for agent execution.
- AgentCore Memory for long-running sessions.
- AgentCore Gateway for tool boundaries.
- DynamoDB for project/job state.
- S3 for artifacts and logs.
- ECR/App Runner for deployment.
- Secrets Manager for secrets.
- CloudWatch for logs, metrics, and diagnosis.

## Fastest MVP Path

1. Scaffold the monorepo.
2. Build Phase 1 local loop: React -> Node -> Python -> Node -> React.
3. Add mock project data and WebSocket progress so the UI can demonstrate workflows.
4. Implement local repository analyzer against uploaded/cloned files.
5. Generate architecture JSON and render the graph.
6. Add security scan rules for secrets, Docker risk, missing health checks, and env handling.
7. Add patch generation and diff approval with local filesystem tools.
8. Add validation jobs with controlled command allow-list.
9. Create deployment plan output without deploying.
10. Add AWS deployment execution only after approvals, credentials, and least-privilege policies are in place.

## Risk Notes

- Do not let the LLM run arbitrary shell or AWS commands.
- Do not store or display secret values.
- Do not automatically apply code changes or deploy without approval.
- Avoid copying full AWS samples too closely; use them as implementation references.
- Keep MVP local and structured before introducing managed AgentCore deployment.

## Final Decision

DeployMate should not be a fork of any single AWS sample. It should be a purpose-built product that uses Strands Agents and Bedrock AgentCore patterns as its agent infrastructure foundation.
