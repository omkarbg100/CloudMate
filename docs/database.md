# Database

DeployMate uses **MongoDB** with Mongoose for persistence. (DynamoDB was the
original target in the Phase 0 plan and may be revisited later, but the shipped
backend uses MongoDB and runs via Docker Compose at
`mongodb://mongodb:27017/deploymate`.)

All writes are project-scoped and every project is owned by exactly one user;
`backend/services/projectService.js` (`getOwnedProject` / `requireOwnedProject`)
is the single isolation choke point. Secrets are never stored — only references
and non-sensitive identifiers.

## Collections

### users

- `githubId`
- `username`
- `displayName`
- `avatar`
- `email`
- `accessToken` (GitHub OAuth token; never returned to the client)

### projects

- `projectId`
- `userId`
- `name`
- `repoOwner`, `repoName`, `branch`
- `status` (`connected` | `analyzing` | `analyzed` | `awaiting_approval` | `deploying` | `deployed` | `failed`)
- `health` (`healthy` | `warning` | `unknown` | `unhealthy`)
- `url`, `lastDeployment`
- `awsRegion`, `awsConnectionId`

### analyses

- `projectId`
- `languages`
- `frontend`, `backend`
- `database`, `docker`
- `packageManager`, `ports`, `environmentVariables`, `tests`
- `rawFiles`, `agentNotes`

### architectures

- `projectId`, `awsConnectionId`, `region`
- `nodes`, `edges`, `rationale`
- `resourceDecisions` (`create` | `reuse` | `modify`, risk, approval)
- `status`

### securityscans

- `projectId`
- `findings` (id, severity, file, type, description, recommendation)
- `summary` (critical/high/medium/low)
- `scanStatus`

### deployments

- `deploymentId`, `planId`, `projectId`, `userId`
- `status` (`AWAITING_APPROVAL` | `APPROVED` | `REJECTED` | `BUILDING` | ... | `SUCCESS` | `FAILED` | `ROLLING_BACK` | `ROLLED_BACK`)
- `region`, `awsConnectionId`
- `steps`, `currentStep`, `progress`, `logs`, `resources`
- `url`, `approvedBy`, `approvedAt`, `completedAt`, `errorMessage`

### agentexecutions

- `executionId`, `projectId`, `userId`
- `agentName`, `trigger`, `input`, `output`
- `status`, `durationMs`, `errorMessage`

### awsconnections

- `connectionId`, `userId`
- `roleArn`, `externalId`, `region`, `accountId`
- `status` (`pending` | `connected` | `failed`)

No permanent AWS access keys are accepted or stored.
