# backend/app.py
"""FastAPI application factory — assembles middleware, static mounts, routes, and error handlers."""

import os
import logging

# Load environment variables from .env file if it exists
def load_dotenv():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dotenv_path = os.path.join(base_dir, ".env")
    if os.path.exists(dotenv_path):
        with open(dotenv_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    os.environ[k] = v

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.routes import register_routes
from backend.database import init_db

# Initialize SQLite database schema and seed initial data
init_db()

# 1. Create the FastAPI app instance
app = FastAPI(
    title="ISDE MiniShop",
    description="A Flipkart-style e-commerce demo built with FastAPI",
    version="2.0.0"
)

# 2. Setup static files directory for uploads
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
UPLOAD_DIR = os.path.join(STATIC_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# 3. Add CORS middleware (safety net for direct backend access, e.g. /docs)
# Note: In dev, the Vite proxy makes all API calls same-origin so CORS is not needed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Register all route modules
register_routes(app)

# 5. Global error handler
@app.exception_handler(Exception)
async def global_error_handler(request, exc):
    logging.error(f"Unhandled error: {exc}", exc_info=True)
    return {"error": "Something went wrong. Please try again."}
