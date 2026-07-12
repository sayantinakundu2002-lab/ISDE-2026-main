#!/bin/bash
# setup.sh - Automated setup and run script for Unix-like systems and GitHub Codespaces.

# Exit immediately if any command fails
set -e

echo -e "\033[0;36m=== ISDE 2026 MiniShop Setup Tool ===\033[0m"

# 1. Check Python version
if command -v python3 &>/dev/null; then
    PYTHON_CMD="python3"
elif command -v python &>/dev/null; then
    PYTHON_CMD="python"
else
    echo -e "\033[0;31mError: Python is not installed. Please install Python 3.10+ and try again.\033[0m"
    exit 1
fi

# 2. Check Node version
if ! command -v node &>/dev/null; then
    echo -e "\033[0;31mError: Node.js is not installed. Please install Node.js 18+ and try again.\033[0m"
    exit 1
fi

# 3. Setup Python Virtual Environment
echo -e "\033[0;32mSetting up Python virtual environment...\033[0m"
if [ ! -d "venv" ]; then
    $PYTHON_CMD -m venv venv
fi

# Activate virtual environment
if [ -d "venv/bin" ]; then
    source venv/bin/activate
elif [ -d "venv/Scripts" ]; then
    source venv/Scripts/activate
fi

# 4. Install backend dependencies
echo -e "\033[0;32mInstalling backend dependencies...\033[0m"
pip install --upgrade pip
pip install -r requirements.txt

# 5. Install frontend dependencies
echo -e "\033[0;32mInstalling Node dependencies...\033[0m"
npm install
npm install --prefix frontend

# 6. Initialize / reset DB to clean defaults
echo -e "\033[0;32mInitializing SQLite database...\033[0m"
python -c "from backend.database import reset_database_to_defaults; reset_database_to_defaults()"

# 7. Run automated tests to verify setup
echo -e "\033[0;32mRunning tests to verify setup...\033[0m"
python -m pytest -v

# 8. Start the application
echo -e "\033[0;32mSetup complete! Starting application dev servers...\033[0m"
npm start
