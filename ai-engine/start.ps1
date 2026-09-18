# DeployMate AI Engine — Windows Startup Script
# Uses uv package manager (uv sync) with a managed virtual environment

$ErrorActionPreference = "Stop"

Write-Host "Setting up DeployMate AI Engine..." -ForegroundColor Cyan

# Sync dependencies into .venv (creates it if missing)
Write-Host "Syncing dependencies with uv..." -ForegroundColor Yellow
uv sync --color always

# Copy .env if it doesn't exist
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "Created .env from .env.example — fill in your API keys!" -ForegroundColor Magenta
    }
}

# Start uvicorn via uv
Write-Host "Starting DeployMate AI Engine on http://localhost:8000" -ForegroundColor Green
uv run uvicorn main:app --reload --port 8000 --host 0.0.0.0
