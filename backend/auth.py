# backend/auth.py
"""Simple token authentication system with role-based access control."""

import uuid
import hashlib
from typing import Optional
from fastapi import Header, HTTPException


# --- Password hashing ---
def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


# --- In-memory stores ---
TOKENS = {}  # token -> username


# --- Token management ---
def create_token(username: str) -> str:
    token = uuid.uuid4().hex
    import time
    from backend.database import get_db_connection
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO tokens (token, username, created_at) VALUES (?, ?, ?)", (token, username, time.time()))
        conn.commit()
        conn.close()
    except Exception:
        pass
    TOKENS[token] = username
    return token


def get_user_from_token(token: str) -> Optional[dict]:
    username = TOKENS.get(token)
    if not username:
        from backend.database import get_db_connection
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT username FROM tokens WHERE token = ?", (token,))
            row = cursor.fetchone()
            conn.close()
            if row:
                username = row["username"]
                TOKENS[token] = username  # cache in memory
        except Exception:
            pass
            
    if username:
        from backend.database import get_db_connection
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
            row = cursor.fetchone()
            conn.close()
            if row:
                return dict(row)
        except Exception:
            pass
    return None


# --- Auth functions ---
def register_user(username: str, password: str, full_name: str = "", email: str = "", role: str = "user") -> dict:
    from backend.database import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM users WHERE username = ?", (username,))
    if cursor.fetchone():
        conn.close()
        raise ValueError("Username already exists")
    # Validate role
    allowed_roles = {"user", "admin"}
    if role not in allowed_roles:
        role = "user"
    
    cursor.execute("""
    INSERT INTO users (username, email, password, role, full_name, is_verified)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (username, email or username, _hash_password(password), role, full_name or username, 1))
    conn.commit()
    conn.close()

    return {
        "username": username,
        "email": email or username,
        "role": role,
        "full_name": full_name or username,
        "is_verified": 1
    }


def authenticate_user(username: str, password: str) -> Optional[dict]:
    from backend.database import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM users WHERE username = ? OR email = ?",
        (username, username)
    )
    row = cursor.fetchone()
    conn.close()
    
    if row and row["password"] == _hash_password(password):
        return dict(row)
    return None


# --- FastAPI dependencies ---
def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """Extract user from Authorization header. Returns None if not authenticated."""
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "").strip()
    return get_user_from_token(token)


def require_user(authorization: Optional[str] = Header(None)) -> dict:
    """Require authentication. Raises 401 if not logged in."""
    user = get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Login required")
    return user


def require_admin(authorization: Optional[str] = Header(None)) -> dict:
    """Require admin role. Raises 403 if not admin."""
    user = require_user(authorization)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
