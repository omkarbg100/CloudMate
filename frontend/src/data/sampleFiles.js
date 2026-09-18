// Sample workspace files shown in the Code / File Explorer view.
// These illustrate the repository the AI agents reason about.

export const sampleFiles = {
  "backend/server.js": {
    language: "javascript",
    content: `import "dotenv/config";
import http from "node:http";
import cors from "cors";
import express from "express";
import { connectDB } from "./utils/db.js";
import apiRoutes from "./routes/index.js";

const app = express();
connectDB();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN, credentials: true }));
app.use(express.json());
app.use("/api", apiRoutes);

const server = http.createServer(app);
server.listen(process.env.BACKEND_PORT ?? 4000);`,
  },
  "backend/package.json": {
    language: "json",
    content: `{
  "name": "@deploymate/backend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "nodemon server.js",
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.21.2",
    "mongoose": "^8.9.5",
    "jsonwebtoken": "^9.0.2",
    "ws": "^8.18.0",
    "zod": "^3.24.1"
  }
}`,
  },
  "frontend/src/App.jsx": {
    language: "javascript",
    content: `export default function App() {
  return (
    <main className="h-screen bg-[#0d1117] text-gray-100">
      <Dashboard />
    </main>
  );
}`,
  },
  Dockerfile: {
    language: "dockerfile",
    content: `FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 4000
CMD ["node", "server.js"]`,
  },
  "docker-compose.yml": {
    language: "yaml",
    content: `services:
  backend:
    build: ./backend
    environment:
      AI_ENGINE_URL: http://ai-engine:8000
      MONGODB_URI: mongodb://mongodb:27017/deploymate
    depends_on:
      - ai-engine
      - mongodb

  ai-engine:
    build: ./ai-engine

  frontend:
    build: ./frontend
    ports:
      - "5173:80"

  mongodb:
    image: mongo:7`,
  },
  ".env.example": {
    language: "ini",
    content: `BACKEND_PORT=4000
MONGODB_URI=mongodb://localhost:27017/deploymate
AI_ENGINE_URL=http://localhost:8000
JWT_SECRET=change-me
DEV_DEMO_MODE=true`,
  },
};

export const fileNames = Object.keys(sampleFiles);
