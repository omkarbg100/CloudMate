# Security

## Principles

- Least privilege for every agent/tool.
- No arbitrary shell or AWS command execution.
- No secret value display in UI/logs.
- Approval required for code changes, deployments, deletes, rollbacks, production changes, and permission changes.
- Every action is logged with actor, tool, input summary, output summary, and timestamp.

## Initial Controls

- API schemas validated with Zod/Pydantic.
- Agent outputs structured as JSON.
- Secret-like values redacted.
- Deployment actions represented as typed commands.
- WebSocket events avoid sensitive payloads.
- Authentication via GitHub OAuth with a JWT in an httpOnly cookie (`dm_token`);
  the GitHub access token is never returned to the browser.
- Per-user project isolation enforced by `requireOwnedProject` on every
  project-scoped route.
- AWS connections store only IAM Role ARN + External ID + region; permanent AWS
  access keys are never accepted or stored.
- Secrets live in git-ignored `.env` files (only `.env.example` is committed).

## Future Controls

- IAM roles by agent responsibility.
- Tool-scoped policy gates in `utils/policies.py` (allow-list per action scope).
- Cedar policies where appropriate.
- Branch isolation for code changes.
- Audit trail persisted to MongoDB (DynamoDB optional later).
- Security scan allow-list for controlled command execution.
