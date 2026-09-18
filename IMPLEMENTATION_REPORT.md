# DeployMate — Implementation Report (deploymate branch)

Delivered on the `deploymate` git branch only. `main`/`master` are never modified
or pushed to. All code runs in Docker Compose (frontend 5173, backend 4000,
ai-engine 8000, MongoDB Atlas via `backend/.env`).

---

## 1. What changed (and what stayed)

### Changed / added — backend (Node/Express)
| File | Change |
|---|---|
| `services/awsCrypto.js` (new) | AES-256-GCM encrypt/decrypt for Secret Access Keys. |
| `services/awsService.js` (new) | STS `GetCallerIdentity` validation, credentialed ECR/ECS/CloudWatch/CloudWatchLogs clients, project-scoped connection resolution, real multi-service discovery with per-service permission handling. |
| `services/ecsDeployer.js` (new) | Real deploy pipeline: Docker build → ECR login/push → task definition → Fargate cluster/service → stability wait; real rollback (previous task-def revision); `PrerequisiteError` (honest BLOCK). |
| `services/secretScanner.js` (new) | Commit-time secret detection (AWS keys, GitHub tokens, private keys, secret assignments). Values are never surfaced. |
| `controllers/aws.controller.js` | Reworked: `connect`/`status`/`test`/`discover`/`resources`/`disconnect`; encrypted-at-rest storage; safe serialization; per-`userId+projectId` scoping. |
| `routes/aws.routes.js` | Six required routes + safe `GET /connections`. |
| `controllers/github.controller.js` | Deployment-branch management, branch-aware browsing, secret-gated commits to `deploymate`, optional PR creation. |
| `services/githubService.js` | Branch listing/creation/head-resolution, `createPullRequest`. |
| `controllers/deployment.controller.js` | Approval now requires a validated connection (409 otherwise); execution via real ECS deployer; no simulation; real errors streamed. |
| `controllers/monitoring.controller.js` | Real CloudWatch metrics/logs/alarms and ECS service health (no random numbers). |
| `middleware/validate.js` | Added `validateQuery` (mirrors `validateBody`). |
| `models/AwsConnection.js` | Added `projectId`, `accessKeyId`, `encryptedSecretAccessKey`, `accountId`, `identityArn`, `lastValidatedAt`, `lastDiscovery`; legacy `roleArn`/`externalId` kept optional for schema compatibility. |
| `models/Project.js` | Added `defaultBranch`, `deploymateBranch`, `lastCommitSha`. |
| `.env.example`, `package.json` | New env vars + AWS SDK deps. |
| `tests/` (new) | `secretScanner.test.mjs`, `awsCrypto.test.mjs`; `npm test`. |

### Changed — frontend (React/Vite)
| File | Change |
|---|---|
| `views/AwsConnectionView.jsx` | Rewritten: "Connect AWS Account" form (Access Key ID, Secret Access Key, Region + project selector), Test & Save, per-project status, Discover/Disconnect. No role ARN / external ID fields. |
| `services/api.js` | New AWS + branch/PR API functions. |
| `components/layout/TopBar.jsx` | AWS chip scoped to the active project; account id/region/identity (no `roleArn`). |
| `views/OverviewView.jsx`, `views/SettingsView.jsx` | Copy updated to the IAM-user encrypted-at-rest model. |

### Changed — AI engine (Python / LangChain + LangGraph)
| File | Change |
|---|---|
| `agents/aws_discovery.py` | No more hardcoded role ARN / external ID. Consumes *safe* backend discovery payloads; returns explicit `NOT_IMPLEMENTED` when absent. Never receives AWS credentials. |
| `tools/aws.py` | Fabrications removed (`get_resources`, `describe_service`, `get_cloudwatch_logs`, `get_app_runner_metrics`, `create_assume_role_action`, `create_discovery_actions`, fake `execute_deployment_actions` URL). Approved execution now returns `NOT_IMPLEMENTED` and defers to the Node backend; `create_deployment_actions` remains as a structured tool spec. |
| `agents/monitoring.py` | No fabricated logs; reports `not_available` when the backend provides no logs. |
| `graphs/nodes.py` | `aws_discovery_node` and `deployment_node` updated to match (no fake AWS values). |

### Not changed
- `infrastructure/execution/aws-executor.ts` — legacy scaffold, never imported; the Node backend performs execution instead.
- Fallback mock responses in `aiEngineClient.js` — used ONLY when the Python engine is unreachable; the analysis/architecture/security fallbacks were kept (labeled demo placeholders) but `deployment_plan`/`architecture` fallback text now reflects the real ECR/ECS pipeline.

## 2. New dependencies
- Backend: `@aws-sdk/client-sts`, `@aws-sdk/client-ecr`, `@aws-sdk/client-ecs`, `@aws-sdk/client-ec2`, `@aws-sdk/client-cloudwatch`, `@aws-sdk/client-cloudwatch-logs`.
- AI engine: no new deps (boto3 remains declared, unused by the engine).

## 3. Environment variables (all git-ignored)
- `AWS_CREDENTIAL_ENCRYPTION_KEY` — 32+ char secret; encryption key for AES-256-GCM. Dev fallback key used if absent (logged once).
- `AWS_REGION` — default `ap-south-1`.
- Existing: `MONGODB_URI`, `JWT_SECRET`, `COOKIE_SECURE`, `DEV_DEMO_MODE`, GitHub OAuth vars.

