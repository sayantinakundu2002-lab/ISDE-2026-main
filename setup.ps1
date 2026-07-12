# setup.ps1 - Automated setup and run script for Windows (PowerShell).

$ErrorActionPreference = "Stop"

Write-Host "=== ISDE 2026 MiniShop Setup Tool ===" -ForegroundColor Cyan

# 1. Check Python version
if (!(Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Python is not installed. Please install Python 3.10+ and try again." -ForegroundColor Red
    Exit
}

# 2. Check Node version
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Node.js is not installed. Please install Node.js 18+ and try again." -ForegroundColor Red
    Exit
}

# 3. Setup Python Virtual Environment
Write-Host "Setting up Python virtual environment..." -ForegroundColor Green
if (!(Test-Path "venv")) {
    python -m venv venv
}

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# 4. Install backend dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Green
python -m pip install --upgrade pip
pip install -r requirements.txt

# 5. Install frontend dependencies
Write-Host "Installing Node dependencies..." -ForegroundColor Green
npm install
npm install --prefix frontend

# 6. Initialize / reset DB to clean defaults
Write-Host "Initializing SQLite database..." -ForegroundColor Green
python -c "from backend.database import reset_database_to_defaults; reset_database_to_defaults()"

# 7. Run automated tests to verify setup
Write-Host "Running tests to verify setup..." -ForegroundColor Green
python -m pytest -v

# 8. Start the application
Write-Host "Setup complete! Starting application dev servers..." -ForegroundColor Green
npm start
