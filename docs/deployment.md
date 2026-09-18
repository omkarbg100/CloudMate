# Deployment

## Current Status

No AWS resources have been deployed yet. DeployMate itself runs locally or via
Docker Compose.

## Running DeployMate (Docker Compose)

```bash
cp backend/.env.example backend/.env
cp ai-engine/.env.example ai-engine/.env
docker compose up --build
```

Services:

- `frontend` — nginx serves the built SPA on http://localhost:5173 and proxies
  `/api` and `/ws` to `backend`.
- `backend` — Express API + WebSocket on http://localhost:4000.
- `ai-engine` — FastAPI agent engine on http://localhost:8000.
- `mongodb` — internal persistence (`mongodb://mongodb:27017/deploymate`).

Component `.env` files are optional (`required: false`), so the stack also starts
with built-in defaults (demo login, `USE_LLM=false`).

## Target AWS Services (for deployed applications)

- LLM providers via LangChain: Google Gemini (`langchain-google-genai`) or Groq (`langchain-groq`)
- S3
- ECR
- App Runner / ECS (Fargate) / Lambda (selected dynamically)
- Secrets Manager
- CloudWatch
- EventBridge
- IAM Role + STS temporary credentials

MongoDB Atlas (or a managed MongoDB) is the backing store for DeployMate's own
data unless migrated to DynamoDB later.

## Deployment Plan Shape

```json
{
  "planId": "plan_demo",
  "status": "AWAITING_APPROVAL",
  "resources": ["ECR", "App Runner", "Secrets Manager", "CloudWatch"],
  "steps": [
    "Build Docker image",
    "Push image to ECR",
    "Create App Runner service",
    "Configure environment",
    "Configure secrets",
    "Deploy",
    "Verify health"
  ]
}
```

## Approval Boundary

Deployment must not run until the user explicitly approves a generated plan. The
backend persists the plan as `AWAITING_APPROVAL`; `POST /api/deployments/:id/approve`
starts progression and streams `DEPLOYMENT_*` / `BUILD_*` / `HEALTH_CHECK` events
over the project WebSocket. Current progression is simulated; real AWS execution
will be added in the AI engine's deployment tools.
