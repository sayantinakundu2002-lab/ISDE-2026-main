# backend/routes/auth.py
"""Authentication endpoints — login, register, and user info."""

from fastapi import APIRouter, Form, Depends, HTTPException
from backend.auth import (
    authenticate_user, register_user, create_token,
    require_user, get_current_user
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login(username: str = Form(...), password: str = Form(...)):
    """Login with username/email and password. Returns a bearer token."""
    user = authenticate_user(username, password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username/email or password")
    token = create_token(user["username"])
    return {
        "token": token,
        "user": {
            "username": user["username"],
            "email": user.get("email", user["username"]),
            "role": user["role"],
            "full_name": user["full_name"],
        }
    }


@router.post("/register")
def register(
    username: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(""),
    email: str = Form(""),
    role: str = Form("user")
):
    """Register a new user account. Role can be 'user' or 'admin'."""
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if len(password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
    try:
        user = register_user(username, password, full_name, email, role)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    token = create_token(username)
    return {
        "token": token,
        "user": {
            "username": user["username"],
            "email": user.get("email", user["username"]),
            "role": user["role"],
            "full_name": user["full_name"],
        }
    }


@router.post("/verify-otp")
def verify_otp(username: str = Form(...), otp_code: str = Form(...)):
    from backend.database import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM otps WHERE email = ? AND purpose = 'registration'", (username,))
    row = cursor.fetchone()
    
    if not row or row["otp_code"] != otp_code:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid OTP code")
        
    # Mark user as verified
    cursor.execute("UPDATE users SET is_verified = 1 WHERE username = ?", (username,))
    
    # Delete the used OTP
    cursor.execute("DELETE FROM otps WHERE email = ? AND purpose = 'registration'", (username,))
    
    # Retrieve user info to return a token
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    conn.commit()
    conn.close()
    
    user_dict = dict(user)
    token = create_token(username)
    return {
        "message": "Verification successful!",
        "token": token,
        "user": {
            "username": user_dict["username"],
            "email": user_dict.get("email", user_dict["username"]),
            "role": user_dict["role"],
            "full_name": user_dict["full_name"],
        }
    }


@router.get("/me")
def get_me(user: dict = Depends(require_user)):
    """Get the currently logged-in user's info."""
    return {
        "username": user["username"],
        "email": user.get("email", user["username"]),
        "role": user["role"],
        "full_name": user["full_name"],
    }
