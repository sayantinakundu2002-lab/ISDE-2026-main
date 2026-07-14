# backend/routes/checkout.py
"""Checkout, order placement, and order management endpoints."""

import random
import string
from typing import Optional

from fastapi import APIRouter, Form, HTTPException, Depends

from backend.managers import inventory_manager, cart_manager, order_manager
from backend.config import get_checkout_context
from backend.auth import require_user, get_current_user, get_account_storage_key

router = APIRouter()


def _same_account(user: dict, account_id: int) -> bool:
    return account_id is not None and user.get("account_id") == account_id


def _is_order_customer(order, user: dict) -> bool:
    if order.customer_account_id is not None:
        return _same_account(user, order.customer_account_id)
    return order.username == user["username"]


def _is_order_seller(order, user: dict) -> bool:
    if order.seller_account_id is not None:
        return _same_account(user, order.seller_account_id)
    return order.seller_username == user["username"]


@router.get("/cart/checkout-summary")
def checkout_summary(
    cart_id: str = "default",
    promo_code: Optional[str] = None,
    user: Optional[dict] = Depends(get_current_user)
):
    """Compute bill breakdown for the current cart without placing an order."""
    actual_cart_id = get_account_storage_key(user) if user else cart_id
    cart = cart_manager.get_cart(actual_cart_id)
    original_subtotal = 0.0
    product_discount = 0.0
    item_count = 0
    for pid, qty in cart.items():
        prod = inventory_manager.get_product(pid)
        if prod:
            original_subtotal += prod["price"] * qty
            discount_pct = prod.get("discount_percent", 0.0) or 0.0
            product_discount += (prod["price"] * (discount_pct / 100.0)) * qty
            item_count += qty
            
    remaining_subtotal = max(0.0, original_subtotal - product_discount)
    context = get_checkout_context(promo_code, remaining_subtotal)
    bill = context.calculate_bill(remaining_subtotal, item_count)
    return {
        "subtotal": round(original_subtotal, 2),
        "discount": round(product_discount + bill["discount"], 2),
        "shipping": bill["shipping"],
        "tax": bill["tax"],
        "total": bill["total"]
    }

@router.post("/checkout/place-order")
def place_order(
    cart_id: str = Form(...),
    promo_code: Optional[str] = Form(None),
    shipping_address: Optional[str] = Form(None),
    user: dict = Depends(require_user)
):
    """Place an order from the cart, splitting items by seller admin."""
    if not shipping_address or not shipping_address.strip() or shipping_address.strip() == "Not provided":
        raise HTTPException(status_code=400, detail="Shipping address is required")
    cleaned_shipping_address = shipping_address.strip()

    # Use the account-scoped cart id so shared user/admin usernames do not collide.
    actual_cart_id = get_account_storage_key(user)
    cart = cart_manager.get_cart(actual_cart_id)
    if not cart:
        # Fallback to provided cart_id
        cart = cart_manager.get_cart(cart_id)
    if not cart:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Group items by seller account.
    by_admin = {}
    for pid, qty in list(cart.items()):
        prod = inventory_manager.get_product(pid)
        if not prod:
            raise HTTPException(status_code=404, detail=f"Product {pid} not found")
        if prod["stock"] < qty:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {prod['name']}")
            
        admin_owner = prod.get("listed_by", "TestAdmin") or "TestAdmin"
        admin_owner_account_id = prod.get("listed_by_account_id")
        admin_key = admin_owner_account_id if admin_owner_account_id is not None else admin_owner
        if admin_key not in by_admin:
            by_admin[admin_key] = {
                "seller_username": admin_owner,
                "seller_account_id": admin_owner_account_id,
                "items": [],
            }
        by_admin[admin_key]["items"].append((prod, qty))

    placed_orders = []
    all_combined_items = []
    
    for seller_group in by_admin.values():
        admin_owner = seller_group["seller_username"]
        seller_account_id = seller_group["seller_account_id"]
        group = seller_group["items"]
        group_items = []
        group_subtotal = 0.0
        group_product_discount = 0.0
        group_item_count = 0
        
        for prod, qty in group:
            group_subtotal += prod["price"] * qty
            discount_pct = prod.get("discount_percent", 0.0) or 0.0
            group_product_discount += (prod["price"] * (discount_pct / 100.0)) * qty
            group_item_count += qty
            
            item_dict = {
                "product_id": prod["id"],
                "name": prod["name"],
                "quantity": qty,
                "unit_price": round(prod["price"], 2),
                "subtotal": round(prod["price"] * qty, 2),
                "image_url": prod.get("image_url", "")
            }
            group_items.append(item_dict)
            all_combined_items.append(item_dict)

        remaining_subtotal = max(0.0, group_subtotal - group_product_discount)
        context = get_checkout_context(promo_code, remaining_subtotal)
        bill = context.calculate_bill(remaining_subtotal, group_item_count)
        
        total_discount = group_product_discount + bill["discount"]
        
        # Create isolated order per seller
        order = order_manager.create_order(
            items=group_items,
            subtotal=round(group_subtotal, 2),
            discount=round(total_discount, 2),
            shipping=bill["shipping"],
            tax=bill["tax"],
            total=bill["total"],
            username=user["username"],
            shipping_address=cleaned_shipping_address,
            seller_username=admin_owner,
            customer_account_id=user.get("account_id"),
            seller_account_id=seller_account_id
        )
        payment_result = order_manager.transition_order(order.order_id, "PAID")
        if not payment_result["success"]:
            raise HTTPException(status_code=500, detail=payment_result["error"])
        placed_orders.append(payment_result["order"])

    # Reduce stocks for all items in the cart
    for pid, qty in list(cart.items()):
        inventory_manager.reduce_stock(pid, qty)

    # Clear cart
    cart_manager.clear_cart(actual_cart_id)

    # Generate consolidated return object
    combined_subtotal = sum(o["subtotal"] for o in placed_orders)
    combined_discount = sum(o["discount"] for o in placed_orders)
    combined_shipping = sum(o["shipping"] for o in placed_orders)
    combined_tax = sum(o["tax"] for o in placed_orders)
    combined_total = sum(o["total"] for o in placed_orders)
    combined_order_ids = ", ".join(o["order_id"] for o in placed_orders)

    return {
        "message": "Order placed successfully",
        "order_id": combined_order_ids,
        "order_ids": [o["order_id"] for o in placed_orders],
        "orders": placed_orders,
        "state": placed_orders[0]["state"],
        "items": all_combined_items,
        "breakdown": {
            "subtotal": round(combined_subtotal, 2),
            "discount": round(combined_discount, 2),
            "shipping": round(combined_shipping, 2),
            "tax": round(combined_tax, 2),
            "total": round(combined_total, 2),
        },
        "subtotal": round(combined_subtotal, 2),
        "discount": round(combined_discount, 2),
        "shipping": round(combined_shipping, 2),
        "tax": round(combined_tax, 2),
        "total": round(combined_total, 2),
        "date": placed_orders[0]["created_at"],
        "transactionId": combined_order_ids,
        "shipping_address": cleaned_shipping_address,
        "allowed_transitions": placed_orders[0]["allowed_transitions"],
    }


