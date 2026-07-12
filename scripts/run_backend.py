# scripts/run_backend.py
import os
import sys

# Ensure the root directory is in the python path
sys.path.insert(0, os.path.abspath('.'))

import uvicorn

if __name__ == '__main__':
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["backend"],
        reload_excludes=["**/*.db*", "**/static/**", "**/*.log"]
    )
