# 🚀 DeployMate Studio

**DeployMate Studio** is an AI-powered AWS Cloud Deployment Workspace that automates repository scanning, cloud infrastructure architecture generation, and visual cloud topology inspection.

---

## 📑 Table of Contents
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [How to Run the Project](#how-to-run-the-project)
  - [Method 1: Docker Compose (Recommended)](#method-1-docker-compose-recommended)
  - [Method 2: Manual Local Execution](#method-2-manual-local-execution)
- [End-to-End User Workflow](#end-to-end-user-workflow)
- [API Reference](#api-reference)
- [Troubleshooting & Common Issues](#troubleshooting--common-issues)
- [License](#license)

---

## 🏗 Architecture Overview

The system consists of four primary layers:

```mermaid
graph LR
    subgraph Client
        FE["React Frontend<br/>Vite + Tailwind + React Flow<br/>(Port 5173 / 80)"]
    end

    subgraph API_Gateway
        BE["Node.js Express Backend<br/>JWT Auth + REST API<br/>(Port 4000)"]
    end

    subgraph Data_Store
        DB[("MongoDB 7<br/>(Port 27017)")]
    end

    subgraph AI_Engine
        AI["FastAPI AI Microservice<br/>RepoAgent + ArchitectAgent<br/>(Port 8000)"]
    end

    subgraph External
        GH["GitHub Repositories"]
        LLM["Gemini / Groq LLMs"]
    end

    FE -->|HTTP / Cookies| BE
    BE -->|Mongoose| DB
    BE -->|HTTP POST /process| AI
    AI -->|Git Clone & Scan| GH
    AI -->|Prompt Generation| LLM
```

| Service | Technology | Port | Description |
|---|---|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, React Flow | `5173` (dev) / `80` (docker) | Dark‑mode SPA for workflow orchestration and visual AWS diagrams |
| **Backend** | Node.js, Express, Mongoose | `4000` | REST API gateway, JWT authentication, rate limiting, and project persistence |
| **AI Services** | Python 3.10+, FastAPI, LangChain / LLMs | `8000` | Repository cloning/inspection and AWS architecture synthesis |
| **Database** | MongoDB 7 | `27017` | Document store for users, projects, and AI analysis data |

---

## 📁 Project Structure

```text
AI- Cloud deployment/
├─ docker-compose.yml           # Unified multi‑container orchestration
├─ README.md                    # Project documentation (this file)
├─ ai-services/                 # FastAPI AI microservice
│   ├─ agents/
│   │   ├─ architect_agent/    # Architecture generation logic
│   │   └─ repo_agent/         # Repository cloning & scanning
│   ├─ main.py                  # FastAPI entry point (GET /health, POST /process)
│   ├─ Dockerfile
│   └─ requirements.txt
│
├─ backend/                     # Node.js Express REST API
│   ├─ src/
│   │   ├─ config/              # Env & MongoDB loaders
│   │   ├─ controllers/         # Auth, Project, Analysis controllers
│   │   ├─ middleware/          # JWT guard, validation, error handler
│   │   ├─ models/              # Mongoose schemas
│   │   ├─ routes/              # Express route definitions
│   │   ├─ services/            # Business logic & FastAPI client integration
│   │   ├─ utils/               # JWT helper & logger
│   │   ├─ app.js               # Express app configuration
│   │   └─ server.js            # Server listener
│   ├─ .env.example
│   ├─ Dockerfile
│   └─ package.json
│
├─ frontend/                    # React 18 SPA (pure JSX)
│   ├─ src/
│   │   ├─ components/
│   │   │   ├─ architecture/    # React Flow AWS diagram & detail panel
│   │   │   ├─ layout/          # Sidebar & AppLayout shell
│   │   │   └─ ui/              # Buttons, badges, inputs, skeleton loaders
│   │   ├─ context/             # AuthContext (JWT rehydration & session)
│   │   ├─ pages/               # Landing, Login, Register, Dashboard, NewProject, ProjectDetails, Settings
│   │   ├─ services/            # Axios API client with interceptors
│   │   ├─ App.jsx              # Routing & route guards
│   │   ├─ index.css            # Tailwind directives & custom scrollbars
│   │   └─ main.jsx             # React entry point
│   ├─ .env.example
│   ├─ Dockerfile               # Multi‑stage build + Nginx runner
│   ├─ nginx.conf               # SPA routing & API proxy configuration
│   ├─ package.json
│   ├─ tailwind.config.js
│   └─ vite.config.js
```

---

## ⚙️ Prerequisites

- **Docker & Docker Compose** (recommended) – [Docker Desktop](https://www.docker.com/)
- **Node.js** v18+ (if running services manually) and **npm**
- **Python** 3.10+ and **pip**
- **MongoDB** Community Server v6 or v7 (local or Atlas)
- **Git** available in your `PATH`

---

## 🔐 Environment Configuration

### 1. AI Services (`ai-services/.env`)
Create a `.env` file inside `ai-services/`:

```env
# Choose your preferred LLM provider API key
GEMINI_API_KEY=your_gemini_api_key_here
# or
GROQ_API_KEY=your_groq_api_key_here
```

### 2. Backend (`backend/.env`)
Copy from `backend/.env.example` and adjust as needed:

```env
PORT=4000
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/deploymate

# JWT Secret (minimum 32 random characters)
JWT_SECRET=deploymate-super-secret-jwt-key-change-in-production-12345
JWT_EXPIRES_IN=7d

# FastAPI AI Microservice URL
AI_SERVICE_URL=http://localhost:8000

# Frontend URL for CORS
FRONTEND_URL=http://localhost:5173
```

### 3. Frontend (`frontend/.env`)
Optional – defaults to Vite proxy `/api`:

```env
# Development proxy (leave blank to use the Vite proxy)
VITE_API_URL=http://localhost:4000/api
```

---

## 🚀 How to Run the Project

### Method 1: Docker Compose (Recommended)

```bash
# Build and start all containers (MongoDB, AI Engine, Backend, Frontend)
docker compose up --build
```

Once started:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000 (health: http://localhost:4000/health)
- **AI Engine**: http://localhost:8000 (docs: http://localhost:8000/docs)
- **MongoDB**: `localhost:27017`

To stop:
```bash
docker compose down
```

### Method 2: Manual Local Execution

1. **Start MongoDB**
   ```bash
   mongosh --eval "db.adminCommand('ping')"
   ```
2. **AI Microservice**
   ```bash
   cd ai-services
   python -m venv .venv
   # Windows
   .venv\\Scripts\\activate
   # macOS/Linux
   source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
3. **Backend**
   ```bash
   cd backend
   npm install
   npm run dev  # uses nodemon
   ```
4. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open http://localhost:5173 in your browser.

---

## 🔄 End-to-End User Workflow
1. **Sign Up & Sign In** – Register and obtain a JWT session.
2. **Dashboard** – View your project portfolio and quick actions.
3. **Create a Project** – Provide name, GitHub repo URL, branch, target AWS region, and optional requirements.
4. **AI Repository Analysis** – Click **Analyze Repository**; the AI agent scans the repo and returns a technical breakdown.
5. **Generate Architecture** – Click **Generate Architecture**; the AI agent produces an AWS architecture schema.
6. **Interactive Topology** – Inspect the React Flow diagram with AWS services, connections, and security recommendations.
7. **(Future) Cloud Deployment** – Automated Terraform/CDK provisioning will be added.

---

## 📡 API Reference

### Authentication Endpoints
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Register a new user |
| `POST` | `/api/auth/login` | No | Authenticate and receive JWT |
| `GET` | `/api/auth/me` | Yes | Retrieve authenticated user profile |
| `POST` | `/api/auth/logout` | Yes | Invalidate session |

### Project Management Endpoints
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/projects` | Yes | List all projects for the user |
| `POST` | `/api/projects` | Yes | Create a new project |
| `GET` | `/api/projects/:id` | Yes | Get details of a specific project |
| `PATCH` | `/api/projects/:id` | Yes | Update project fields |
| `DELETE` | `/api/projects/:id` | Yes | Delete project and its analysis data |

### AI Orchestration Endpoints
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/projects/:id/analyze` | Yes | Trigger repository clone & scan |
| `POST` | `/api/projects/:id/architecture` | Yes | Trigger AWS architecture generation |
| `GET` | `/api/projects/:id/analysis` | Yes | Retrieve stored analysis & architecture JSON |

### FastAPI Direct Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check for the AI microservice |
| `POST` | `/process` | Dispatches action: `"analyze"` or `"architecture"` |

---

## 🛠 Troubleshooting & Common Issues

1. **Git Clone Fails** – Ensure the target repository is public and `git` is installed.
2. **LLM API Key Error** – Verify that either `GEMINI_API_KEY` or `GROQ_API_KEY` is set and has sufficient quota.
3. **MongoDB Connection Refused** – Make sure `mongod` is running locally or that the Docker container hostname is used (`mongodb://mongodb:27017/...`).
4. **CORS Errors** – Confirm `FRONTEND_URL` matches the origin (`http://localhost:5173`). Axios is configured with `withCredentials: true`.

---

## 📄 License

This project is licensed under the ISC License.
