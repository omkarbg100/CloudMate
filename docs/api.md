# API

Base path: `/api`

## Health

- `GET /health`

## Projects

- `GET /projects`
- `POST /projects`
- `GET /projects/:id`
- `DELETE /projects/:id`

## Analysis

- `POST /projects/:id/analyze`
- `GET /projects/:id/analysis`

## Architecture

- `POST /projects/:id/architecture`
- `GET /projects/:id/architecture`

## Security

- `POST /projects/:id/security/scan`
- `GET /projects/:id/security`

## Changes

- `POST /projects/:id/changes`
- `GET /projects/:id/changes`
- `POST /projects/:id/changes/apply`

## Validation

- `POST /projects/:id/validate`

## Deployment

- `POST /deployments/plan`
- `POST /deployments/:id/approve`
- `POST /deployments/:id/reject`
- `GET /deployments/:id`
- `GET /deployments/:id/logs`
- `POST /deployments/:id/rollback`

## Monitoring

- `GET /monitoring/:projectId/health`
- `GET /monitoring/:projectId/metrics`
- `GET /monitoring/:projectId/logs`
- `GET /monitoring/:projectId/alerts`

## Chat

- `POST /chat`

Body:

```json
{
  "projectId": "proj_demo",
  "message": "Analyze this project"
}
```

## WebSocket

- `/ws/projects/:projectId`

Example event:

```json
{
  "type": "DEPLOYMENT_PROGRESS",
  "step": "BUILDING",
  "progress": 40,
  "message": "Building Docker image"
}
```
