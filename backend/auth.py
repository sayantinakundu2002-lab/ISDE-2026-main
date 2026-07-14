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
TOKENS = {}  # token -> {"account_id": account_id, "username": username, "role": role}


# --- Token management ---
def create_token(username: str, role: Optional[str] = None, account_id: Optional[int] = None) -> str:
    token = uuid.uuid4().hex
    import time
    from backend.database import get_db_connection
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        if account_id is not None and (not username or not role):
            cursor.execute("SELECT username, role FROM users WHERE account_id = ?", (account_id,))
            row = cursor.fetchone()
            if row:
                username = row["username"]
                role = row["role"]
        elif not role:
            cursor.execute("SELECT account_id, role FROM users WHERE username = ? ORDER BY account_id LIMIT 1", (username,))
            row = cursor.fetchone()
            if row:
                account_id = row["account_id"]
                role = row["role"]
        elif account_id is None:
            cursor.execute("SELECT account_id FROM users WHERE username = ? AND role = ? ORDER BY account_id LIMIT 1", (username, role))
            row = cursor.fetchone()
            account_id = row["account_id"] if row else None
        cursor.execute(
            "INSERT INTO tokens (token, account_id, username, role, created_at) VALUES (?, ?, ?, ?, ?)",
            (token, account_id, username, role, time.time())
        )
        conn.commit()
        conn.close()
    except Exception:
        pass
    TOKENS[token] = {"account_id": account_id, "username": username, "role": role}
    return token


def get_user_from_token(token: str) -> Optional[dict]:
    cached = TOKENS.get(token)
    account_id = None
    username = None
    role = None
    if isinstance(cached, dict):
        account_id = cached.get("account_id")
        username = cached.get("username")
        role = cached.get("role")
    elif isinstance(cached, str):
        username = cached

    if not account_id and not username:
        from backend.database import get_db_connection
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT account_id, username, role FROM tokens WHERE token = ?", (token,))
            row = cursor.fetchone()
            conn.close()
            if row:
                account_id = row["account_id"]
                username = row["username"]
                role = row["role"]
                TOKENS[token] = {"account_id": account_id, "username": username, "role": role}
        except Exception:
            pass
            
    if account_id or username:
        from backend.database import get_db_connection
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            if account_id:
                cursor.execute("SELECT * FROM users WHERE account_id = ?", (account_id,))
            elif role:
                cursor.execute("SELECT * FROM users WHERE username = ? AND role = ?", (username, role))
            else:
                cursor.execute("SELECT * FROM users WHERE username = ? ORDER BY account_id LIMIT 1", (username,))
            row = cursor.fetchone()
            conn.close()
            if row:
                return dict(row)
        except Exception:
            pass
    return None


def get_account_storage_key(user: dict) -> str:
    """Return a stable internal key for per-account runtime data."""
    account_id = user.get("account_id")
    if account_id is not None:
        return f"account:{account_id}"
    return f"{user.get('role', 'user')}:{user['username']}"


# --- Auth functions ---
def register_user(username: str, password: str, full_name: str = "", email: str = "", role: str = "user") -> dict:
    username = username.strip()
    email = email.strip()
    from backend.database import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    # Validate role
    allowed_roles = {"user", "admin"}
    if role not in allowed_roles:
        role = "user"
    if not email or "@" not in email:
        conn.close()
        raise ValueError("A valid email address is required")

    cursor.execute("SELECT 1 FROM users WHERE role = ? AND email = ?", (role, email))
    if cursor.fetchone():
        conn.close()
        raise ValueError(f"{role.title()} email already exists")
    
    cursor.execute("""
    INSERT INTO users (username, email, password, role, full_name, is_verified)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (username, email or username, _hash_password(password), role, full_name or username, 1))
    account_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "account_id": account_id,
        "username": username,
        "email": email or username,
        "role": role,
        "full_name": full_name or username,
        "is_verified": 1
    }


def authenticate_user(username: str, password: str) -> Optional[dict]:
    username = username.strip()
    from backend.database import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    if "@" in username:
        cursor.execute("SELECT * FROM users WHERE email = ? ORDER BY account_id", (username,))
    else:
        cursor.execute("SELECT * FROM users WHERE username = ? OR email = ? ORDER BY account_id", (username, username))
    rows = cursor.fetchall()
    conn.close()

    hashed_password = _hash_password(password)
    for row in rows:
        if row["password"] == hashed_password:
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
