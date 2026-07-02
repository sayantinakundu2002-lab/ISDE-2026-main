# backend/routes/checkout.py
"""Checkout, order placement, and order management endpoints."""

from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Form, HTTPException, Depends

from backend.managers import inventory_manager, cart_manager, order_manager
from backend.config import get_checkout_context
from backend.patterns.state import OrderState
from backend.auth import require_user, require_admin, get_current_user

router = APIRouter()


@router.get("/cart/checkout-summary")
def checkout_summary(
    cart_id: str = "default",
    promo_code: Optional[str] = None,
    user: Optional[dict] = Depends(get_current_user)
):
    """Compute bill breakdown for the current cart without placing an order."""
    actual_cart_id = user["username"] if user else cart_id
    cart = cart_manager.get_cart(actual_cart_id)
    subtotal = 0.0
    item_count = 0
    for pid, qty in cart.items():
        prod = inventory_manager.get_product(pid)
        if prod:
            subtotal += prod["price"] * qty
            item_count += qty

    context = get_checkout_context(promo_code, subtotal)
    bill = context.calculate_bill(subtotal, item_count)
    return bill


@router.post("/checkout/place-order")
def place_order(
    cart_id: str = Form(...),
    promo_code: Optional[str] = Form(None),
    user: dict = Depends(require_user)
):
    """Place an order from the cart. The order starts in CREATED state."""
    # Use user's username as cart_id for user-scoped carts
    actual_cart_id = user["username"]
    cart = cart_manager.get_cart(actual_cart_id)
    if not cart:
        # Fallback to provided cart_id
        cart = cart_manager.get_cart(cart_id)
    if not cart:
        raise HTTPException(status_code=400, detail="Cart is empty")

    items = []
    subtotal = 0.0
    item_count = 0
    for pid, qty in list(cart.items()):
        prod = inventory_manager.get_product(pid)
        if not prod:
            raise HTTPException(status_code=404, detail=f"Product {pid} not found")
        if prod["stock"] < qty:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {prod['name']}")

        item_total = prod["price"] * qty
        subtotal += item_total
        item_count += qty
        items.append({
            "product_id": pid,
            "name": prod["name"],
            "quantity": qty,
            "unit_price": prod["price"],
            "subtotal": item_total
        })

    # Compute bill using strategy config
    context = get_checkout_context(promo_code, subtotal)
    bill = context.calculate_bill(subtotal, item_count)

    # Create order in CREATED state linked to user
    order = order_manager.create_order(
        items=items,
        subtotal=bill["subtotal"],
        discount=bill["discount"],
        shipping=bill["shipping"],
        tax=bill["tax"],
        total=bill["total"],
        username=user["username"]
    )

    # Auto-transition to PAID since payment is completed at checkout
    order_manager.transition_order(order.order_id, "PAID")

    # Reduce stock (triggers observer alerts — Issue #4)
    for pid, qty in list(cart.items()):
        inventory_manager.reduce_stock(pid, qty)

    # Clear cart
    cart_manager.clear_cart(actual_cart_id)

    return {
        "message": "Order placed successfully",
        "order_id": order.order_id,
        "state": order.state.value,
        "items": order.items,
        "breakdown": {
            "subtotal": order.subtotal,
            "discount": order.discount,
            "shipping": order.shipping,
            "total": order.total,
        },
        "subtotal": order.subtotal,
        "discount": order.discount,
        "shipping": order.shipping,
        "tax": order.tax,
        "total": order.total,
        "date": order.created_at,
        "transactionId": order.order_id,
        "allowed_transitions": order.get_allowed_transitions(),
    }


# --- Order Management Endpoints (Issue #3) ---

@router.get("/orders")
def list_orders(user: dict = Depends(require_user)):
    """List orders — admin sees all, users see only their own."""
    if user["role"] == "admin":
        return {"orders": order_manager.get_all_orders()}
    return {"orders": order_manager.get_user_orders(user["username"])}


@router.get("/orders/my")
def list_my_orders(user: dict = Depends(require_user)):
    """List only the current user's orders."""
    return {"orders": order_manager.get_user_orders(user["username"])}


@router.get("/orders/{order_id}")
def get_order(order_id: str, user: Optional[dict] = Depends(get_current_user)):
    """Get a single order with full details and breakdown."""
    order = order_manager.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")
    # Non-admin users can only view their own orders
    if user and user["role"] != "admin" and order.username != user["username"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return order.to_dict()


@router.post("/orders/{order_id}/transition")
def transition_order(order_id: str, target_state: str = Form(...), user: dict = Depends(require_admin)):
    """Transition an order to a new state. Admin only.

    Enforces the state machine rules:
      CREATED → PAID → PACKED → SHIPPED → DELIVERED
      CANCELLED is allowed from CREATED, PAID, or PACKED.
    """
    result = order_manager.transition_order(order_id, target_state)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return {
        "success": True,
        "message": f"Order {order_id} transitioned to {target_state.upper()}",
        "order": result["order"]
    }


@router.post("/orders/{order_id}/verify-delivery")
def verify_delivery_otp(
    order_id: str,
    otp_code: str = Form(None),
    user: dict = Depends(require_user)
):
    """Verify delivery (now direct) and transition order to DELIVERED."""
    order = order_manager.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")
        
    if user["role"] != "admin" and order.username != user["username"]:
        raise HTTPException(status_code=403, detail="Access denied")
        
    result = order_manager.transition_order(order_id, "DELIVERED")
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return {
        "success": True,
        "message": f"Order {order_id} successfully delivered!",
        "order": result["order"]
    }