# --- Order Management Endpoints (Issue #3) ---

@router.get("/orders")
def list_orders(user: dict = Depends(require_user)):
    """List orders — admin sees only orders containing their products, users see only their own."""
    if user["role"] == "admin":
        orders_list = order_manager.get_admin_orders(user["username"], user.get("account_id"))
        for o in orders_list:
            o["allowed_transitions"] = [t for t in o["allowed_transitions"] if t != "CANCELLED"]
        return {"orders": orders_list}
    return {"orders": order_manager.get_user_orders(user["username"], user.get("account_id"))}


@router.get("/orders/my")
def list_my_orders(user: dict = Depends(require_user)):
    """List only the current user's orders."""
    return {"orders": order_manager.get_user_orders(user["username"], user.get("account_id"))}


@router.get("/orders/{order_id}")
def get_order(order_id: str, user: dict = Depends(require_user)):
    """Get a single order with full details and breakdown."""
    order = order_manager.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")
    
    # Non-admin users can only view their own orders
    # Admins can only view orders where they are the seller
    if user["role"] == "admin":
        if not _is_order_seller(order, user):
            raise HTTPException(status_code=403, detail="Access denied. You do not own any products in this order.")
    elif not _is_order_customer(order, user):
        raise HTTPException(status_code=403, detail="Access denied")
        
    order_dict = order.to_dict()
    if user["role"] == "admin":
        order_dict["allowed_transitions"] = [t for t in order_dict["allowed_transitions"] if t != "CANCELLED"]
    return order_dict


@router.post("/orders/{order_id}/transition")
def transition_order(order_id: str, target_state: str = Form(...), user: dict = Depends(require_user)):
    """Transition an order to a new state.
    Users can cancel their own orders. Admins cannot cancel orders.
    Admins can do other transitions.
    """
    order = order_manager.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    target_state_upper = target_state.strip().upper()
    if target_state_upper == "DELIVERED":
        raise HTTPException(status_code=400, detail="Use delivery verification endpoint to mark as DELIVERED")

    # Enforce ownership for admin using seller_username
    if user["role"] == "admin":
        if not _is_order_seller(order, user):
            raise HTTPException(status_code=403, detail="Access denied. You do not own any products in this order.")

    if target_state_upper == "CANCELLED":
        if user["role"] == "admin":
            raise HTTPException(status_code=403, detail="Admins cannot cancel orders")
        if not _is_order_customer(order, user):
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        if user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Only admins can perform this transition")

    result = order_manager.transition_order(order_id, target_state_upper)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return {
        "success": True,
        "message": f"Order {order_id} transitioned to {target_state_upper}",
        "order": result["order"]
    }


