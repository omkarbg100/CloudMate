# DeployMate Studio — Frontend

Modern, dark-mode React application for AI-powered AWS cloud architecture planning and automated deployment visualization.

## Features
- **Modern React + Tailwind CSS**: Clean glassmorphism aesthetic with tailored slate & indigo theme.
- **Interactive Architecture Diagram**: Visualized using `reactflow` with custom AWS nodes, connected workflows, and service panels.
- **Multi-step AI Orchestration**: Step-by-step progress tracking for repository cloning/analysis and AWS architecture generation.
- **Authentication & Project Management**: Secure JWT authentication, project creation, and detailed status insights.

## Tech Stack
- **React 18**
- **Vite 6**
- **Tailwind CSS 3**
- **React Flow (`reactflow`)**
- **TanStack Query (React Query v5)**
- **Axios**
- **Lucide Icons**

## Getting Started

### Development
```bash
# Install dependencies
npm install

# Start Vite dev server with proxy to backend (http://localhost:4000)
npm run dev
```

App will run at: `http://localhost:5173`

### Production Build
```bash
npm run build
npm run preview
```

### Docker
```bash
docker build -t deploymate-frontend .
docker run -p 5173:80 deploymate-frontend
```
