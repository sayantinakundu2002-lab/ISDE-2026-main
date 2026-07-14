# backend/routes/auth.py
"""Authentication endpoints — login, register, and user info."""

import os
import random
import string
import smtplib
from email.message import EmailMessage
from typing import Optional
from fastapi import APIRouter, Form, Depends, HTTPException

from backend.auth import (
    authenticate_user, register_user, create_token,
    require_user, get_current_user
)

router = APIRouter(prefix="/auth", tags=["auth"])

def send_email(subject: str, body: str, to_email: str):
    to_email = (to_email or "").strip()
    if not to_email or "@" not in to_email:
        raise HTTPException(status_code=400, detail="A valid recipient email address is required.")

    # Log the email details clearly to stdout/console
    print(f"=== SENDING EMAIL TO: {to_email} ===")
    print(f"Subject: {subject}")
    print(f"Body:\n{body}")
    print("=====================================")

    if os.environ.get("TESTING") == "1" and os.environ.get("SEND_EMAILS_IN_TESTS") != "1":
        print("TESTING=1; skipping real SMTP send.")
        return False
    
    smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com").strip()
    try:
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    except ValueError:
        raise HTTPException(status_code=500, detail="SMTP_PORT must be a number.")
    smtp_username = os.environ.get("SMTP_USERNAME", "").strip()
    smtp_password = os.environ.get("SMTP_PASSWORD", "").strip().replace(" ", "")
    from_email = os.environ.get("SMTP_FROM_EMAIL", smtp_username).strip() or smtp_username
    
    if not smtp_username or not smtp_password:
        raise HTTPException(
            status_code=500,
            detail="SMTP credentials are not configured. Set SMTP_USERNAME and SMTP_PASSWORD.",
        )
        
    try:
        msg = EmailMessage()
        msg["From"] = from_email
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.set_content(body)

        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=30) as server:
                server.login(smtp_username, smtp_password)
                refused = server.send_message(msg)
        else:
            with smtplib.SMTP(smtp_server, smtp_port, timeout=30) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(smtp_username, smtp_password)
                refused = server.send_message(msg)

        if refused:
            refused_recipients = ", ".join(refused.keys())
            raise HTTPException(
                status_code=502,
                detail=f"SMTP server refused recipient(s): {refused_recipients}",
            )

        print(f"Email accepted by SMTP server for {to_email}.")
        return True
    except HTTPException:
        raise
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(
            status_code=502,
            detail="SMTP authentication failed. Check the Gmail account and app password.",
        )
    except (smtplib.SMTPException, OSError, TimeoutError) as e:
        raise HTTPException(status_code=502, detail=f"SMTP delivery failed: {e}")



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
        "full_name": user.get("full_name", user["username"]),
        "phone_number": user.get("phone_number", "") or "",
        "profile_photo": user.get("profile_photo", "") or "",
        "address": user.get("address", "") or "",
    }


@router.post("/settings")
def update_settings(
    full_name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    phone_number: Optional[str] = Form(None),
    profile_photo: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    user: dict = Depends(require_user)
):
    from backend.database import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Update fields that are provided
    cursor.execute("""
    UPDATE users
    SET full_name = COALESCE(?, full_name),
        email = COALESCE(?, email),
        phone_number = COALESCE(?, phone_number),
        profile_photo = COALESCE(?, profile_photo),
        address = COALESCE(?, address)
    WHERE username = ?
    """, (full_name, email, phone_number, profile_photo, address, user["username"]))
    conn.commit()
    
    # Fetch updated user
    cursor.execute("SELECT * FROM users WHERE username = ?", (user["username"],))
    updated_row = cursor.fetchone()
    conn.close()
    
    if not updated_row:
        raise HTTPException(status_code=404, detail="User not found")
        
    updated_user = dict(updated_row)
    return {
        "success": True,
        "message": "Settings updated successfully",
        "user": {
            "username": updated_user["username"],
            "email": updated_user["email"],
            "role": updated_user["role"],
            "full_name": updated_user["full_name"],
            "phone_number": updated_user.get("phone_number", "") or "",
            "profile_photo": updated_user.get("profile_photo", "") or "",
            "address": updated_user.get("address", "") or "",
        }
    }