## 4. Schema changes (MongoDB, additive)
- `AwsConnection`: `projectId`, `accessKeyId`, `encryptedSecretAccessKey`, `accountId`, `identityArn`, `lastValidatedAt`, `lastDiscovery` (Mixed), partial unique index `(userId, projectId)`.
- `Project`: `defaultBranch`, `deploymateBranch`, `lastCommitSha`.
- `Deployment`: unchanged (existing status enum reused).

## 5. API endpoints
- `POST /api/aws/connect` — validates via STS, stores encrypted secret, sets `project.awsConnectionId`/`awsRegion`.
- `GET /api/aws/status?projectId=` — connection state (no secret).
- `POST /api/aws/test` — re-validates stored creds with STS.
- `POST /api/aws/discover` — real ECR/ECS/CloudWatch discovery (per-service permission handling); persisted.
- `GET /api/aws/resources?projectId=` — persisted discovery result.
- `DELETE /api/aws/disconnect` — deletes the project's stored creds.
- `GET /api/aws/connections` — safe list (masked keys, no secrets).
- `GET /api/github/projects/:id/branches`, `POST /api/github/projects/:id/branch` (create/deploymate), `POST /api/github/projects/:id/pr` (optional PR), `POST /api/github/projects/:id/commit` (secret-gated; deploymate only).
- `POST /api/deployments/:projectId/plan`, `POST /api/deployments/:deploymentId/approve|reject|rollback`, `GET .../logs` — unchanged routes, real execution behind them.
- `GET /api/monitoring/:projectId/health|metrics|logs|alerts` — real data or explicit `available:false` + reason.
- All routes carry `requireAuth` + `requireOwnedProject` (per-user/per-project isolation).

## 6. AWS + GitHub permissions required
- IAM user policy (minimal, adjust as needed):
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {"Effect":"Allow","Action":["sts:GetCallerIdentity"],"Resource":"*"},
      {"Effect":"Allow","Action":["ecr:GetAuthorizationToken","ecr:CreateRepository","ecr:DescribeRepositories"],"Resource":"*"},
      {"Effect":"Allow","Action":["ecr:BatchCheckLayerAvailability","ecr:InitiateLayerUpload","ecr:UploadLayerPart","ecr:CompleteLayerUpload","ecr:BatchGetImage","ecr:PutImage"],"Resource":"*"},
      {"Effect":"Allow","Action":["ecs:ListClusters","ecs:DescribeClusters","ecs:CreateCluster","ecs:UpdateService","ecs:CreateService","ecs:DescribeServices","ecs:RegisterTaskDefinition","ecs:ListTaskDefinitions"],"Resource":"*"},
      {"Effect":"Allow","Action":["ec2:DescribeSubnets","ec2:DescribeVpcs","ec2:DescribeSecurityGroups"],"Resource":"*"},
      {"Effect":"Allow","Action":["logs:DescribeLogGroups","logs:DescribeLogStreams","logs:GetLogEvents","logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"],"Resource":"*"},
      {"Effect":"Allow","Action":["cloudwatch:ListMetrics","cloudwatch:GetMetricData","cloudwatch:DescribeAlarms"],"Resource":"*"}
    ]
  }
  ```
- GitHub: `repo` scope (contents, pulls) on the user's OAuth token.

## 7. Encryption
- AES-256-GCM, key = SHA-256(`AWS_CREDENTIAL_ENCRYPTION_KEY`). Format `v1:<iv>:<tag>:<ciphertext>` (hex). Random 12-byte IV per write. Tampering/key change ⇒ auth-tag failure. The plaintext secret exists only inside `awsService`/`ecsDeployer` client construction; it is never serialized, logged, sent to the browser, or passed to the AI engine.

## 8. Branch mechanics
- The coding agent works ONLY on the `deploymate` branch (auto-created from the project's default branch on first commit; `POST /api/github/projects/:id/branch` to confirm early). Tree/file browsing falls back to the source branch when `deploymate` does not exist yet. `main` is never written.

## 9. Approval
- `createPlan` → `AWAITING_APPROVAL`. `approve` requires a validated (`connected`) project-scoped AWS connection, otherwise HTTP 409. Reject sets `REJECTED` and touches no AWS resources.

## 10. Tests
- `cd backend && npm test` → SCANNER OK, CRYPTO OK.
- Route guards verified live: all new AWS/GitHub endpoints return 401 unauthenticated; demo-user calls return ownership errors ("Project not found") instead of leaking data.
- Verified at runtime: the ECS deployer returns `PrerequisiteError` "Docker CLI is not available…" when Docker is absent (this environment), instead of faking a deployment.

## 11. Limitations / blocked (real reasons, nothing faked)
- **Live AWS deployment** is `BLOCKED` in this dev environment: the backend container has no Docker CLI/engine. To run real builds, install `docker-cli` in the backend image and expose the host engine (e.g. mount `/var/run/docker.sock`); on Windows Docker Desktop use WSL2 or a TCP `DOCKER_HOST`. The full Docker→ECR→ECS path is implemented and streams real progress.
- **End-to-end AWS validation** needs a real IAM user with the policy above; enter the keys through the new Connect form (STS validates instantly).
- **Real GitHub commits** require a project created from a real GitHub login (demo users have no token); the secret scanner blocks any commit containing potential credentials.
- **Public URL**: a Fargate service without an ALB has no public endpoint; `url` is intentionally `null` with an explanatory note rather than a fabricated link.
- **Cross-account / role-based access**: retired by design — IAM user keys only.

## 12. Branch / commit state
- Commits so far on `deploymate`: baseline, then the real-AWS-integration commit described in this report. `git status` is clean for the tracked implementation (untracked user files `pasted-text.md` / `work done/` were intentionally left uncommitted).