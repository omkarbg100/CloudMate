# DeployMate Backend

Node.js / Express API gateway for DeployMate Studio.

## Responsibilities

- JWT authentication (HTTP-only cookie + Authorization header)
- Project CRUD with per-user ownership enforcement
- Proxies AI requests to the FastAPI microservice
- Persists analysis and architecture results in MongoDB

## Stack

| Tool | Purpose |
|------|---------|
| Express | HTTP framework |
| Mongoose | MongoDB ODM |
| bcryptjs | Password hashing |
| jsonwebtoken | JWT signing/verification |
| axios | FastAPI proxy calls |
| helmet | Security headers |
| cors | Cross-origin config |
| morgan | HTTP logging |
| express-rate-limit | Rate limiting on auth + AI routes |

## API Endpoints

### Auth
| Method | Path | Auth |
|--------|------|------|
| POST | /api/auth/register | — |
| POST | /api/auth/login | — |
| GET | /api/auth/me | ✓ |
| POST | /api/auth/logout | ✓ |

### Projects
| Method | Path | Auth |
|--------|------|------|
| GET | /api/projects | ✓ |
| POST | /api/projects | ✓ |
| GET | /api/projects/:id | ✓ |
| PATCH | /api/projects/:id | ✓ |
| DELETE | /api/projects/:id | ✓ |

### Analysis
| Method | Path | Auth |
|--------|------|------|
| POST | /api/projects/:id/analyze | ✓ |
| POST | /api/projects/:id/architecture | ✓ |
| GET | /api/projects/:id/analysis | ✓ |

## Setup

```bash
cd Backend
cp .env.example .env
# Edit .env — set MONGODB_URI and JWT_SECRET
npm install
npm run dev
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4000 | HTTP port |
| MONGODB_URI | — | MongoDB connection string |
| JWT_SECRET | — | JWT signing secret |
| JWT_EXPIRES_IN | 7d | Token lifetime |
| AI_SERVICE_URL | http://localhost:8000 | FastAPI service URL |
| FRONTEND_URL | http://localhost:5173 | Allowed CORS origin |

## Docker

```bash
docker compose up --build backend
```