@router.post("/admin-register/request")
def request_admin_register(
    username: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(...),
    email: str = Form(...),
    product_name: str = Form(...),
    product_description: str = Form(...),
    product_price: float = Form(...),
    product_stock: int = Form(...),
    product_category: str = Form(...),
    image_url: Optional[str] = Form(None)
):
    from backend.database import get_db_connection, _hash_password
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if username exists in users
    cursor.execute("SELECT 1 FROM users WHERE username = ?", (username,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Username already exists")
        
    # Check if pending request exists
    cursor.execute("SELECT 1 FROM admin_registration_requests WHERE username = ?", (username,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="A registration request for this username is already pending")
        
    # Generate random confirmation code (6 character uppercase alphanumeric)
    code_chars = string.ascii_uppercase + string.digits
    confirmation_code = "REG-" + "".join(random.choice(code_chars) for _ in range(6))
    
    # Store request
    cursor.execute("""
    INSERT INTO admin_registration_requests (
        username, email, password, full_name,
        product_name, product_description, product_price, product_stock, product_category,
        image_url, confirmation_code, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
    """, (
        username, email, _hash_password(password), full_name,
        product_name, product_description, product_price, product_stock, product_category,
        image_url or "https://placehold.co/400x300/f8fafc/94a3b8?text=Admin+Product", confirmation_code
    ))
    conn.commit()
    conn.close()
    
    # Send email
    subject = f"New Admin Registration Request: {username}"
    body = f"""Hello Sayantina Kundu (Owner),

A new user wants to register as an Admin. Below are their details:

Applicant Details:
------------------
Username: {username}
Email: {email}
Full Name: {full_name}

Proposed Product Details to Add:
--------------------------------
Product Name: {product_name}
Description: {product_description}
Price: ${product_price:.2f}
Stock: {product_stock}
Category: {product_category}

Confirmation Code: {confirmation_code}

If you approve this application, please send the confirmation code ({confirmation_code}) to the applicant ({email}) so they can complete their registration.

Best regards,
ISDE MiniShop System
"""
    
    # Send to website owner ONLY
    send_email(subject, body, "sayantinakundu2002@gmail.com")
    
    return {
        "success": True,
        "message": "Admin registration request submitted. Confirmation code sent to website owner.",
        "username": username
    }


@router.post("/admin-register/confirm")
def confirm_admin_register(
    username: str = Form(...),
    confirmation_code: str = Form(...)
):
    from backend.database import get_db_connection
    from backend.managers import inventory_manager
    from backend.auth import create_token
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM admin_registration_requests WHERE username = ? AND status = 'PENDING'", (username,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=400, detail="No pending registration request found for this username")
        
    req = dict(row)
    if req["confirmation_code"] != confirmation_code.strip():
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid confirmation code")
        
    # Mark as approved (delete from requests)
    cursor.execute("DELETE FROM admin_registration_requests WHERE username = ?", (username,))
    
    # Create the user as admin
    try:
        cursor.execute("""
        INSERT INTO users (username, email, password, role, full_name, is_verified)
        VALUES (?, ?, ?, ?, ?, 1)
        """, (req["username"], req["email"], req["password"], "admin", req["full_name"]))
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Failed to create admin user: {str(e)}")
        
    conn.close()
    
    # Auto-add the proposed product
    try:
        inventory_manager.add_product(
            name=req["product_name"],
            description=req["product_description"],
            price=req["product_price"],
            stock=req["product_stock"],
            category=req["product_category"],
            image_url=req["image_url"],
            listed_by=req["username"]
        )
    except Exception as e:
        import logging
        logging.error(f"Failed to auto-add product on admin registration: {e}")
        
    # Log user in
    token = create_token(username)
    return {
        "success": True,
        "message": "Admin registration confirmed and account created!",
        "token": token,
        "user": {
            "username": req["username"],
            "email": req["email"],
            "role": "admin",
            "full_name": req["full_name"]
        }
    }

