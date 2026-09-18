#!/usr/bin/env bash
# DeployMate AI Engine — Linux/macOS Startup Script
set -e

echo "Setting up DeployMate AI Engine..."

# Sync dependencies into .venv (creates it if missing)
echo "Syncing dependencies with uv..."
uv sync --color always

# Copy .env if it doesn't exist
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp .env.example .env
  echo "Created .env from .env.example — fill in your API keys!"
fi

echo "Starting DeployMate AI Engine on http://localhost:8000"
uv run uvicorn main:app --reload --port 8000 --host 0.0.0.0