@router.post("/orders/{order_id}/request-delivery-otp")
def request_delivery_otp(order_id: str, user: dict = Depends(require_user)):
    order = order_manager.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    is_admin = user["role"] == "admin"
    is_order_customer = _is_order_customer(order, user)

    if is_admin and not _is_order_seller(order, user):
        raise HTTPException(status_code=403, detail="Access denied. You do not own any products in this order.")
    if not is_admin and not is_order_customer:
        raise HTTPException(status_code=403, detail="Access denied. You can only request OTP for your own order.")
    if "DELIVERED" not in order.get_allowed_transitions():
        raise HTTPException(status_code=400, detail="Delivery OTP can only be requested after the order is shipped.")

    # The OTP always goes to the actual order customer, so they can share it with the delivery person.
    import time
    from backend.database import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    if order.customer_account_id is not None:
        cursor.execute("SELECT email, full_name FROM users WHERE account_id = ?", (order.customer_account_id,))
    else:
        cursor.execute("""
        SELECT email, full_name FROM users
        WHERE username = ?
        ORDER BY CASE WHEN role = 'user' THEN 0 ELSE 1 END, account_id
        LIMIT 1
        """, (order.username,))
    customer_row = cursor.fetchone()
    if not customer_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Order customer account was not found.")

    customer_email = (customer_row["email"] or "").strip()
    if not customer_email or "@" not in customer_email:
        conn.close()
        raise HTTPException(
            status_code=400,
            detail="Order customer does not have a valid email address for delivery OTP.",
        )

    customer_name = (customer_row["full_name"] or order.username).strip()

    # Generate 6 digit random number
    otp_code = "".join(random.choices(string.digits, k=6))

    # Save to otps table using order_id as key
    cursor.execute("""
    INSERT INTO otps (email, otp_code, expires_at, purpose)
    VALUES (?, ?, ?, 'delivery')
    ON CONFLICT(email) DO UPDATE SET
        otp_code = excluded.otp_code,
        expires_at = excluded.expires_at,
        purpose = excluded.purpose
    """, (order_id, otp_code, time.time() + 600.0))
    conn.commit()

    # Print to terminal for local logs/debugging/testing
    print(f"\n=========================================")
    print(f"=== DELIVERY OTP FOR ORDER {order_id} ===")
    print(f"OTP Code: {otp_code}")
    print(f"=========================================\n")
    
    # Send email through Gmail via SMTP
    from backend.routes.auth import send_email
    subject = f"Delivery Confirmation OTP for Order {order_id}"
    body = (
        f"Hello {customer_name},\n\n"
        f"Your delivery verification OTP code is: {otp_code}\n\n"
        "Please share this code with the delivery agent to confirm receipt of your order.\n\n"
        "Best regards,\n"
        "Sayantina Kundu\n"
        "ISDE MiniShop"
    )

    try:
        send_email(subject, body, customer_email)
    except Exception:
        cursor.execute("DELETE FROM otps WHERE email = ? AND purpose = 'delivery'", (order_id,))
        conn.commit()
        conn.close()
        raise
    else:
        conn.close()

    return {"success": True, "message": "Delivery OTP emailed to the order customer successfully."}


@router.post("/orders/{order_id}/verify-delivery")
def verify_delivery_otp(
    order_id: str,
    otp_code: str = Form(None),
    user: dict = Depends(require_user)
):
    """Verify delivery OTP and transition order to DELIVERED."""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied. Admins only.")
        
    order = order_manager.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")
        
    # Enforce admin ownership using seller_username
    if not _is_order_seller(order, user):
        raise HTTPException(status_code=403, detail="Access denied. You do not own any products in this order.")
        
    # Verify OTP
    import time
    from backend.database import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM otps WHERE email = ? AND purpose = 'delivery'", (order_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=400, detail="No delivery OTP has been requested for this order.")
        
    otp_data = dict(row)
    if time.time() > otp_data["expires_at"]:
        cursor.execute("DELETE FROM otps WHERE email = ? AND purpose = 'delivery'", (order_id,))
        conn.commit()
        conn.close()
        raise HTTPException(status_code=400, detail="Delivery OTP has expired. Please request a new one.")
        
    if not otp_code or otp_data["otp_code"] != otp_code.strip():
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid delivery OTP code.")
        
    # Valid! Delete OTP record
    cursor.execute("DELETE FROM otps WHERE email = ? AND purpose = 'delivery'", (order_id,))
    conn.commit()
    conn.close()
    
    result = order_manager.transition_order(order_id, "DELIVERED")
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return {
        "success": True,
        "message": f"Order {order_id} successfully delivered!",
        "order": result["order"]
    }
